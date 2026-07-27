"use client";

import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/lib/config";
import type { TargetEvent, ThreatAnalysisResponse } from "@/types/target";

const THREAT_CLASS: Record<string, string> = {
  CRITICAL: "text-[#ff3333] border-[#ff3333]",
  HIGH: "text-[#ff9900] border-[#ff9900]",
  MEDIUM: "text-[#ffff00] border-[#ffff00]",
  LOW: "text-term-fg border-term-fg",
};

interface AnalysisModalProps {
  target: TargetEvent | null;
  onClose: () => void;
  onResult: (targetId: string, threatLevel: string) => void;
}

export default function AnalysisModal({ target, onClose, onResult }: AnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    /* eslint-disable react-hooks/set-state-in-effect -- 새 표적 선택 시 이전 분석
       결과/에러를 지우고 로딩 상태로 전환하는 표준 데이터 페칭 패턴. */
    setLoading(true);
    setResult(null);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    fetch(`${BACKEND_URL}/api/v1/threat-analysis/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(target),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ThreatAnalysisResponse) => {
        setResult(data);
        onResult(data.targetId, data.threatLevel);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target 변경 시에만 재요청
  }, [target]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-[480px] max-h-[80vh] overflow-y-auto bg-term-panel border border-term p-4 text-xs">
        <div className="flex justify-between border-b border-term pb-2 mb-2.5 text-sm">
          <span>🛡️ AI 위협 분석 (RAG + pgvector)</span>
          <button onClick={onClose} className="text-term-fg">
            ✕
          </button>
        </div>

        {loading && <div>분석 중...</div>}
        {error && <div>분석 요청 실패: {error}</div>}
        {result && (
          <>
            <div
              className={`inline-block px-2.5 py-1 mb-2.5 font-bold border ${
                THREAT_CLASS[result.threatLevel] ?? THREAT_CLASS.LOW
              }`}
            >
              {result.threatLevel}
            </div>
            {!result.aiEnabled && (
              <div>AI 비활성화 상태 — GEMINI_API_KEY 미설정, 규칙 기반 등급만 표시됩니다.</div>
            )}
            {result.aiEnabled && (
              <>
                <div className="whitespace-pre-wrap border border-term-dim p-2 mb-2.5 text-term-fg">
                  {result.sitrep}
                </div>
                <h3 className="text-xs mb-1.5">유사 위협 패턴 (pgvector)</h3>
                <ul className="list-none pl-0">
                  {result.similarPatterns.length === 0 && <li>일치하는 패턴 없음</li>}
                  {result.similarPatterns.map((p, i) => (
                    <li key={i} className="py-1 border-b border-dashed border-term-faint text-term-dim">
                      {p}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
