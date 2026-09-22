# 개념 정리 — 백엔드/인프라 구현 대비 프론트엔드 "노출 부족" 진단

"백엔드랑 k3s랑 다 갖춰놨는데 프론트가 그거에 비해 부실해 보인다"는 문제의식에서 시작한 점검 기록. 결론적으로 **기능 커버리지 자체는 문제가 없었고**, 진짜 문제는 이미 만든 것들이 "발견 가능하지 않다"는 점이었다.

## 1. 점검 방법

`c4i-dashboard-frontend/src` 전체 파일 목록(15개)과 백엔드 3개 서비스의 컨트롤러/라우터를 대조했다.

```
src/app/page.tsx, layout.tsx
src/components/Dashboard.tsx, MapView.tsx, TargetSidebar.tsx,
                AnalysisModal.tsx, ChatPanel.tsx, ApprovalPanel.tsx
src/hooks/useTargetSocket.ts, useApprovalSocket.ts
src/lib/config.ts, sse.ts
src/types/target.ts
```

```
target-tracking-service: TargetController, ThreatAnalysisController,
                          ThreatApprovalController, SimulatorController
threat-intel-ai-service: routers/chat.py, ingest.py, health.py
```

## 2. 발견 1 — 기능 커버리지는 문제없다

프론트가 쓰지 않는 백엔드 엔드포인트가 없다. 오히려 백엔드 쪽에서 공들인 기능들이 실제로 프론트에 다 연결돼 있었다:

| 백엔드 기능 | 프론트 반영 위치 |
|---|---|
| RAG + pgvector 유사 패턴 검색 | `AnalysisModal.tsx` — `similarPatterns` 리스트 렌더링 |
| SSE 토큰 스트리밍 + route 분기(`doc_rag`/`pattern_search`) | `ChatPanel.tsx` — `parseSseStream`로 토큰 단위 렌더링, route 배지 표시 |
| Tool calling (`assess_threat_level`) | `ChatPanel.tsx` — `🔧 도구 호출: {tool_name} → {tool_result}` |
| RAG 소스 출처(score + text) | `ChatPanel.tsx` — `sources` 리스트 |
| Human-in-the-loop 승인/반려 + WebSocket 실시간 반영 | `ApprovalPanel.tsx`, `useApprovalSocket.ts` |
| Graceful degradation (`aiEnabled: false`) | `AnalysisModal.tsx` — "AI 비활성화 상태" 안내 분기 |
| ADS-B 관측 공백(우크라이나/이란 구조적 한계) | `TargetSidebar.tsx` — `showCoverageNote` |

즉, "AI를 API로 호출해봤다" 이상의 디테일(스트리밍, tool call 가시화, source citation, HITL, degradation 처리)이 이미 UI 레벨까지 다 그려져 있다. 코드 품질이나 기능 누락이 문제가 아니다.

## 3. 발견 2 — 진짜 문제: 진입점이 없다

`src/app/page.tsx`:

```tsx
export default function Home() {
  return <Dashboard />;
}
```

레이아웃·랜딩·소개 화면 없이 `<Dashboard />` 하나가 전부다. 그 안에서도 AI 챗봇(`ChatPanel`)과 승인 패널(`ApprovalPanel`)은 헤더의 작은 버튼을 눌러야만 열리는 숨은 패널이고, 대시보드 자체는 터미널 스타일 지휘통제 화면 하나로 시작한다.

문제는 이 구조가 **"이미 알고 있는 사람"에게만 기능이 보인다**는 것이다. 면접관/리뷰어처럼 배경지식 없이 처음 접속한 사람은:

- 버튼을 하나하나 눌러봐야 AI 챗봇·승인 루프가 존재한다는 걸 안다
- 이 시스템이 MSA(4개 서비스)로 쪼개져 있고 K8s(ArgoCD GitOps) 위에서 돈다는 사실을 알 방법이 전혀 없다 — 프론트 어디에도 아키텍처 설명이 없음
- `ax-portfolio-roadmap.md`에 기록된 정량적 성과(RAGAS faithfulness 0.75~1.0, answer_relevancy 0.87~0.91) 같은 "AI 품질을 측정했다"는 증거가 화면상 전혀 노출되지 않음
- Kafka 비동기 처리, 규칙 기반 사전평가 → LLM 실패 시 degradation 같은 백엔드 설계 판단도 마찬가지로 비가시 영역

결과적으로 백엔드/인프라에 들인 공수(RAG 파이프라인, GitOps, 비동기 처리, 평가 자동화)와 화면에서 실제로 읽히는 인상(지도 + 챗봇) 사이에 괴리가 생긴다. 사용자가 원래 느낀 "부족해 보인다"는 인상은 구현 부족이 아니라 **서사(narrative) 부재**에서 온다.

## 4. 보완 방향 (우선순위)

1. **아키텍처/기술스택 진입점 하나 추가** — 헤더나 별도 모달·페이지에 MSA 구성도(4개 서비스 + Kafka + pgvector/Qdrant + K8s/ArgoCD), RAGAS 수치, 현재 진행 중인 처리(비동기 분석/tool calling 등)를 정적으로 보여주는 화면. 구현 난이도가 낮고, 처음 보는 사람이 30초 안에 시스템 범위를 파악할 수 있게 됨. 트레이드오프: 터미널 스타일 몰입감이 약간 깨짐.
2. **관측성 데이터가 준비되면 바로 화면에 연결** — `ax-portfolio-roadmap.md`의 3순위(RAGAS CI 자동화, latency/cost 노출)가 완료되는 시점에 위 진입점에 실시간으로 붙이면 "AI 품질을 지속 관리한다"는 스토리가 완성됨. 지금은 백엔드 쪽 관측성 자체가 미구현이라 프론트가 보여줄 데이터가 없는 상태.

## 관련 문서

- `../../ax-portfolio-roadmap.md` (레포 밖, `portfolio/defense/`) — 전체 MSA 강화 로드맵과 구현 현황
- `target-tracking-service/docs/concepts/03-dashboard-ai-integration.md` — AI 위협분석 최초 구현
- `threat-intel-ai-service/docs/concepts/11-tool-calling-node-and-ragas-evaluation.md` — RAGAS 정량평가 근거
- `k3s-msa-infrastructure/docs/concepts/02-gitops-and-argocd.md` — 화면에 아직 노출되지 않은 GitOps 인프라
