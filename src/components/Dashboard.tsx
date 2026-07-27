"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useTargetSocket } from "@/hooks/useTargetSocket";
import TargetSidebar from "@/components/TargetSidebar";
import AnalysisModal from "@/components/AnalysisModal";
import ChatPanel from "@/components/ChatPanel";
import { BACKEND_URL } from "@/lib/config";
import { REGIONS, type TargetEvent } from "@/types/target";

// Leaflet은 window에 의존해서 SSR 불가 -- 클라이언트에서만 동적 로드.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const STATUS_LABEL: Record<string, string> = {
  connecting: "🟡 연결 중...",
  connected: "🟢 연결됨 | SYSTEM ONLINE",
  disconnected: "🔴 연결 끊김",
};

function inBounds(t: TargetEvent, bounds: [number, number, number, number]) {
  const [south, west, north, east] = bounds;
  return t.latitude >= south && t.latitude <= north && t.longitude >= west && t.longitude <= east;
}

export default function Dashboard() {
  const { status, targets, history } = useTargetSocket();
  const [regionCode, setRegionCode] = useState<(typeof REGIONS)[number]["code"]>("KOREA");
  const [militaryOnly, setMilitaryOnly] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [threatLevels, setThreatLevels] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const region = REGIONS.find((r) => r.code === regionCode)!;

  // 한국/우크라이나/이란 세 지역 데이터가 전부 같은 WebSocket 스트림으로 섞여서
  // 들어오므로, 선택된 탭의 지리적 경계 안에 있는 표적만 걸러서 지도/사이드바에 보여준다.
  // "군용기만" 토글이 켜져 있으면 status=MILITARY(AdsbFiPollingService가 adsb.fi의
  // /v2/mil 목록과 hex를 대조해서 붙인 값)인 것만 한 번 더 걸러낸다.
  const regionTargets = useMemo(() => {
    const filtered: Record<string, TargetEvent> = {};
    for (const [id, t] of Object.entries(targets)) {
      if (!inBounds(t, region.bounds)) continue;
      if (militaryOnly && t.status !== "MILITARY") continue;
      filtered[id] = t;
    }
    return filtered;
  }, [targets, region, militaryOnly]);

  // 토글과 무관하게 "지금 이 지역에 군용기가 몇 대 잡혀있나"는 항상 계산해서 배지로 보여준다.
  const militaryCountInRegion = useMemo(
    () => Object.values(targets).filter((t) => inBounds(t, region.bounds) && t.status === "MILITARY").length,
    [targets, region]
  );

  const regionHistory = useMemo(() => {
    const filtered: Record<string, [number, number][]> = {};
    for (const id of Object.keys(regionTargets)) {
      if (history[id]) filtered[id] = history[id];
    }
    return filtered;
  }, [history, regionTargets]);

  function addLog(msg: string) {
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  }

  async function runSimulation() {
    setRunning(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/simulator/run?rounds=${rounds}`, { method: "POST" });
      addLog(await res.text());
    } catch (e) {
      addLog(`시뮬레이션 실행 실패: ${e}`);
    } finally {
      setRunning(false);
    }
  }

  const selectedTarget = selectedTargetId ? targets[selectedTargetId] ?? null : null;

  return (
    <div className="h-screen flex flex-col bg-black text-term-fg font-mono">
      <div className="px-5 py-2.5 bg-term-panel border-b border-term flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-lg">📡 C4I 실시간 전술 지휘통제 대시보드</h1>
        <div className="flex items-center gap-1">
          {REGIONS.map((r) => (
            <button
              key={r.code}
              onClick={() => setRegionCode(r.code)}
              className={`border px-2.5 py-1 text-xs ${
                r.code === regionCode
                  ? "bg-term-fg text-black border-term-fg"
                  : "border-term-faint text-term-dim hover:border-term hover:text-term-fg"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => setMilitaryOnly((v) => !v)}
            className={`border px-2.5 py-1 text-xs ml-1 ${
              militaryOnly
                ? "bg-[#ff3333] text-black border-[#ff3333]"
                : "border-term-faint text-term-dim hover:border-term hover:text-term-fg"
            }`}
          >
            🎖️ 군용기만 {militaryCountInRegion > 0 && `(${militaryCountInRegion})`}
          </button>
        </div>
        <div className="flex items-center gap-2.5 text-[13px]">
          <span>{STATUS_LABEL[status]}</span>
          <label className="flex items-center gap-1">
            회수
            <input
              type="number"
              min={1}
              max={50}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-10 bg-black border border-term px-1 text-term-fg"
            />
          </label>
          <button
            onClick={runSimulation}
            disabled={running}
            className="border border-term px-2.5 py-1 disabled:opacity-50 hover:bg-term-fg hover:text-black"
          >
            ▶ 시뮬레이션 실행
          </button>
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="border border-term px-2.5 py-1 hover:bg-term-fg hover:text-black"
          >
            🤖 AI 챗봇
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1">
          <MapView
            targets={regionTargets}
            history={regionHistory}
            threatLevels={threatLevels}
            onSelectTarget={setSelectedTargetId}
            region={region}
          />
        </div>
        <TargetSidebar
          targets={regionTargets}
          threatLevels={threatLevels}
          onAnalyze={setSelectedTargetId}
          log={log}
        />
      </div>

      <AnalysisModal
        target={selectedTarget}
        onClose={() => setSelectedTargetId(null)}
        onResult={(targetId, threatLevel) =>
          setThreatLevels((prev) => ({ ...prev, [targetId]: threatLevel }))
        }
      />
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
