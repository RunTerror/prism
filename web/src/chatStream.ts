// Talks to the Prism dev server (server/): POST /chat streams Server-Sent Events as the model writes.
// EventSource can't POST, so the stream is read by hand from fetch.
import type { Envelope } from "./types";
import versions from "../../core/dist/versions.json";

/** What this page draws (VERSIONS.md): sent with every message so the AI only uses parts it can show. */
const app = { blocks: versions.blocks, library: versions.library };

export type ChatEvent =
  | { event: "text"; data: { text: string } }
  | { event: "block_start"; data: { id: string } }
  | { event: "block_progress"; data: { id: string; lines: number; title?: string; parts: string[]; shape: string[] } }
  | { event: "block"; data: { id: string; envelope: Envelope } }
  | { event: "block_partial"; data: { id: string; envelope: Envelope } }
  | { event: "status"; data: { text: string } }
  | { event: "done"; data: { ms: number; costUsd: number | null } }
  | { event: "error"; data: { message: string } };

export type ChatRequest =
  | { mode: "claude"; message: string; conversation: string }
  | { mode: "replay"; replay?: string };

/** Sends one message and calls onEvent for every event until the reply ends. */
export async function streamChat(req: ChatRequest, onEvent: (e: ChatEvent) => void, signal: AbortSignal) {
  let res: Response;
  try {
    res = await fetch("/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...req, app }), signal });
  } catch (e) {
    if (signal.aborted) return;
    throw new Error("Can't reach the chat server. Start it with: node server/server.mjs (from the repo root)", { cause: e });
  }
  if (!res.ok || !res.body) throw new Error(`Chat server answered ${res.status}. Is it running on port 8787?`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read().catch((e) => (signal.aborted ? { value: undefined, done: true } : Promise.reject(e)));
    if (done) return;
    buffer += value;
    // Events are separated by a blank line: "event: name\ndata: {json}\n\n"
    let end;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const event = chunk.match(/^event: (.+)$/m)?.[1];
      const data = chunk.match(/^data: (.+)$/m)?.[1];
      if (event && data) onEvent({ event, data: JSON.parse(data) } as ChatEvent);
    }
  }
}

/** Names of the saved replies the server can replay ("haiku-slim-a.md#3"). */
/** A saved reply the server can play: its id ("haiku-slim-a.md#3") and a one-line description. */
export type SavedReply = { id: string; title: string };

export async function listReplies(): Promise<SavedReply[]> {
  try {
    const res = await fetch("/replies?titles=1");
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}
