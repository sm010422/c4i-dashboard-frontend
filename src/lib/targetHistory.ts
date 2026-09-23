import type { TargetEvent } from "@/types/target";

export const MAX_HISTORY_POINTS = 20;

/**
 * 표적 하나의 경로 이력에 새 좌표를 추가하고, 최근 MAX_HISTORY_POINTS개만 유지한다.
 * useTargetSocket에서 매 WebSocket 메시지마다 호출되는 로직을 분리한 순수 함수 --
 * 훅 밖에서 동작을 직접 검증할 수 있게 하기 위함.
 */
export function appendHistory(
  history: Record<string, [number, number][]>,
  event: TargetEvent,
  maxPoints: number = MAX_HISTORY_POINTS
): Record<string, [number, number][]> {
  const coords = history[event.targetId] ?? [];
  const next = [...coords, [event.latitude, event.longitude] as [number, number]];
  if (next.length > maxPoints) next.shift();
  return { ...history, [event.targetId]: next };
}
