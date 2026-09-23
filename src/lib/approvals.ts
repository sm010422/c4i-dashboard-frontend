import type { ThreatApproval } from "@/types/target";

/**
 * 승인 대기 목록만 골라 최신 요청이 먼저 오도록 정렬한다. useApprovalSocket에서
 * 매 렌더마다 계산되던 로직을 분리한 순수 함수.
 */
export function derivePendingApprovals(
  approvals: Record<number, ThreatApproval>
): ThreatApproval[] {
  return Object.values(approvals)
    .filter((a) => a.status === "PENDING")
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}
