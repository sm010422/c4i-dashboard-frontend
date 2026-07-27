"use client";

import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { WS_URL } from "@/lib/config";
import type { TargetEvent } from "@/types/target";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * target-tracking-service의 /topic/targets STOMP 브로커를 구독한다.
 * 원래 static/index.html의 SockJS + Stomp.over 로직을 그대로 옮긴 것 --
 * 백엔드 쪽 프로토콜은 전혀 안 바뀌었고, 클라이언트만 React 훅으로 재작성했다.
 */
export function useTargetSocket() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [targets, setTargets] = useState<Record<string, TargetEvent>>({});
  const [history, setHistory] = useState<Record<string, [number, number][]>>({});
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      reconnectDelay: 5000,
      onConnect: () => {
        setStatus("connected");
        client.subscribe("/topic/targets", (message) => {
          const event: TargetEvent = JSON.parse(message.body);
          setTargets((prev) => ({ ...prev, [event.targetId]: event }));
          setHistory((prev) => {
            const coords = prev[event.targetId] ?? [];
            const next = [...coords, [event.latitude, event.longitude] as [number, number]];
            if (next.length > 20) next.shift(); // 최근 20개만 유지
            return { ...prev, [event.targetId]: next };
          });
        });
      },
      onDisconnect: () => setStatus("disconnected"),
      onWebSocketClose: () => setStatus("disconnected"),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  return { status, targets, history };
}
