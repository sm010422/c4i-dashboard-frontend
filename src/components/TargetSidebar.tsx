"use client";

import type { Region, TargetEvent } from "@/types/target";

interface TargetSidebarProps {
  targets: Record<string, TargetEvent>;
  rawCount: number;
  region: Region;
  militaryOnly: boolean;
  threatLevels: Record<string, string>;
  onAnalyze: (targetId: string) => void;
  log: string[];
}

export default function TargetSidebar({
  targets,
  rawCount,
  region,
  militaryOnly,
  threatLevels,
  onAnalyze,
  log,
}: TargetSidebarProps) {
  const list = Object.values(targets).sort((a, b) => a.targetId.localeCompare(b.targetId));

  // 목록이 비었을 때 "지역 자체에 원래 데이터가 없는 것"(ADS-B 구조적 한계)과
  // "군용기 필터를 걸어서 0인 것"(정상적인 필터 결과)을 구분해서 안내한다 --
  // 안 그러면 둘 다 그냥 빈 화면이라 버그처럼 보인다.
  const showCoverageNote = list.length === 0 && rawCount === 0 && region.coverageNote;
  const showMilitaryFilterNote = list.length === 0 && rawCount > 0 && militaryOnly;

  return (
    <div className="w-[300px] shrink-0 border-l border-term overflow-y-auto p-2.5 bg-term-panel">
      <h2 className="text-sm border-b border-term pb-1 mb-2.5">🎯 탐지 표적 현황 ({list.length})</h2>
      {showCoverageNote && (
        <div className="mb-2.5 border border-term-yellow p-2 text-[11px] leading-relaxed text-term-yellow">
          ⚠️ 관측 공백 — 버그 아님
          <br />
          {region.coverageNote}
        </div>
      )}
      {showMilitaryFilterNote && (
        <div className="mb-2.5 border border-term-faint p-2 text-[11px] leading-relaxed text-term-dim">
          이 지역에서 군용으로 식별된 표적이 없습니다. (민항기 {rawCount}대는 필터로 숨김)
        </div>
      )}
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
