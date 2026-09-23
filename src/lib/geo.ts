import type { TargetEvent } from "@/types/target";

/** 사각 경계 [남쪽위도, 서쪽경도, 북쪽위도, 동쪽경도] 안에 표적이 있는지 확인한다. */
export function inBounds(t: TargetEvent, bounds: [number, number, number, number]): boolean {
  const [south, west, north, east] = bounds;
  return t.latitude >= south && t.latitude <= north && t.longitude >= west && t.longitude <= east;
}
