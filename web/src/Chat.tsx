// The chat: a message goes to the dev server, the reply streams back as text and live Prism widgets.
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { listReplies, streamChat, type ChatEvent, type ChatRequest, type SavedReply } from "./chatStream";
import { PrismWidget } from "./Widget";
import { Mark } from "./Mark";
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

/** "haiku-slim-a.md" -> "Claude Haiku, run A": which saved test run a reply comes from. */
function runLabel(file: string) {
  if (file === "showcase.md") return "Showcase (Claude Haiku)";
  const m = file.match(/^haiku-.*-([a-z])\.md$/);
  return m ? `Claude Haiku, run ${m[1].toUpperCase()}` : file.replace(/\.md$/, "");
}

// Starting points for Claude mode: each asks for something a screen answers well.
const PROMPTS = [
  "Split a ₹2,400 dinner between 3 people with a 10% tip",
  "Quiz me on the planets",
  "How does a web browser load a page?",
  "Help me pick a phone plan",
  "A packing list for a beach weekend",
  "Compare renting and buying a home",
];

const SendIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const PlayIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>;
const StopIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></svg>;

/** onAsk is left out in Replay mode: the widget then shows its question as a toast. */
function AssistantMessage({ reply, onAsk }: { reply: Reply; onAsk?: (text: string) => void }) {
  return (
    <div className="chat-turn">
    <Mark className="chat-avatar" />
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
    </div>
  );
}

// ---------- The chat ----------

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"claude" | "replay">("replay");
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [replay, setReplay] = useState("");
  const [conversation, setConversation] = useState(newConversation);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const busy = messages.some((m) => m.role === "assistant" && m.reply.streaming);

  useEffect(() => {
    listReplies().then((list) => {
      setReplies(list);
      setReplay((r) => r || list[0]?.id || "");
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

  const play = (id: string) => send(replies.find((r) => r.id === id)?.title ?? id, { mode: "replay", replay: id });

  function submit() {
    if (mode === "replay") play(replay);
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
        <span className="grow" />
        <button className="tool-button" onClick={newChat}>New chat</button>
      </div>

      <div className="chat-log">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <Mark className="chat-welcome-mark" />
            <h1>Answers with screens</h1>
            <p>
              {mode === "replay" ? "Play a real AI answer saved earlier. Free, and works offline."
                : "Ask the real AI for something a screen helps with. A reply takes about 10 seconds."}
            </p>
            <div className="chat-cards">
              {mode === "replay"
                // The showcase answers first (the ones in the README videos), then the rest.
                ? [...replies.filter((r) => r.id.startsWith("showcase")), ...replies.filter((r) => !r.id.startsWith("showcase"))].slice(0, 6).map((r) => (
                  <button key={r.id} className="chat-card" onClick={() => { setReplay(r.id); play(r.id); }}>{r.title}</button>
                ))
                : PROMPTS.map((t) => (
                  <button key={t} className="chat-card" onClick={() => send(t, { mode: "claude", message: t, conversation })}>{t}</button>
                ))}
            </div>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? <div key={m.id} className="chat-user">{m.text}</div>
            : <AssistantMessage key={m.id} reply={m.reply} onAsk={mode === "claude" ? ask : undefined} />
        )}
        <div ref={end} />
      </div>

      <form className="chat-composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="chat-box">
          {mode === "replay" ? (
            <select className="chat-field" value={replay} onChange={(e) => setReplay(e.target.value)} aria-label="Saved reply">
              {replies.length === 0 && <option value="">No saved replies (is the server running?)</option>}
              {/* Grouped by the test run that wrote them: the same request can have two answers. */}
              {[...new Set(replies.map((r) => r.id.split("#")[0]))].map((file) => (
                <optgroup key={file} label={runLabel(file)}>
                  {replies.filter((r) => r.id.startsWith(file + "#")).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </optgroup>
              ))}
            </select>
          ) : (
            <input className="chat-field" value={draft} onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask for something with a screen…" aria-label="Message" />
          )}
          {busy ? (
            // Own keys: the stream can end inside this click, and React must not turn this very element
            // into the submit button before the browser finishes the click (that would send again).
            <button key="stop" type="button" className="chat-send is-stop" aria-label="Stop" title="Stop"
              onClick={(e) => { e.preventDefault(); abort.current?.abort(); }}><StopIcon /></button>
          ) : (
            <button key="send" type="submit" className="chat-send" aria-label={mode === "replay" ? "Play" : "Send"}
              title={mode === "replay" ? "Play" : "Send"} disabled={mode === "replay" ? !replay : !draft.trim()}>
              {mode === "replay" ? <PlayIcon /> : <SendIcon />}
            </button>
          )}
        </div>
        <p className="chat-foot">
          {mode === "replay" ? "Replay: saved answers from Claude Haiku, no AI needed." : "Claude: live answers through the dev server on this computer."}
        </p>
      </form>
    </div>
  );
}
