// target-tracking-service 배포 주소. 로컬 개발 시 .env.local로 오버라이드.
// 기본값은 Tailscale Funnel로 공개된 실제 클러스터 주소
// (k3s-msa-infrastructure/docs/Public-Access-via-Tailscale-Funnel.md 참고).
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://k3s-master.taildcdcee.ts.net";

// threat-intel-ai-service는 같은 Traefik Ingress 아래 /ai prefix로 라우팅된다
// (k3s-msa-infrastructure/apps/threat-intel-ai-service/ingress.yaml).
export const AI_BASE_URL = `${BACKEND_URL}/ai`;

export const WS_URL = `${BACKEND_URL}/ws`;
