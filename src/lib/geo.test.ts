import { describe, expect, it } from "vitest";
import { inBounds } from "./geo";
import type { TargetEvent } from "@/types/target";

function target(lat: number, lng: number): TargetEvent {
  return { targetId: "T-1", targetType: "DRONE", latitude: lat, longitude: lng, altitude: 100, speed: 50, status: "DETECTED", heading: null };
}

describe("inBounds", () => {
  const koreaBounds: [number, number, number, number] = [33, 124, 39, 130];

  it("경계 안의 좌표는 true", () => {
    expect(inBounds(target(37.5, 127), koreaBounds)).toBe(true);
  });

  it("경계 밖의 좌표는 false", () => {
    expect(inBounds(target(50, 30), koreaBounds)).toBe(false);
  });

  it("경계선 위(포함 경계)는 true", () => {
    expect(inBounds(target(33, 124), koreaBounds)).toBe(true);
    expect(inBounds(target(39, 130), koreaBounds)).toBe(true);
  });
});
