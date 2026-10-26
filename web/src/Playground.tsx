// Write or paste prism code (or a whole Markdown AI reply) and see what the app would show, live.
// The compiler's notes and the technical JSON sit under the preview.
import { useCallback, useEffect, useRef, useState } from "react";
import { compile } from "./compile";
import { examples } from "./Examples";
import { PrismWidget } from "./Widget";
import { CodeEditor, JsonView } from "./Highlight";
import type { Envelope, MessagePart, Output } from "./types";

const counter = examples.find((e) => e.id === "02-counter")?.source ?? "<Text>Hello</Text>\n";
const SAMPLE = `Here is a small counter you can try:\n\n\`\`\`prism\n${counter}\`\`\`\n\nTap the buttons to change the number.\n`;

/** How it went, in a few words: for the preview's header. */
function summary(parts: MessagePart[] | null, error: string | null, busy: boolean) {
  if (error) return { kind: "bad", text: "Can't compile" };
  if (!parts) return { kind: "idle", text: busy ? "Compiling…" : "Waiting for code" };
  const envs = parts.filter((p): p is { type: "prism"; envelope: Envelope } => p.type === "prism").map((p) => p.envelope);
  if (envs.length === 0) return { kind: "idle", text: "No screen in this text" };
  if (envs.some((e) => !e.ok)) return { kind: "bad", text: "Refused: shows the plain-text backup" };
  const warnings = envs.reduce((n, e) => n + e.diagnostics.length, 0);
  return warnings ? { kind: "warn", text: `${warnings} warning${warnings === 1 ? "" : "s"}, fixed by the compiler` }
    : { kind: "good", text: "Compiled cleanly" };
}

type View = "preview" | "envelope" | "tree";
const VIEWS: { id: View; label: string; hint: string }[] = [
  { id: "preview", label: "Preview", hint: "What the person sees" },
  { id: "envelope", label: "Envelope", hint: "The JSON message your server sends to the app" },
  { id: "tree", label: "Screen tree", hint: "The blocks the app draws, updated live as you tap the preview" },
];

/** A JSON view with a title and a Copy button. */
function JsonPanel({ title, value, className }: { title: string; value: unknown; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(JSON.stringify(value, null, 2)).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  });
  return (
    <div className="pg-json">
      <div className="pg-json-head">
        <span>{title}</span>
        <span className="grow" />
        <button className="tool-button" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <JsonView value={value} className={className} />
    </div>
  );
}

/** One screen. Always mounted, so the screen tree stays live while another tab is showing. */
function Block({ envelope, view, label }: { envelope: Envelope; view: View; label: string }) {
  const [out, setOut] = useState<Output | null>(null);
  return (
    <div className="pg-block">
      <div className="pg-phone" hidden={view !== "preview"}>
        <PrismWidget envelope={envelope} onOutput={setOut} />
      </div>
      {view === "preview" && envelope.diagnostics.length > 0 && (
        <ul className="diagnostics">
          {envelope.diagnostics.map((d, i) => (
            <li key={i} className={d.level}>
              {d.line != null && <b>Line {d.line}: </b>}{d.message}
            </li>
          ))}
        </ul>
      )}
      <div hidden={view !== "envelope"}><JsonPanel title={label} value={envelope} /></div>
      <div hidden={view !== "tree"}>
        <JsonPanel title={label} value={out ? out.tree : "(not drawn yet)"} className="tree-json" />
      </div>
    </div>
  );
}

export function Playground() {
  const [input, setInput] = useState(SAMPLE);
  const [parts, setParts] = useState<MessagePart[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("preview");
  const latest = useRef(0);
  const [split, setSplit] = useState(70); // the code's share of the width, in %
  const [dragging, setDragging] = useState(false);
  const grid = useRef<HTMLDivElement>(null);
  const moveSplit = (x: number) => {
    const box = grid.current?.getBoundingClientRect();
    if (box) setSplit(Math.min(80, Math.max(30, ((x - box.left) / box.width) * 100)));
  };

  const run = useCallback(async (text: string) => {
    const mine = ++latest.current; // only the newest compile wins
    if (!text.trim()) { setParts(null); setError(null); return; }
    setBusy(true);
    try {
      const isMessage = /```prism/.test(text);
      const result = await compile(isMessage ? { message: text } : { source: text, id: "playground" });
      if (mine !== latest.current) return;
      setParts(Array.isArray(result) ? result : [{ type: "prism", envelope: result }]);
      setError(null);
      setRound((r) => r + 1);
    } catch (e) {
      if (mine === latest.current) setError(String((e as Error).message || e));
    } finally {
      if (mine === latest.current) setBusy(false);
    }
  }, []);

  // Live preview: compile half a second after typing stops.
  useEffect(() => {
    const t = setTimeout(() => void run(input), 500);
    return () => clearTimeout(t);
  }, [input, run]);

  // Lines the compiler flagged, to mark in the editor's margin. In a Markdown reply the numbers
  // are counted inside each block, so they're shifted by where the block starts.
  const marks: number[] = [];
  if (parts) {
    const starts: number[] = [];
    input.split("\n").forEach((line, i) => { if (/^```prism/.test(line)) starts.push(i + 1); });
    let block = 0;
    for (const part of parts) {
      if (part.type !== "prism") continue;
      const offset = starts.length ? starts[block] ?? 0 : 0;
      for (const d of part.envelope.diagnostics) if (d.line != null) marks.push(d.line + offset);
      block++;
    }
  }

  const loadExample = (id: string) => {
    const ex = examples.find((e) => e.id === id);
    if (ex) setInput(ex.source);
  };
  const state = summary(parts, error, busy);

  return (
    <div className="pg">
      <div className="pg-head">
        <h1>Playground</h1>
        <p>Write or paste prism code, or a whole AI reply with <code>```prism</code> blocks. The preview updates as you type.</p>
      </div>
      <div className="pg-grid" ref={grid}
        style={{ gridTemplateColumns: `minmax(0, ${split}fr) 1px minmax(0, ${100 - split}fr)` }}>
        <section className="pg-panel pg-editor" aria-label="Code"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void run(input); } }}>
          <div className="pg-panel-head">
            <span className="pg-panel-title">Code</span>
            <span className="grow" />
            <select className="p-select pg-examples" aria-label="Load an example" value="" onChange={(e) => loadExample(e.target.value)}>
              <option value="" disabled>Load an example…</option>
              {examples.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
            </select>
            <button className="tool-button" onClick={() => setInput("")}>Clear</button>
            <button className="tool-button" onClick={() => void run(input)} title="Compile now (⌘ Enter)">Compile</button>
          </div>
          <CodeEditor value={input} onChange={setInput} label="Prism code or a whole AI reply" marks={marks} />
        </section>
        <div className={dragging ? "pg-divider is-dragging" : "pg-divider"} role="separator" aria-orientation="vertical"
          aria-label="Resize the code and preview" aria-valuenow={Math.round(split)} aria-valuemin={30} aria-valuemax={80}
          tabIndex={0}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); }}
          onPointerMove={(e) => { if (dragging) moveSplit(e.clientX); }}
          onPointerUp={() => setDragging(false)}
          onDoubleClick={() => setSplit(70)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setSplit((s) => Math.max(30, s - 5));
            if (e.key === "ArrowRight") setSplit((s) => Math.min(80, s + 5));
          }} />
        <section className="pg-panel pg-result" aria-label="Preview" aria-live="polite">
          <div className="pg-panel-head">
            <div className="segmented pg-tabs" role="tablist" aria-label="What to show">
              {VIEWS.map((v) => (
                <button key={v.id} role="tab" aria-selected={view === v.id} className={view === v.id ? "on" : ""}
                  title={v.hint} onClick={() => setView(v.id)}>{v.label}</button>
              ))}
            </div>
            <span className="grow" />
            <span className={`pg-status pg-status-${state.kind}`}>{state.text}</span>
          </div>
          <div className="pg-result-body">
            {error && <p className="error">{error}</p>}
            {!parts && !error && <p className="pg-empty">Write some prism code on the left, or load an example.</p>}
            <div className="pg-parts" key={round}>
              {view !== "preview" && <p className="pg-hint">{VIEWS.find((v) => v.id === view)?.hint}.</p>}
              {parts?.map((part, i) =>
                part.type === "markdown" ? (
                  view === "preview" && <p key={i} className="pg-prose">{part.text}</p>
                ) : (
                  <Block key={i} envelope={part.envelope} view={view}
                    label={`Screen ${parts.slice(0, i + 1).filter((p) => p.type === "prism").length}`} />
                )
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
