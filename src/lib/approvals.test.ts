import { describe, expect, it } from "vitest";
import { derivePendingApprovals } from "./approvals";
import type { ThreatApproval } from "@/types/target";

function approval(overrides: Partial<ThreatApproval>): ThreatApproval {
  return {
    id: 1,
    targetId: "T-1",
    targetType: "DRONE",
    threatLevel: "HIGH",
    sitrep: "sitrep",
    status: "PENDING",
    requestedAt: "2026-09-23T00:00:00",
    decidedAt: null,
    decidedBy: null,
    decisionReason: null,
    ...overrides,
  };
}

describe("derivePendingApprovals", () => {
  it("PENDING만 남기고 APPROVED/REJECTED는 제외한다", () => {
    const result = derivePendingApprovals({
      1: approval({ id: 1, status: "PENDING" }),
      2: approval({ id: 2, status: "APPROVED" }),
      3: approval({ id: 3, status: "REJECTED" }),
    });
    expect(result.map((a) => a.id)).toEqual([1]);
  });

  it("최신 요청(requestedAt)이 먼저 오도록 정렬한다", () => {
    const result = derivePendingApprovals({
      1: approval({ id: 1, requestedAt: "2026-09-23T00:00:00" }),
      2: approval({ id: 2, requestedAt: "2026-09-23T02:00:00" }),
      3: approval({ id: 3, requestedAt: "2026-09-23T01:00:00" }),
    });
    expect(result.map((a) => a.id)).toEqual([2, 3, 1]);
  });

  it("빈 객체면 빈 배열을 반환한다", () => {
    expect(derivePendingApprovals({})).toEqual([]);
  });
});
