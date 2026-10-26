// One Prism widget on screen: loads the envelope into the sandboxed runtime, draws the tree, sends events back.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runtime } from "./runtime/host";
import { ImagesContext, Node } from "./Drawer";
import { useToast } from "./Toast";
import type { Effect, Envelope, Output } from "./types";

let nextInstance = 1;

/** The only things a widget may ask the page to do. */
function runEffects(effects: Effect[], toast: (m: string) => void, onAsk?: (text: string) => void) {
  for (const e of effects) {
    const value = String(e.value ?? "");
    if (e.type === "toast") toast(value);
    else if (e.type === "open" && /^https?:\/\//i.test(value)) window.open(value, "_blank", "noopener");
    else if (e.type === "copy")
      navigator.clipboard?.writeText(value).then(() => toast("Copied"), () => toast("Could not copy"));
    else if (e.type === "ask") (onAsk ? onAsk(value) : toast(`Would ask AI: ${value}`));
    // A Confirm the user allowed. A real app runs its own action here; this page only shows it.
    else if (e.type === "action") {
      try { const a = JSON.parse(value) as { name: string }; toast(`The app would now run “${a.name}”`); } catch { /* not ours */ }
    }
  }
}

type WidgetProps = {
  envelope: Envelope;
  onOutput?: (o: Output) => void;
  /** The `ask` effect: send this text as the next chat message. Without it, it shows as a toast. */
  onAsk?: (text: string) => void;
};

export function PrismWidget({ envelope, onOutput, onAsk }: WidgetProps) {
  const toast = useToast();
  const [out, setOut] = useState<Output | null>(null);
  const [stopped, setStopped] = useState(false);
  const [generation, setGeneration] = useState(0); // bumped by "Load again"
  const instanceId = useMemo(() => `${envelope.id}#${nextInstance++}`, [envelope, generation]); // eslint-disable-line react-hooks/exhaustive-deps
  const savedState = useRef<string | undefined>(undefined);
  const alive = useRef(true);

  const apply = useCallback(
    (json: string | null) => {
      if (!alive.current || json === null) return; // null: the sandbox was replaced mid-call
      const o = JSON.parse(json) as Output;
      if (o.errors.length) console.warn(`[prism] ${instanceId}`, o.errors);
      if (o.tree) savedState.current = JSON.stringify(o.state);
      setOut(o);
      onOutput?.(o);
      runEffects(o.effects, toast, onAsk);
    },
    [instanceId, onOutput, onAsk, toast]
  );

  useEffect(() => {
    if (!envelope.ok) return;
    alive.current = true;
    savedState.current = undefined;
    const envJson = JSON.stringify(envelope);
    runtime.load(instanceId, envJson).then(apply);
    // This widget hung: set it aside until the user asks to load it again.
    const offStop = runtime.onStop(instanceId, () => {
      alive.current = false;
      setStopped(true);
    });
    // Another widget hung and the sandbox was replaced: load again with the last good state.
    const offRestart = runtime.onRestart(() => {
      if (alive.current) runtime.load(instanceId, envJson, savedState.current).then(apply);
    });
    return () => {
      alive.current = false;
      offStop();
      offRestart();
      runtime.unload(instanceId);
    };
  }, [instanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    (handlerId: string, value?: unknown) =>
      void runtime.event(instanceId, handlerId, value === undefined ? undefined : JSON.stringify(value)).then(apply),
    [instanceId, apply]
  );

  if (stopped)
    return (
      <div className="prism-stopped" role="alert">
        <span>This screen stopped responding.</span>
        <button className="tool-button" onClick={() => { setStopped(false); setOut(null); setGeneration((g) => g + 1); }}>
          Load again
        </button>
      </div>
    );
  if (!envelope.ok || (out && !out.tree)) return <pre className="fallback">{envelope.fallback}</pre>;
  if (!out?.tree) return null;
  return (
    <div className="prism-widget" data-instance={instanceId}>
      <ImagesContext.Provider value={envelope.appData?.images ?? {}}>
        <Node node={out.tree} send={send} />
      </ImagesContext.Provider>
    </div>
  );
}
