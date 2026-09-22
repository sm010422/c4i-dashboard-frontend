"use client";

interface ArchitecturePanelProps {
  open: boolean;
  onClose: () => void;
}

const STACK_GROUPS: { label: string; items: string[] }[] = [
  { label: "탐지/추적", items: ["Spring Boot", "Kafka", "pgvector (HNSW)"] },
  { label: "AI 파이프라인", items: ["LangGraph", "Qdrant ×2", "Gemini function-calling", "SSE"] },
  { label: "프론트엔드", items: ["Next.js 16", "React 19", "WebSocket/STOMP"] },
  { label: "인프라", items: ["k3s (3 노드)", "ArgoCD GitOps", "Tailscale Funnel"] },
];

const RAGAS_ROWS: { question: string; faithfulness: number; relevancy: number }[] = [
  { question: "저고도 자폭 드론이 접근할 때 대응 절차가 어떻게 되나?", faithfulness: 1.0, relevancy: 0.87 },
  { question: "군집(스웜) 형태로 드론이 접근하면 왜 위험한가?", faithfulness: 0.75, relevancy: 0.86 },
  { question: "과거에 DRONE-001 표적이 탐지된 이력이 있었나?", faithfulness: 0.8, relevancy: 0.91 },
];

const DESIGN_POINTS = [
  {
    title: "비동기 AI 분석",
    body: "Kafka consumer 스레드가 LLM 호출을 기다리며 블로킹되지 않도록 전용 executor(aiAnalysisExecutor)에서 분리 실행.",
  },
  {
    title: "Graceful degradation",
    body: "LLM 호출 실패(쿼터/네트워크) 시에도 규칙 기반 위협 등급은 항상 즉시 계산 — AI 장애가 대시보드 전체를 멈추지 않음.",
  },
  {
    title: "Human-in-the-loop",
    body: "AI가 HIGH/CRITICAL로 판정하면 자동 종료가 아니라 승인 대기열로 전환 — 담당자 승인/반려 로그가 다시 평가 데이터로 축적.",
  },
  {
    title: "GitOps 배포",
    body: "클러스터 상태 변경은 kubectl 직접 명령이 아니라 k3s-msa-infrastructure 레포 커밋으로만 반영 — ArgoCD가 동기화.",
  },
];

function Box({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-term px-2 py-1.5 text-center leading-tight whitespace-pre-line ${className}`}>
      {children}
    </div>
  );
}

function Arrow({ label, vertical = false }: { label?: string; vertical?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-term-dim text-[10px] ${vertical ? "flex-col py-0.5" : "px-1"}`}>
      {label && <span className="whitespace-nowrap">{label}</span>}
      <span>{vertical ? "↓" : "→"}</span>
    </div>
  );
}

export default function ArchitecturePanel({ open, onClose }: ArchitecturePanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-term-panel border border-term p-4 text-xs">
        <div className="flex justify-between items-center border-b border-term pb-2 mb-3 text-sm">
          <span>🏗️ 시스템 구성 — C4I 방어체계 MSA</span>
          <button onClick={onClose} className="text-term-fg">
            ✕
          </button>
        </div>

        <section className="mb-4">
          <h3 className="text-[11px] text-term-dim mb-2">탐지 → 분석 파이프라인</h3>
          <div className="flex flex-wrap items-center gap-y-2">
            <Box>ADS-B / 시뮬레이터</Box>
            <Arrow />
            <Box>target-tracking-service{"\n"}(Kafka producer)</Box>
            <Arrow label="target-tracking" />
            <Box>threat-intel-ai-service{"\n"}(Kafka consumer)</Box>
          </div>
          <div className="flex flex-wrap gap-x-6 mt-1.5 pl-2">
            <div className="flex flex-col items-center text-[10px] text-term-dim">
              <Arrow vertical />
              <Box className="mt-0.5">pgvector (HNSW){"\n"}10개 위협 패턴</Box>
            </div>
            <div className="flex flex-col items-center text-[10px] text-term-dim">
              <Arrow vertical />
              <Box className="mt-0.5">Qdrant ×2{"\n"}문서 RAG / 이력 RAG</Box>
            </div>
          </div>
          <p className="text-[10px] text-term-dim mt-2 leading-relaxed">
            표적 이벤트마다 규칙 기반 등급을 먼저 산출하고, AI 미설정/실패 시에도 이 등급은 그대로 유지된다
            (graceful degradation). HIGH/CRITICAL 판정 시 승인 대기열로 자동 전환된다.
          </p>
        </section>

        <section className="mb-4">
          <h3 className="text-[11px] text-term-dim mb-2">사용자 접점 / 배포</h3>
          <div className="flex flex-wrap items-center gap-y-2">
            <Box>c4i-dashboard-frontend</Box>
            <Arrow label="REST · WS · SSE" />
            <Box>target-tracking-service{"\n"}threat-intel-ai-service</Box>
          </div>
          <div className="flex flex-wrap items-center gap-y-2 mt-2">
            <Box>GitHub{"\n"}(k3s-msa-infrastructure)</Box>
            <Arrow label="git push" />
            <Box>ArgoCD</Box>
            <Arrow label="sync" />
            <Box>k3s (3 노드)</Box>
          </div>
        </section>

        <section className="mb-4">
          <h3 className="text-[11px] text-term-dim mb-2">기술 스택</h3>
          <div className="flex flex-col gap-1.5">
            {STACK_GROUPS.map((g) => (
              <div key={g.label} className="flex items-center gap-2 flex-wrap">
                <span className="text-term-dim text-[10px] w-16 shrink-0">{g.label}</span>
                <div className="flex gap-1 flex-wrap">
                  {g.items.map((item) => (
                    <span key={item} className="border border-term-faint px-1.5 py-0.5 text-[10px] text-term-fg">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-4">
          <h3 className="text-[11px] text-term-dim mb-2">RAG 품질 실측 (RAGAS)</h3>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="text-term-dim border-b border-term-faint">
                <th className="text-left py-1 font-normal">질문</th>
                <th className="text-right py-1 font-normal w-20">faithfulness</th>
                <th className="text-right py-1 font-normal w-24">relevancy</th>
              </tr>
            </thead>
            <tbody>
              {RAGAS_ROWS.map((r) => (
                <tr key={r.question} className="border-b border-term-faint/50">
                  <td className="py-1 pr-2 text-term-fg">{r.question}</td>
                  <td className="py-1 text-right text-term-fg">{r.faithfulness.toFixed(2)}</td>
                  <td className="py-1 text-right text-term-fg">{r.relevancy.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-term-dim mt-1.5">
            faithfulness: 답변이 검색된 컨텍스트를 벗어나 지어낸 내용이 있는지 · relevancy: 질문과의 관련성
          </p>
        </section>

        <section>
          <h3 className="text-[11px] text-term-dim mb-2">설계 포인트</h3>
          <div className="flex flex-col gap-1.5">
            {DESIGN_POINTS.map((p) => (
              <div key={p.title} className="border-l-2 border-term-faint pl-2">
                <div className="text-term-yellow text-[11px]">{p.title}</div>
                <div className="text-term-dim text-[10px] leading-relaxed">{p.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
