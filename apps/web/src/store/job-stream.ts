export type JobStreamEvent =
  | { type: "log"; message: string }
  | { type: "status"; status: string }
  | { type: "done"; result?: unknown }
  | { type: "error"; error: string };

export async function streamJobEvents(
  url: string,
  authHeader: string | null,
  onEvent: (event: JobStreamEvent) => void
) {
  const headers: Record<string, string> = { accept: "text/event-stream" };
  if (authHeader) headers.authorization = authHeader;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Stream failed: ${res.status}`);
  }
  if (!res.body) {
    throw new Error("Stream unavailable");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index = buffer.indexOf("\n\n");
    while (index >= 0) {
      const chunk = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const parsed = parseSseChunk(chunk);
      if (parsed) onEvent(parsed);
      index = buffer.indexOf("\n\n");
    }
  }
}

function parseSseChunk(chunk: string): JobStreamEvent | null {
  const lines = chunk.split(/\r?\n/);
  let event = "message";
  let data = "";
  for (const line of lines) {
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }
  if (!data) return null;
  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (event === "log") {
      return { type: "log", message: String(parsed.message ?? "") };
    }
    if (event === "status") {
      return { type: "status", status: String(parsed.status ?? "") };
    }
    if (event === "done") {
      return { type: "done", result: parsed.result };
    }
    if (event === "error") {
      return { type: "error", error: String(parsed.error ?? "error") };
    }
  } catch {
    return null;
  }
  return null;
}
