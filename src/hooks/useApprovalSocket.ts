"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { BACKEND_URL, WS_URL } from "@/lib/config";
import type { ThreatApproval } from "@/types/target";

/**
 * target-tracking-service의 /topic/approvals STOMP 브로커를 구독한다.
 * 초기 목록은 REST(/api/v1/threat-approvals)로 채우고, 이후 생성/결정 이벤트는
 * useTargetSocket과 동일한 WebSocket 패턴으로 실시간 반영한다.
 */
export function useApprovalSocket() {
  const [approvals, setApprovals] = useState<Record<number, ThreatApproval>>({});
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${BACKEND_URL}/api/v1/threat-approvals?status=PENDING`)
      .then((res) => res.json())
      .then((list: ThreatApproval[]) => {
        if (cancelled) return;
        setApprovals(Object.fromEntries(list.map((a) => [a.id, a])));
      })
      .catch(() => {});

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe("/topic/approvals", (message) => {
          const approval: ThreatApproval = JSON.parse(message.body);
          setApprovals((prev) => ({ ...prev, [approval.id]: approval }));
        });
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      cancelled = true;
      client.deactivate();
    };
  }, []);

  async function decide(id: number, decision: "APPROVED" | "REJECTED", decidedBy: string, reason: string) {
    await fetch(`${BACKEND_URL}/api/v1/threat-approvals/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, decidedBy, reason }),
    });
    // 서버가 결정 직후 /topic/approvals로 갱신된 상태를 다시 브로드캐스트하므로
    // 여기서 낙관적 갱신은 하지 않는다 -- 응답 지연이 있어도 최종 상태는 소켓이 맞춰준다.
  }

  const pending = Object.values(approvals)
    .filter((a) => a.status === "PENDING")
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  return { pending, decide };
}
