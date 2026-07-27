"use client";

import type { TargetEvent } from "@/types/target";

interface TargetSidebarProps {
  targets: Record<string, TargetEvent>;
  threatLevels: Record<string, string>;
  onAnalyze: (targetId: string) => void;
  log: string[];
}

export default function TargetSidebar({ targets, threatLevels, onAnalyze, log }: TargetSidebarProps) {
  const list = Object.values(targets).sort((a, b) => a.targetId.localeCompare(b.targetId));

  return (
    <div className="w-[300px] shrink-0 border-l border-term overflow-y-auto p-2.5 bg-term-panel">
      <h2 className="text-sm border-b border-term pb-1 mb-2.5">🎯 탐지 표적 현황 ({list.length})</h2>
      <div className="flex flex-col gap-2">
        {list.map((t) => (
          <div key={t.targetId} className="border border-term p-2 text-xs leading-relaxed">
            <div className="text-sm font-bold text-term-yellow">
              🎯 {t.targetId}
              {threatLevels[t.targetId] && (
                <span className="ml-2 text-[10px] opacity-80">[{threatLevels[t.targetId]}]</span>
              )}
            </div>
            <div>타입: {t.targetType}</div>
            <div>위도: {t.latitude.toFixed(5)}</div>
            <div>경도: {t.longitude.toFixed(5)}</div>
            <div>고도: {t.altitude.toFixed(1)}m</div>
            <div>속도: {t.speed.toFixed(1)}km/h</div>
            <div>
              상태: <span className="text-term-yellow">{t.status}</span>
            </div>
            <button
              onClick={() => onAnalyze(t.targetId)}
              className="mt-1 w-full border border-term py-1 text-[11px] hover:bg-term-fg hover:text-black transition-colors"
            >
              🔍 AI 위협분석
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2.5 text-[11px] text-term-dim h-[150px] overflow-y-auto border-t border-term pt-1">
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <div className="mt-2.5 text-[10px] text-term-dim border-t border-term-faint pt-1.5">
        실시간 항공기 데이터 제공:{" "}
        <a href="https://adsb.fi" target="_blank" rel="noreferrer" className="text-term-dim underline">
          adsb.fi
        </a>{" "}
        (개인/비상업 목적, ODbL 아님)
      </div>
    </div>
  );
}
