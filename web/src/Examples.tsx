import { useState } from "react";
import examplesJson from "../../core/dist/examples.json";
import { PrismWidget } from "./Widget";
import type { Example } from "./types";

// The example screens (core/examples). Each has its own page, #/example/<id>, used by the
// Playground and the web tests; the Components page is where people browse the parts.
export const examples = examplesJson as unknown as Example[];

export function ExampleScreen({ id }: { id: string }) {
  const ex = examples.find((e) => e.id === id);
  const [showSource, setShowSource] = useState(false);
  const [round, setRound] = useState(0); // bump to load again
  if (!ex) return <p className="muted">No example called “{id}”.</p>;
  return (
    <div className="screen">
      <div className="toolbar">
        <a href="#/components">‹ Components</a>
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
