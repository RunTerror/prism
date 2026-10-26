// Paste a raw prism block or a whole Markdown AI reply, compile it, and see everything the client sees.
import { useState } from "react";
import { compile } from "./compile";
import { examples } from "./Examples";
import { PrismWidget } from "./Widget";
import type { Envelope, MessagePart, Output } from "./types";

const counter = examples.find((e) => e.id === "02-counter")?.source ?? "<Text>Hello</Text>\n";
const SAMPLE = `Here is a small counter you can try:\n\n\`\`\`prism\n${counter}\`\`\`\n\nTap the buttons to change the number.\n`;

function Block({ envelope }: { envelope: Envelope }) {
  const [out, setOut] = useState<Output | null>(null);
  return (
    <div className="block">
      <PrismWidget envelope={envelope} onOutput={setOut} />
      <h4>Diagnostics</h4>
      {envelope.diagnostics.length === 0 ? (
        <p className="muted">None</p>
      ) : (
        <ul className="diagnostics">
          {envelope.diagnostics.map((d, i) => (
            <li key={i} className={d.level}>
              <b>{d.level}</b>
              {d.line != null && ` line ${d.line}`}: {d.message}
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>Envelope JSON</summary>
        <pre className="code">{JSON.stringify(envelope, null, 2)}</pre>
      </details>
      <details open>
        <summary>Screen tree JSON</summary>
        <pre className="code tree-json">{out ? JSON.stringify(out.tree, null, 2) : "(not loaded)"}</pre>
      </details>
    </div>
  );
}

export function Playground() {
  const [input, setInput] = useState(SAMPLE);
  const [parts, setParts] = useState<MessagePart[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const isMessage = /```prism/.test(input);
      const result = await compile(isMessage ? { message: input } : { source: input, id: "playground" });
      setParts(Array.isArray(result) ? result : [{ type: "prism", envelope: result }]);
      setRound((r) => r + 1);
    } catch (e) {
      setError(String((e as Error).message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <p className="muted">Paste a raw prism block, or a whole Markdown reply with ```prism blocks.</p>
      <textarea className="editor" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
      <div className="toolbar">
        <button className="tool-button primary" onClick={run} disabled={busy}>
          {busy ? "Compiling…" : "Compile"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="results" key={round}>
        {parts?.map((part, i) =>
          part.type === "markdown" ? (
            <pre key={i} className="markdown">{part.text}</pre>
          ) : (
            <Block key={i} envelope={part.envelope} />
          )
        )}
      </div>
    </div>
  );
}
