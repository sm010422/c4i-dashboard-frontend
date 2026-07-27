export interface SseEvent {
  event: string;
  data: string;
}

/**
 * text/event-stream 응답 바디를 블록 단위(빈 줄로 구분)로 잘라서 이벤트를 뽑아낸다.
 * EventSource는 POST를 못 보내서 /ai/chat(POST + SSE)엔 못 쓰기 때문에, fetch의
 * ReadableStream을 직접 파싱한다 -- 원래 static/index.html의 handleSseBlock 로직을
 * 그대로 옮긴 것.
 */
export async function* parseSseStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? ""; // 아직 안 끝난 마지막 조각은 다음 루프로

    for (const block of blocks) {
      let eventName = "message";
      let dataLine: string | null = null;
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine = line.slice(5).trim();
      }
      if (dataLine !== null) {
        yield { event: eventName, data: dataLine };
      }
    }
  }
}
