import { describe, expect, it } from "vitest";
import { appendHistory } from "./targetHistory";
import type { TargetEvent } from "@/types/target";

function event(lat: number, lng: number, targetId = "T-1"): TargetEvent {
  return { targetId, targetType: "DRONE", latitude: lat, longitude: lng, altitude: 100, speed: 50, status: "DETECTED", heading: null };
}

describe("appendHistory", () => {
  it("빈 이력에 좌표를 추가한다", () => {
    const result = appendHistory({}, event(37.5, 127));
    expect(result["T-1"]).toEqual([[37.5, 127]]);
  });

  it("기존 이력 뒤에 이어 붙인다", () => {
    const history = { "T-1": [[1, 1]] as [number, number][] };
    const result = appendHistory(history, event(2, 2));
    expect(result["T-1"]).toEqual([[1, 1], [2, 2]]);
  });

  it("다른 targetId의 이력은 건드리지 않는다", () => {
    const history = { "T-2": [[9, 9]] as [number, number][] };
    const result = appendHistory(history, event(1, 1, "T-1"));
    expect(result["T-2"]).toEqual([[9, 9]]);
    expect(result["T-1"]).toEqual([[1, 1]]);
  });

  it("최대 개수를 넘으면 가장 오래된 좌표부터 버린다", () => {
    const history = {
      "T-1": Array.from({ length: 3 }, (_, i) => [i, i]) as [number, number][],
    };
    const result = appendHistory(history, event(99, 99), 3);
    expect(result["T-1"]).toHaveLength(3);
    expect(result["T-1"][0]).toEqual([1, 1]); // [0,0]이 밀려나감
    expect(result["T-1"][2]).toEqual([99, 99]);
  });
});
