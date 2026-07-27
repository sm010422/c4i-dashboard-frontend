"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTargetSocket } from "@/hooks/useTargetSocket";
import TargetSidebar from "@/components/TargetSidebar";
import AnalysisModal from "@/components/AnalysisModal";
import ChatPanel from "@/components/ChatPanel";
import { BACKEND_URL } from "@/lib/config";

// Leaflet은 window에 의존해서 SSR 불가 -- 클라이언트에서만 동적 로드.
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const STATUS_LABEL: Record<string, string> = {
  connecting: "🟡 연결 중...",
  connected: "🟢 연결됨 | SYSTEM ONLINE",
  disconnected: "🔴 연결 끊김",
};

export default function Dashboard() {
  const { status, targets, history } = useTargetSocket();
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [threatLevels, setThreatLevels] = useState<Record<string, string>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [rounds, setRounds] = useState(1);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

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
      <div className="px-5 py-2.5 bg-term-panel border-b border-term flex justify-between items-center">
        <h1 className="text-lg">📡 C4I 실시간 전술 지휘통제 대시보드</h1>
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
            targets={targets}
            history={history}
            threatLevels={threatLevels}
            onSelectTarget={setSelectedTargetId}
          />
        </div>
        <TargetSidebar
          targets={targets}
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
