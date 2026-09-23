"use client";

import { useState } from "react";
import { AI_BASE_URL } from "@/lib/config";
import { parseSseStream } from "@/lib/sse";
import type { ChatMessage, ChatRoute, SourceChunk, ToolCallResult } from "@/types/target";

const EXAMPLE_QUESTIONS = [
  "저고도 자폭 드론이 접근할 때 대응 절차가 어떻게 되나?",
  "과거에 DRONE-001 표적이 탐지된 이력이 있었나?",
  "과거 이력을 보고 위협 등급을 정량적으로 평가해줘",
];

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "안녕하세요. 위협 인텔 문서나 과거 표적 탐지 이력에 대해 물어보세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);

  async function send(question: string) {
    if (!question.trim() || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);

    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);
    setStreaming(true);

    try {
      const res = await fetch(`${AI_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      for await (const { event, data } of parseSseStream(res.body)) {
        const parsed: unknown = safeParse(data);

        setMessages((prev) => {
          const next = [...prev];
          const msg = { ...next[assistantIndex] };

          if (event === "sources" && Array.isArray(parsed)) {
            msg.sources = parsed as SourceChunk[];
          } else if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const obj = parsed as Record<string, unknown>;
            if (event === "route" && typeof obj.route === "string") {
              msg.route = obj.route as ChatRoute;
            } else if (event === "tool_call") {
              msg.toolCalls = [...(msg.toolCalls ?? []), obj as unknown as ToolCallResult];
            } else if (event === "error" && typeof obj.message === "string") {
              msg.error = obj.message;
            } else if (typeof obj.token === "string") {
              msg.text += obj.token;
            }
          }

          next[assistantIndex] = msg;
          return next;
        });
      }
    } catch (e) {
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIndex] = { ...next[assistantIndex], error: String(e) };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed right-0 top-[45px] bottom-0 w-[340px] bg-term-panel border-l border-term z-[900] flex flex-col">
      <div className="px-2.5 py-2 border-b border-term text-sm flex justify-between items-center">
        <span>🤖 threat-intel-ai-service</span>
        <button onClick={onClose} className="text-term-fg">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 text-xs">
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 ${m.role === "user" ? "text-term-yellow" : "text-term-fg"}`}>
            <div className="text-[10px] opacity-70">{m.role === "user" ? "나" : "AI"}</div>
            {m.route && (
              <div className="text-[10px] text-term-dim">
                [{m.route === "doc_rag" ? "📄 문서 검색" : "📡 이력 검색"}]
              </div>
            )}
            <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
            {m.toolCalls && m.toolCalls.length > 0 && (
              <div className="text-[10px] text-[#ff9900] mt-1 flex flex-col gap-0.5">
                {m.toolCalls.map((tc, k) => (
                  <div key={k}>
                    🔧 {k + 1}단계: {tc.tool_name} → {tc.tool_result}
                  </div>
                ))}
              </div>
            )}
            {m.error && <div className="mt-1">[오류: {m.error}]</div>}
            {m.sources && m.sources.length > 0 && (
              <div className="text-[10px] text-term-dim mt-1">
                출처
                <ul className="list-none pl-0">
                  {m.sources.map((s, j) => (
                    <li key={j}>
                      score {s.score.toFixed(2)} — {s.text.slice(0, 60)}...
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {messages.length <= 1 && (
          <div className="flex flex-col gap-1.5 mt-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-left border border-term-faint px-2 py-1 text-[11px] text-term-dim hover:border-term hover:text-term-fg"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-term p-2 flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="교리 문서 / 과거 이력 질문..."
          className="flex-1 bg-black border border-term px-1.5 py-1 text-xs text-term-fg"
        />
        <button
          onClick={() => send(input)}
          disabled={streaming}
          className="border border-term px-2.5 py-1 text-xs disabled:opacity-50 hover:bg-term-fg hover:text-black"
        >
          전송
        </button>
      </div>
    </div>
  );
}

function safeParse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}
