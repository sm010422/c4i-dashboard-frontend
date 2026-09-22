# 개념 정리 — "시스템 구성" 패널로 노출 부족 문제 보완

`docs/concepts/01-frontend-visibility-gap-diagnosis.md`에서 진단한 1순위 보완("아키텍처/기술스택 진입점 하나 추가")을 실제로 구현한 기록.

## 1. 요구사항 재확인

진단 문서의 결론은 "기능 커버리지는 문제없고, 이미 만든 것들이 발견 가능하지 않다"는 것이었다. 즉 새 API 연동이 필요한 게 아니라, **이미 존재하는 백엔드/인프라 작업(MSA 4개 서비스, Kafka, pgvector/Qdrant, K8s GitOps, RAGAS 평가)을 프론트 화면 안에서 설명하는 화면 하나**가 필요했다.

## 2. 구현 — `ArchitecturePanel.tsx`

`AnalysisModal.tsx`와 같은 중앙 오버레이 모달 패턴을 재사용해 4개 섹션으로 구성했다:

- **탐지 → 분석 파이프라인**: ADS-B/시뮬레이터 → target-tracking-service(Kafka producer) → threat-intel-ai-service(Kafka consumer), 그 아래 pgvector(HNSW)/Qdrant×2 연결
- **사용자 접점 / 배포**: 프론트 ↔ 백엔드 REST·WS·SSE, GitHub → ArgoCD → k3s 흐름
- **기술 스택**: 탐지/추적·AI 파이프라인·프론트엔드·인프라 4개 그룹으로 배지 나열
- **RAG 품질 실측(RAGAS)**: `threat-intel-ai-service/docs/concepts/11-tool-calling-node-and-ragas-evaluation.md`에 기록된 실측값(faithfulness 0.75~1.00, answer_relevancy 0.86~0.91)을 표로 그대로 인용
- **설계 포인트**: 비동기 AI 분석, graceful degradation, human-in-the-loop, GitOps 배포 — 4가지를 한 줄 요약 + 근거로 정리

박스/화살표는 별도 다이어그램 라이브러리 없이 `Box`/`Arrow` 헬퍼 컴포넌트(테두리 div + 텍스트 화살표)로 직접 구현해 기존 터미널 톤(`term-fg`/`term-panel`/`term-dim` 색상 토큰)과 통일했다.

## 3. 진짜 문제 — "버튼이 있다"만으로는 안 풀린다

처음엔 헤더에 버튼만 추가했다. 하지만 01번 문서의 핵심 지적이 "처음 보는 사람은 버튼을 눌러봐야만 안다"였다는 걸 떠올리고, **버튼 추가는 근본 해결이 아니라는 결론**에 도달했다 — 버튼이 하나 더 늘어난 것뿐, 안 누르면 여전히 안 보인다.

그래서 세션당 최초 1회는 자동으로 열리도록 바꿨다:

```tsx
useEffect(() => {
  if (!window.sessionStorage.getItem("c4i-arch-seen")) setArchOpen(true);
}, []);

function closeArch() {
  setArchOpen(false);
  window.sessionStorage.setItem("c4i-arch-seen", "1");
}
```

`useState`의 lazy initializer에서 바로 `sessionStorage`를 읽는 방식은 시도하지 않았다 — Next.js는 클라이언트 컴포넌트도 기본적으로 SSR하므로, 서버 렌더 시점(`window` 없음)과 클라이언트 하이드레이션 시점의 초기값이 달라져 hydration mismatch가 난다. 대신 초기값은 항상 `false`로 두고 마운트 후 `useEffect`에서만 판단하도록 분리했다.

`eslint-plugin-react-hooks`의 `react-hooks/set-state-in-effect` 규칙이 이 패턴에 걸렸는데, `AnalysisModal.tsx`가 이미 같은 이유(외부 시스템 동기화)로 인라인 disable 주석을 쓰고 있어 그 컨벤션을 그대로 따랐다.

## 4. 검증

- `npx tsc --noEmit`, `npx eslint src/components/ArchitecturePanel.tsx src/components/Dashboard.tsx` — 통과
- `npm run dev` 띄운 뒤 실제 브라우저(Claude in Chrome)로 확인:
  - 최초 접속 시 모달이 자동으로 열리고, 실측 RAGAS 표/다이어그램이 정상 렌더링됨
  - X 버튼으로 닫으면 뒤의 실시간 지도(55개 실 ADS-B 표적)·사이드바가 그대로 살아있음
  - 헤더 버튼으로 재오픈 정상 동작
  - 420px 폭(모바일)에서도 박스가 줄바꿈되며 레이아웃이 깨지지 않음

## 5. 남은 일

01번 문서의 2순위 제안(RAGAS/관측성 데이터를 실시간으로 이 패널에 연결)은 아직 미착수 — `ax-portfolio-roadmap.md`의 3순위(관측성/평가 파이프라인 고도화)가 완료되면 지금은 표에 하드코딩된 RAGAS 수치를 실제 API 응답으로 교체할 수 있다.

## 관련 문서

- `01-frontend-visibility-gap-diagnosis.md` — 이 작업의 근거가 된 진단
- `../../ax-portfolio-roadmap.md` (레포 밖, `portfolio/defense/`) — 3순위(관측성) 진행 시 이 패널과 연결
- `threat-intel-ai-service/docs/concepts/11-tool-calling-node-and-ragas-evaluation.md` — 패널에 인용한 RAGAS 수치의 원본 근거
