// The chat: a message goes to the dev server, the reply streams back as text and live Prism widgets.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { listReplies, streamChat, type ChatEvent, type ChatRequest } from "./chatStream";
import { PrismWidget } from "./Widget";
import type { Envelope } from "./types";

type Progress = { lines: number; title?: string; shape: string[] };
type Piece = { kind: "text"; text: string } | { kind: "block"; id: string; progress?: Progress; envelope?: Envelope };
type Reply = { pieces: Piece[]; status?: string; done?: { ms: number; costUsd: number | null }; error?: string; streaming: boolean };
type Message = { id: number; role: "user"; text: string } | { id: number; role: "assistant"; reply: Reply };

let nextId = 1;
const newConversation = () => crypto.randomUUID();

/** Applies one server event to the reply being written. */
function reduce(reply: Reply, e: ChatEvent): Reply {
  const pieces = [...reply.pieces];
  const last = pieces[pieces.length - 1];
  const block = (id: string) => pieces.findIndex((p) => p.kind === "block" && p.id === id);
  switch (e.event) {
    case "text":
      if (last?.kind === "text") pieces[pieces.length - 1] = { kind: "text", text: last.text + e.data.text };
      else pieces.push({ kind: "text", text: e.data.text });
      return { ...reply, pieces, status: undefined };
    case "block_start":
      pieces.push({ kind: "block", id: e.data.id });
      return { ...reply, pieces, status: undefined };
    case "block_progress": {
      const i = block(e.data.id);
      if (i !== -1) pieces[i] = { ...(pieces[i] as Piece & { kind: "block" }), progress: e.data };
      return { ...reply, pieces };
    }
    case "block_partial": // the screen so far: same piece, so it grows in place
    case "block": {
      const i = block(e.data.id);
      const piece: Piece = { kind: "block", id: e.data.id, envelope: e.data.envelope };
      if (i === -1) pieces.push(piece);
      else pieces[i] = piece;
      return { ...reply, pieces };
    }
    case "status":
      return { ...reply, status: e.data.text };
    case "done":
      return { ...reply, done: e.data, status: undefined, streaming: false };
    case "error":
      return { ...reply, error: e.data.message, status: undefined, streaming: false };
  }
}

// ---------- A small, safe Markdown: paragraphs, headings, lists, **bold**, `code`, code blocks ----------

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part.startsWith("`") && part.endsWith("`") && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code>
        : <Fragment key={i}>{part}</Fragment>
  );
}

function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const lines = text.replace(/\n+$/, "").split("\n");
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) code.push(lines[i]);
      out.push(<pre key={out.length} className="md-code">{code.join("\n")}</pre>);
      i++;
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]); i++) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const List = ordered ? "ol" : "ul";
      out.push(<List key={out.length}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</List>);
    } else if (/^#{1,6}\s/.test(line)) {
      out.push(<p key={out.length} className="md-heading">{inline(line.replace(/^#+\s*/, ""))}</p>);
      i++;
    } else if (line.trim() === "") {
      i++;
    } else {
      const para: string[] = [];
      for (; i < lines.length && lines[i].trim() !== "" && !/^(```|#{1,6}\s|\s*([-*]|\d+\.)\s+)/.test(lines[i]); i++) para.push(lines[i]);
      out.push(<p key={out.length}>{inline(para.join("\n"))}</p>);
    }
  }
  return <div className="md">{out}</div>;
}

// ---------- Pieces ----------

/** Shown while a screen is being written: its title and grey shapes for the parts seen so far. */
function Building({ progress }: { progress?: Progress }) {
  const shape = (progress?.shape ?? []).slice(0, 6);
  return (
    <div className="chat-building" aria-busy="true">
      <div className="chat-building-head">
        <span className="chat-dot" />
        {progress?.title ? `Building “${progress.title}”…` : "Building screen…"}
      </div>
      {shape.map((t, i) => <div key={i} className={"chat-skeleton is-" + t.toLowerCase()} />)}
    </div>
  );
}

/** onAsk is left out in Replay mode: the widget then shows its question as a toast. */
function AssistantMessage({ reply, onAsk }: { reply: Reply; onAsk?: (text: string) => void }) {
  return (
    <div className="chat-assistant">
      {reply.pieces.map((p, i) =>
        p.kind === "text" ? <Markdown key={i} text={p.text} />
          : p.envelope ? <PrismWidget key={p.id} envelope={p.envelope} onAsk={onAsk} />
            : <Building key={p.id} progress={p.progress} />
      )}
      {reply.status && <div className="chat-status"><span className="chat-dot" />{reply.status}</div>}
      {reply.streaming && !reply.status && reply.pieces.length === 0 && <div className="chat-status"><span className="chat-dot" />Thinking…</div>}
      {reply.error && <div className="chat-error">{reply.error}</div>}
      {reply.done && (
        <div className="chat-meta">
          {(reply.done.ms / 1000).toFixed(1)} s{reply.done.costUsd ? ` · $${reply.done.costUsd.toFixed(4)}` : ""}
        </div>
      )}
    </div>
  );
}

// ---------- The chat ----------

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"claude" | "replay">("replay");
  const [replies, setReplies] = useState<string[]>([]);
  const [replay, setReplay] = useState("");
  const [conversation, setConversation] = useState(newConversation);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const busy = messages.some((m) => m.role === "assistant" && m.reply.streaming);

  useEffect(() => {
    listReplies().then((names) => {
      setReplies(names);
      setReplay((r) => r || names[0] || "");
    });
    return () => abort.current?.abort();
  }, []);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" }); // newer browsers return a Promise here: don't hand it to React
  }, [messages.length]);

  async function send(text: string, request: ChatRequest) {
    const userId = nextId++;
    const id = nextId++;
    setMessages((list) => [...list, { id: userId, role: "user", text }, { id, role: "assistant", reply: { pieces: [], streaming: true } }]);
    const update = (fn: (r: Reply) => Reply) =>
      setMessages((list) => list.map((m) => (m.id === id && m.role === "assistant" ? { ...m, reply: fn(m.reply) } : m)));
    abort.current = new AbortController();
    try {
      await streamChat(request, (e) => update((r) => reduce(r, e)), abort.current.signal);
      update((r) => (r.streaming ? { ...r, streaming: false } : r)); // the stream ended without "done" (stopped)
    } catch (e) {
      update((r) => ({ ...r, error: (e as Error).message, streaming: false }));
    }
  }

  /** A widget asked the AI something (the `ask` effect): it becomes the next chat message. */
  const ask = (text: string) => {
    const t = text.trim();
    if (t && !busy) send(t, { mode: "claude", message: t, conversation });
  };

  function submit() {
    if (mode === "replay") send(`Replay: ${replay}`, { mode: "replay", replay });
    else if (draft.trim()) send(draft.trim(), { mode: "claude", message: draft.trim(), conversation });
    setDraft("");
  }

  function newChat() {
    abort.current?.abort();
    setMessages([]);
    setConversation(newConversation());
  }

  return (
    <div className="chat">
      <div className="toolbar">
        <div className="segmented" role="radiogroup" aria-label="Reply source">
          {(["replay", "claude"] as const).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
              {m === "replay" ? "Replay" : "Claude"}
            </button>
          ))}
        </div>
        <span className="muted chat-hint">
          {mode === "replay" ? "Saved model replies. Free and offline." : "The real model (about 10 s per reply)."}
        </span>
        <span className="grow" />
        <button className="tool-button" onClick={newChat}>New chat</button>
      </div>

      <div className="chat-log">
        {messages.length === 0 && (
          <p className="muted chat-empty">
            {mode === "replay" ? "Pick a saved reply and press Play." : "Ask for something with a screen: “a tip calculator”, “a packing list for a beach trip”…"}
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? <div key={m.id} className="chat-user">{m.text}</div>
            : <AssistantMessage key={m.id} reply={m.reply} onAsk={mode === "claude" ? ask : undefined} />
        )}
        <div ref={end} />
      </div>

      <form className="chat-composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {mode === "replay" ? (
          <select className="p-select" value={replay} onChange={(e) => setReplay(e.target.value)} aria-label="Saved reply">
            {replies.length === 0 && <option value="">No saved replies (is the server running?)</option>}
            {replies.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <input className="p-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message" aria-label="Message" />
        )}
        {busy ? (
          // Own keys: the stream can end inside this click, and React must not turn this very element
          // into the submit button before the browser finishes the click (that would send again).
          <button key="stop" type="button" className="tool-button" onClick={(e) => { e.preventDefault(); abort.current?.abort(); }}>Stop</button>
        ) : (
          <button key="send" type="submit" className="tool-button primary" disabled={mode === "replay" ? !replay : !draft.trim()}>
            {mode === "replay" ? "Play" : "Send"}
          </button>
        )}
      </form>
    </div>
  );
}
