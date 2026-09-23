# 개념 정리 — ADS-B 폴링 주기를 줄일지 판단하고, 대신 좌표 보간 애니메이션을 넣은 기록

"비행기가 20초마다 순간이동하는데, 폴링 주기를 줄이면 부드러워지지 않을까?"라는 질문에서 시작한 조사. 결론: **폴링 주기는 그대로 두고, 프론트에서 좌표 보간 애니메이션을 추가했다.**

## 1. 20초 주기가 어디서 왔는지 — adsb.fi 자체 한도는 병목이 아니다

`target-tracking-service/docs/concepts/04-adsb-fi-live-feed-integration.md`에 이미 실측이 있다. adsb.fi 이용약관상 한도는 **초당 최대 1회**. 지금 반경 조회는 20초마다(=초당 0.05회) 나가므로 **한도 대비 20배 여유**다. 즉 adsb.fi 쪽 제약만 보면 1~2초로 줄여도 약관 위반이 아니다.

## 2. 진짜 병목 — 다운스트림 Gemini 임베딩 호출

`target-tracking`이라는 Kafka 토픽 하나를 **서로 다른 두 서비스가 각자의 consumer group으로 전체 스트림을 다 받는다**:

| 서비스 | 매 이벤트마다 하는 일 | 게이트 플래그 |
|---|---|---|
| `target-tracking-service` (Java) | DB 저장, WebSocket 브로드캐스트, (옵션) SITREP 생성 | `ai.auto-analysis.enabled` (기본 `false`) |
| `threat-intel-ai-service` (Python) | (옵션) Qdrant 이력 색인 — `upsert_target_event()` | `settings.auto_index_enabled` (기본 `false`) |

`threat-intel-ai-service/app/kafka/consumer.py`에 이 사고가 코드 주석으로 그대로 남아있다:

```python
"""
Gated behind settings.auto_index_enabled (default False) -- with no
filtering this consumed the Gemini free-tier daily embedding quota (1000/day)
in well under an hour once the ADS-B feed was flowing.
"""
```

한 폴링 주기(20초)에 60~100대가 잡히는데, 필터링 없이 이벤트마다 Qdrant에 색인하면서 매번 Gemini 임베딩 API를 불렀더니 **하루 한도(1000회)를 한 시간도 안 돼서 소진**했다는 기록. `k3s-msa-infrastructure/apps/threat-intel-ai-service/deployment.yaml`에도 "복구 완료 — 자동 색인/자동분석을 둘 다 기본 OFF로 고친 새 이미지 배포"라는 주석이 남아있어, 이게 한 번 실제로 터졌던 사고라는 걸 확인했다.

## 3. 지금 라이브 상태 확인

두 플래그 다 코드 기본값이 `false`이고, `k3s-msa-infrastructure`의 매니페스트 어디에도 이걸 다시 켜는 환경변수 오버라이드가 없다. 즉 **지금은 폴링 주기를 줄여도 Gemini 호출량에는 영향이 없다** — 그 경로 자체가 꺼져 있어서.

## 4. 그런데도 줄이지 않기로 한 이유

Gemini 쪽은 안전하지만, `TargetConsumer.java`를 보면 **AI 플래그와 무관하게 이벤트마다 무조건 실행되는 부분**이 있다:

```java
targetService.saveTarget(request);                       // PostgreSQL 저장
messagingTemplate.convertAndSend("/topic/targets", event); // WebSocket 브로드캐스트
```

폴링 주기를 줄이면 이 DB 쓰기 + WebSocket 브로드캐스트 빈도가 그대로 배로 늘어난다. `ax-portfolio-roadmap.md`에 2026-09-16 실측이 있는데, k3s worker 노드가 이미 **메모리 70%대, load average가 vCPU 수를 넘는 상태**였다. 여유가 없는 3노드 홈랩 클러스터에 쓰기/브로드캐스트 빈도를 4~5배 늘리는 건 얻는 것(마커가 좀 더 자주 갱신되는 체감) 대비 리스크가 크다고 판단해서, **백엔드 폴링 주기는 그대로 뒀다.**

## 5. 대신 프론트에서 좌표 보간 애니메이션

서버 부하를 하나도 안 늘리면서 "부드럽게 움직이는" 체감만 얻는 방법 — 새 좌표가 오면 그 자리로 순간이동하는 대신, 마지막으로 받은 좌표에서 새 좌표까지 짧은 시간 동안 선형보간(lerp)해서 그린다.

### 검토했다가 버린 방법 — CSS `transition: transform`

Leaflet은 마커 위치를 `.leaflet-marker-icon`에 `transform: translate3d(...)`로 적용한다. 이 클래스에 전역으로 `transition: transform 1s`만 걸면 라이브러리 코드를 하나도 안 건드리고 "공짜로" 움직임이 부드러워진다 — 실제로 흔히 쓰이는 트릭이다.

하지만 이 트릭은 **Leaflet이 지도 자체를 pan/zoom할 때도 마커에 같은 transform을 건드린다**는 문제가 있다. `MapView.tsx`의 `MapRecenter`가 지역 탭을 바꿀 때 `map.flyTo()`로 지도를 이동시키는데, 이 순간에도 마커 위치가 같은 CSS transition을 타면서 **지도는 이미 다 이동했는데 마커들이 뒤늦게 스멀스멀 따라오는** 부자연스러운 지연이 생긴다. 데이터 갱신으로 인한 이동과 지도 조작으로 인한 이동을 CSS 레벨에서 구분할 방법이 마땅치 않아서 이 방법은 버렸다.

### 채택한 방법 — `useInterpolatedTargets` 훅 (React state 보간)

`src/hooks/useInterpolatedTargets.ts` — Leaflet 내부 transform이 아니라, **React가 Marker에 넘기는 `position` prop 자체를 보간**한다. 지도 pan/zoom과는 완전히 무관한 레이어라 위 문제가 애초에 발생하지 않는다.

```ts
const ANIMATION_DURATION_MS = 4000;

// targets가 바뀔 때마다: "지금 화면에 보이는 위치 -> 새로 받은 좌표"로 애니메이션을 새로 건다
useEffect(() => {
  for (const [id, t] of Object.entries(targets)) {
    const prev = anims[id];
    const currentPos = prev ? lerp(prev.from, prev.to, progress) : [t.latitude, t.longitude];
    anims[id] = { from: currentPos, to: [t.latitude, t.longitude], startedAt: now };
  }
}, [targets]);

// 마커 전체를 하나의 requestAnimationFrame 루프로 동시에 보간
useEffect(() => {
  function tick() {
    /* anims를 순회하며 progress에 따라 lerp된 좌표로 next를 구성 */
    if (animating || wasAnimatingRef.current) setDisplayed(next);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}, []);
```

설계에서 신경 쓴 부분:

- **4초 고정 — 20초 전체를 스트레칭하지 않았다.** 백엔드 주기가 "정확히 20초마다"라는 보장이 없다(시뮬레이터 이벤트가 섞여서 임의 시점에도 들어옴, 개별 targetId가 매 주기 갱신된다는 보장도 없음). 다음 업데이트가 언제 올지 예측해서 그 시점까지 스트레칭하는 대신, "새 좌표가 오면 4초에 걸쳐 부드럽게 도착"만 보장한다 — 다음 업데이트가 예상보다 일찍 와도 그 시점의 중간 위치에서 새 목표로 자연스럽게 재조준(retarget)되므로 어색하지 않다.
- **마커 위치만 보간, 사이드바/AI 분석은 원본값 그대로.** `Dashboard.tsx`에서 `interpolatedTargets`는 `<MapView>`에만 넘기고, `<TargetSidebar>`와 `AnalysisModal`이 쓰는 `selectedTarget`은 여전히 원본 `targets`/`regionTargets`를 참조한다 — 고도/속도 같은 텍스트 값이나 AI 위협분석 요청에 보간된(가짜) 좌표가 섞여 들어가면 안 되기 때문.
- **애니메이션이 없을 때는 리렌더를 안 한다.** `requestAnimationFrame` 루프 자체는 계속 돌지만, 아무것도 움직이는 중이 아니면(`animating === false`이고 방금 전 프레임도 정지 상태였으면) `setDisplayed`를 호출하지 않는다 — 표적 80~100개가 대부분 20초 중 16초는 가만히 있는데 그때마다 60fps로 리렌더하면 낭비이기 때문.

## 6. 검증

- `npx tsc --noEmit`, `npx eslint src/hooks/useInterpolatedTargets.ts src/components/Dashboard.tsx` — 통과 (처음엔 `targetsRef.current = targets`를 렌더 중에 직접 대입해서 `react-hooks/refs` 규칙에 걸렸고, `useEffect`로 옮겨서 해결)
- `npm run dev` + 브라우저로 콘솔 에러 없이 렌더링되는 것, 마커가 실시간 데이터와 함께 정상 표시되는 것 확인

## 관련 문서

- `target-tracking-service/docs/concepts/04-adsb-fi-live-feed-integration.md` — adsb.fi 레이트리밋 실측 근거
- `target-tracking-service/docs/concepts/07-gemini-quota-incident-and-on-demand-ai-analysis.md` — `ai.auto-analysis.enabled` 사고(target-tracking-service 쪽)
- `threat-intel-ai-service/app/kafka/consumer.py` — `auto_index_enabled` 사고가 남아있는 코드 주석 원본
- `02-architecture-panel-for-visibility-gap.md` — 마커 렌더링을 처음 손댄 작업(01-frontend-visibility-gap-diagnosis.md 계열)
