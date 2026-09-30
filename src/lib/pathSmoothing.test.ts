import { describe, expect, it } from "vitest";
import { smoothPath } from "./pathSmoothing";

describe("smoothPath", () => {
  it("점이 2개 이하면 그대로 반환한다(스플라인 불가)", () => {
    expect(smoothPath([])).toEqual([]);
    expect(smoothPath([[1, 1]])).toEqual([[1, 1]]);
    expect(smoothPath([[1, 1], [2, 2]])).toEqual([[1, 1], [2, 2]]);
  });

  it("실제 좌표를 그대로 지나간다(제어점 보존)", () => {
    const points: [number, number][] = [[0, 0], [1, 1], [2, 0], [3, 1]];
    const result = smoothPath(points, 4);
    for (const p of points) {
      expect(result.some((r) => Math.abs(r[0] - p[0]) < 1e-9 && Math.abs(r[1] - p[1]) < 1e-9)).toBe(true);
    }
  });

  it("직선 구간은 보간해도 여전히 직선이다", () => {
    const points: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3]];
    const result = smoothPath(points, 4);
    for (const [lat, lon] of result) {
      expect(lat).toBeCloseTo(lon, 9);
    }
  });

  it("세그먼트 수만큼 점 개수가 늘어난다", () => {
    const points: [number, number][] = [[0, 0], [1, 1], [2, 0], [3, 1]];
    const result = smoothPath(points, 8);
    // (points.length - 1) * segmentsPerPoint + 마지막 점 1개
    expect(result).toHaveLength((points.length - 1) * 8 + 1);
  });
});
