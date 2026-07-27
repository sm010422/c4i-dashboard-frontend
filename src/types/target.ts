// target-tracking-service의 TargetEvent(kafka/TargetEvent.java)와 필드가 1:1로 대응한다.
export interface TargetEvent {
  targetId: string;
  targetType: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  status: string;
  // ADS-B의 track(진행방향, 도 단위, 0=북/시계방향). 가짜 시뮬레이터 표적은 null.
  heading: number | null;
}

export interface Region {
  code: "KOREA" | "UKRAINE" | "IRAN";
  label: string;
  center: [number, number];
  zoom: number;
  // 대략적인 사각 경계 [남쪽위도, 서쪽경도, 북쪽위도, 동쪽경도] -- 사이드바 지역 필터링용.
  bounds: [number, number, number, number];
}

// AdsbFiPollingService.java의 REGIONS와 중심좌표를 맞춘 지역 정의.
export const REGIONS: Region[] = [
  { code: "KOREA", label: "🇰🇷 대한민국", center: [37.5665, 126.978], zoom: 7, bounds: [33, 124, 39, 130] },
  { code: "UKRAINE", label: "🇺🇦 우크라이나", center: [50.4501, 30.5234], zoom: 6, bounds: [44, 22, 53, 41] },
  { code: "IRAN", label: "🇮🇷 이란", center: [35.6892, 51.389], zoom: 6, bounds: [25, 44, 40, 64] },
];

// target-tracking-service의 ThreatAnalysisDto.Response와 대응한다.
export interface ThreatAnalysisResponse {
  targetId: string;
  targetType: string;
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | string;
  sitrep: string;
  similarPatterns: string[];
  aiEnabled: boolean;
}

export interface SourceChunk {
  text: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface ToolCallResult {
  tool_called: boolean;
  tool_name: string | null;
  tool_result: string | null;
}

export type ChatRoute = "doc_rag" | "pattern_search";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  route?: ChatRoute;
  toolCall?: ToolCallResult;
  sources?: SourceChunk[];
  error?: string;
}
