"use client";

import { useState } from "react";
import { useApprovalSocket } from "@/hooks/useApprovalSocket";

interface ApprovalPanelProps {
  open: boolean;
  onClose: () => void;
}

const LEVEL_COLOR: Record<string, string> = {
  CRITICAL: "text-[#ff3333] border-[#ff3333]",
  HIGH: "text-[#ff9900] border-[#ff9900]",
};

export default function ApprovalPanel({ open, onClose }: ApprovalPanelProps) {
  const { pending, decide } = useApprovalSocket();
  const [decidedBy, setDecidedBy] = useState("operator1");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [deciding, setDeciding] = useState<number | null>(null);

  if (!open) return null;

  // 승인은 MSS(Maven Smart System)의 "AI가 추천한 3~4개 옵션 중 하나 클릭"과
  // 동일하게, 추천 자산 중 하나를 반드시 선택해야 활성화된다. 반려는 선택 없이도 가능.
  async function handleDecide(id: number, decision: "APPROVED" | "REJECTED") {
    setDeciding(id);
    try {
      await decide(id, decision, decidedBy || "operator", reasons[id] ?? "", selectedOptions[id]);
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div className="fixed left-0 top-[45px] bottom-0 w-[360px] bg-term-panel border-r border-term z-[900] flex flex-col">
      <div className="px-2.5 py-2 border-b border-term text-sm flex justify-between items-center">
        <span>🛡️ 승인 대기 ({pending.length})</span>
        <button onClick={onClose} className="text-term-fg">
          ✕
        </button>
      </div>

      <div className="px-2.5 py-2 border-b border-term-faint text-[11px] flex items-center gap-1.5">
        결정자
        <input
          value={decidedBy}
          onChange={(e) => setDecidedBy(e.target.value)}
          className="flex-1 bg-black border border-term px-1.5 py-0.5 text-term-fg"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 text-xs">
        {pending.length === 0 && (
          <div className="text-term-dim text-[11px]">
            HIGH/CRITICAL 위협 분석 결과가 나오면 여기에 승인 대기 항목이 뜹니다.
          </div>
        )}

        {pending.map((a) => {
          const options = a.recommendedOptions ?? [];
          const selected = selectedOptions[a.id];
          const hasOptions = options.length > 0;

          return (
            <div key={a.id} className="mb-3 border border-term-faint p-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold">{a.targetId}</span>
                <span className={`border px-1.5 py-0.5 text-[10px] ${LEVEL_COLOR[a.threatLevel] ?? "text-term-fg border-term"}`}>
                  {a.threatLevel}
                </span>
              </div>
              <div className="text-[10px] text-term-dim mb-1">
                {a.targetType} · {new Date(a.requestedAt).toLocaleTimeString()}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-[11px] mb-1.5 max-h-24 overflow-y-auto">
                {a.sitrep}
              </div>

              <div className="text-[10px] text-term-dim mb-1">
                {hasOptions ? "추천 요격 자산 (하나 선택 후 승인)" : "⚠️ 추천 가능한 자산 없음 — 반려만 가능"}
              </div>
              <div className="mb-1.5 flex flex-col gap-1">
                {options.map((opt) => (
                  <label
                    key={opt.assetName}
                    className={`flex items-center gap-1.5 border px-1.5 py-1 text-[10px] cursor-pointer ${
                      selected === opt.assetName ? "border-[#33cc33] bg-[#33cc3322]" : "border-term-faint"
                    } ${!opt.feasible ? "opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`option-${a.id}`}
                      checked={selected === opt.assetName}
                      onChange={() => setSelectedOptions((prev) => ({ ...prev, [a.id]: opt.assetName }))}
                    />
                    <span className="flex-1">{opt.assetName}</span>
                    <span>ETA {opt.etaMinutes.toFixed(1)}분</span>
                    <span>{opt.distanceKm.toFixed(0)}km</span>
                    <span>탄약 {opt.ammoCount}</span>
                    {!opt.feasible && <span className="text-[#ff9900]">예산초과</span>}
                  </label>
                ))}
              </div>

              <input
                value={reasons[a.id] ?? ""}
                onChange={(e) => setReasons((prev) => ({ ...prev, [a.id]: e.target.value }))}
                placeholder="결정 사유 (선택)"
                className="w-full bg-black border border-term-faint px-1.5 py-1 text-[11px] text-term-fg mb-1.5"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleDecide(a.id, "APPROVED")}
                  disabled={deciding === a.id || !selected}
                  className="flex-1 border border-[#33cc33] text-[#33cc33] px-2 py-1 text-[11px] disabled:opacity-50 hover:bg-[#33cc33] hover:text-black"
                >
                  ✅ 승인{selected ? ` (${selected})` : ""}
                </button>
                <button
                  onClick={() => handleDecide(a.id, "REJECTED")}
                  disabled={deciding === a.id}
                  className="flex-1 border border-[#ff3333] text-[#ff3333] px-2 py-1 text-[11px] disabled:opacity-50 hover:bg-[#ff3333] hover:text-black"
                >
                  ❌ 반려
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
