# 📡 C4I Dashboard Frontend

[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg?logo=next.js)](#)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg?logo=typescript)](#)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black.svg?logo=vercel)](#)

## 📌 개요

[target-tracking-service](https://github.com/sm010422/target-tracking-service)의 `static/index.html`(순수 JS, 단일 파일)로 구현돼 있던 C4I 대시보드를 별도 Next.js 프로젝트로 분리한 것. 백엔드는 k3s 클러스터에 그대로 두고, 이 프론트만 **Vercel에 독립적으로 배포**한다 — 클러스터 리소스를 하나도 안 늘리면서 프론트를 컴포넌트 기반으로 재구성하기 위한 절충.

## 🏗 왜 별도 리포로 분리했나

- 기존 `static/index.html`이 전역 변수(`targets{}`, `coords{}`) + `innerHTML` 직접 조작으로 커지면서 유지보수가 어려워지고 있었다.
- 그렇다고 이 프론트를 k3s 클러스터에 4번째 배포 단위(Docker 이미지 + Deployment + Ingress)로 또 얹는 건, 이미 메모리가 넉넉하지 않은 홈랩 클러스터에 불필요한 부담이었다.
- **Vercel 배포**를 택하면 클러스터는 안 건드리고, 프론트만 독립된 빌드/배포 파이프라인(모던 DX)을 가질 수 있다 — 백엔드(target-tracking-service, threat-intel-ai-service)는 계속 k3s + ArgoCD GitOps로, 프론트는 Vercel로. 완전히 다른 두 배포 방식이 하나의 시스템을 이루는 구조.

## 🔌 백엔드 연동

이 프론트는 브라우저에서 직접 k3s 클러스터의 공개 엔드포인트를 호출한다 — 별도 BFF/프록시 없음.

| 대상 | 프로토콜 | 비고 |
|---|---|---|
| `target-tracking-service` `/ws` | WebSocket(SockJS/STOMP) | `WebSocketConfig`가 이미 `setAllowedOriginPatterns("*")`라 별도 설정 불필요 |
| `target-tracking-service` `/api/**` | REST (fetch) | Vercel 오리진에서 오는 cross-origin 요청이라 백엔드에 **CORS 설정을 새로 추가**해야 했음 (`WebConfig.java`) |
| `threat-intel-ai-service` `/ai/chat` | SSE (fetch + ReadableStream) | 같은 클러스터 Ingress의 `/ai` path, FastAPI 쪽에 이미 CORS 전체 허용이 붙어있어 그대로 재사용 |

백엔드 주소는 하드코딩하지 않고 `NEXT_PUBLIC_BACKEND_URL`로 뺐다 (`src/lib/config.ts`) — 기본값은 [Tailscale Funnel로 공개된 실제 클러스터 주소](https://github.com/sm010422/k3s-msa-infrastructure/blob/main/docs/Public-Access-via-Tailscale-Funnel.md).

## ✨ 기능

- 실시간 표적 지도 (Leaflet) — WebSocket으로 위치 스트리밍, 위협등급별 마커 색상
- 표적 사이드바 — 실시간 카드 목록 + 표적별 AI 위협분석 버튼
- AI 위협분석 모달 — target-tracking-service 자체 RAG(Spring AI + pgvector) 호출
- AI 챗봇 패널 — threat-intel-ai-service의 LangGraph 라우팅 + tool-calling을 SSE로 스트리밍, 예시 질문 칩 제공
- 시뮬레이터 실행 버튼 — 가짜 드론 이벤트 발행 (실제 ADS-B 피드와 병행)

## 🚀 로컬 개발

```bash
npm install
cp .env.example .env.local   # 기본값 그대로 써도 됨 (실제 배포된 백엔드를 가리킴)
npm run dev
```

## ☁️ Vercel 배포

1. 이 리포를 Vercel에 New Project로 import
2. Framework Preset: Next.js (자동 감지)
3. 환경변수 `NEXT_PUBLIC_BACKEND_URL` 필요 시 설정 (기본값으로도 동작)
4. Deploy

## 🔗 연관 리포지토리

- 🎯 **[Target Tracking Service](https://github.com/sm010422/target-tracking-service)** — 실시간 표적 추적, WebSocket, 자체 AI 위협분석 (이 프론트가 대체한 `static/index.html`의 원본)
- 🧠 **[Threat Intel AI Service](https://github.com/sm010422/threat-intel-ai-service)** — 문서 RAG + 이력 패턴 탐지 챗봇 (`/ai/chat`)
- 🏗️ **[K3s MSA Infrastructure](https://github.com/sm010422/k3s-msa-infrastructure)** — 백엔드가 떠 있는 클러스터 인프라
