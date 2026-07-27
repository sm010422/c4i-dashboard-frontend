// target-tracking-service의 TargetEvent(kafka/TargetEvent.java)와 필드가 1:1로 대응한다.
export interface TargetEvent {
  targetId: string;
  targetType: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  status: string;
}

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
