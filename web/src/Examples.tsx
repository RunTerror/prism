import { useState } from "react";
import examplesJson from "../../core/dist/examples.json";
import { PrismWidget } from "./Widget";
import type { Example } from "./types";

export const examples = examplesJson as unknown as Example[];

export function Gallery() {
  return (
    <div className="list">
      {examples.map((ex) => (
        <a key={ex.id} className="list-item" href={`#/example/${ex.id}`} data-example={ex.id}>
          <span>{ex.title}</span>
          <span className="muted">{ex.id} ›</span>
        </a>
      ))}
    </div>
  );
}

export function ExampleScreen({ id }: { id: string }) {
  const ex = examples.find((e) => e.id === id);
  const [showSource, setShowSource] = useState(false);
  const [round, setRound] = useState(0); // bump to load again
  if (!ex) return <p className="muted">No example called “{id}”.</p>;
  return (
    <div className="screen">
      <div className="toolbar">
        <a href="#/">‹ Gallery</a>
        <strong>{ex.title}</strong>
        <span className="grow" />
        <label className="toggle">
          <input type="checkbox" checked={showSource} onChange={(e) => setShowSource(e.target.checked)} /> Source
        </label>
        <button className="tool-button" onClick={() => setRound((r) => r + 1)}>Reset</button>
      </div>
      <PrismWidget key={round} envelope={ex.envelope} />
      {showSource && <pre className="code">{ex.source}</pre>}
    </div>
  );
}
