// Runs INSIDE the sandbox: a Valdi Worker, which is its own JavaScript context on its own thread.
// The shared Prism runtime (and so the AI's compiled code) lives only here. It cannot reach the
// drawing code's objects; it only talks through messages:
//   in:  { id, op: "load" | "event" | "unload" | "setLibrary", args: [...] }   (strings only)
//   out: { id, out: "<runtime output JSON>" }
import { PRISM_RUNTIME_JS } from 'prism_core/src/PrismRuntimeSource';

declare const postMessage: (data: unknown) => void;
declare let onmessage: (event: { data: unknown }) => void;

// Start the runtime once in this context. It sets globalThis.prism.
new Function(PRISM_RUNTIME_JS)();
const prism = (globalThis as any).prism;

onmessage = (event) => {
  const msg = event.data as { id: number; op: string; args: (string | undefined)[] };
  let out: string;
  try {
    if (msg.op === 'load') out = prism.load(msg.args[0], msg.args[1], msg.args[2]);
    else if (msg.op === 'event') out = prism.event(msg.args[0], msg.args[1], msg.args[2]);
    else if (msg.op === 'unload') out = prism.unload(msg.args[0]);
    // A newer part library from the app's server; the runtime ignores older or broken code.
    else if (msg.op === 'setLibrary') out = JSON.stringify({ tree: null, state: {}, effects: [], errors: [], library: prism.setLibrary(msg.args[0]) });
    else out = JSON.stringify({ tree: null, state: {}, effects: [], errors: [{ node: 'root', message: `unknown op ${msg.op}` }] });
  } catch (e) {
    out = JSON.stringify({ tree: null, state: {}, effects: [], errors: [{ node: 'root', message: String(e) }] });
  }
  postMessage({ id: msg.id, out });
};
