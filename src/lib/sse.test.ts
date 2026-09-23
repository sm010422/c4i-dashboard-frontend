import { describe, expect, it } from "vitest";
import { parseSseStream } from "./sse";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i += 1;
      } else {
        controller.close();
      }
    },
  });
}

async function collect(stream: ReadableStream<Uint8Array>) {
  const events = [];
  for await (const e of parseSseStream(stream)) events.push(e);
  return events;
}

describe("parseSseStream", () => {
  it("event/data 블록 하나를 파싱한다", async () => {
    const stream = streamFromChunks(['event: route\ndata: {"route":"doc_rag"}\n\n']);
    const events = await collect(stream);
    expect(events).toEqual([{ event: "route", data: '{"route":"doc_rag"}' }]);
  });

  it("event 없는 블록은 기본 event명 'message'로 처리한다", async () => {
    const stream = streamFromChunks(['data: {"token":"hi"}\n\n']);
    const events = await collect(stream);
    expect(events).toEqual([{ event: "message", data: '{"token":"hi"}' }]);
  });

  it("청크 경계에서 블록이 잘려도 다음 청크와 이어붙여 파싱한다", async () => {
    // threat-intel-ai-service의 실제 SSE 스트리밍처럼 토큰 단위로 잘게 들어오는 상황을 흉내낸다.
    const stream = streamFromChunks(['event: rou', 'te\ndata: {"a":1}', "\n\n"]);
    const events = await collect(stream);
    expect(events).toEqual([{ event: "route", data: '{"a":1}' }]);
  });

  it("여러 이벤트를 순서대로 전부 yield한다", async () => {
    const stream = streamFromChunks([
      'event: route\ndata: {"route":"pattern_search"}\n\n',
      'event: tool_call\ndata: {"tool_name":"assess_threat_level"}\n\n',
      "event: done\ndata: {}\n\n",
    ]);
    const events = await collect(stream);
    expect(events.map((e) => e.event)).toEqual(["route", "tool_call", "done"]);
  });

  it("data 없는 블록은 건너뛴다", async () => {
    const stream = streamFromChunks(["event: route\n\n", 'data: {"ok":true}\n\n']);
    const events = await collect(stream);
    expect(events).toEqual([{ event: "message", data: '{"ok":true}' }]);
  });
});
