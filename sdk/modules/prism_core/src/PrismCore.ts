// prism_core: runs the shared Prism runtime (core/runtime/prism-runtime.js) inside the app's
// JavaScript engine, and gives the rest of the app three typed calls.
//
//   prismLoad(id, envelopeJson)    show a block            -> PrismOutput (the screen tree)
//   prismEvent(id, handler, value)  the user did something  -> PrismOutput (the new tree)
//   prismUnload(id)                 the block went away
//
// The runtime speaks only in strings (JSON in, JSON out), so the same file works on every
// platform. This module turns those strings into typed objects.
import { PRISM_RUNTIME_JS } from './PrismRuntimeSource';

/** One part of the screen tree (CLIENTS.md section 2). */
export interface PrismNode {
  /** Part name from the catalog: "Card", "Button"... */
  t: string;
  /** Node id from the compiler. Repeats inside lists, so identity is id + k. */
  id: string;
  /** List key, for items in a list. */
  k?: string | number;
  /** Props: complete and checked by the runtime. */
  p?: { [name: string]: any };
  /** Children: other nodes, or plain text. */
  c?: (PrismNode | string)[];
  /** Event name -> handler id to send back: { press: "h0" }. */
  on?: { [event: string]: string };
}

/** Something the screen asks the app to do outside itself. */
export interface PrismEffect {
  type: string; // "toast" | "open" | "copy" | "ask"
  value: string;
}

/** Sends an event back to the runtime: the handler id from node.on, and a value for inputs. */
export type PrismSend = (handlerId: string, value?: unknown) => void;

/** What the runtime returns after every load and event. */
export interface PrismOutput {
  tree: PrismNode | null;
  state: { [name: string]: any };
  effects: PrismEffect[];
  errors: { node: string; message: string }[];
}

interface PrismRuntime {
  load(instanceId: string, envelopeJson: string, savedStateJson?: string): string;
  event(instanceId: string, handlerId: string, valueJson?: string): string;
  unload(instanceId: string): string;
}

let runtime: PrismRuntime | undefined;

/** Starts the runtime once per JS engine. It puts one object, `prism`, on the global scope. */
function getRuntime(): PrismRuntime {
  if (!runtime) {
    const g = globalThis as any;
    if (!g.prism) new Function(PRISM_RUNTIME_JS)();
    runtime = g.prism as PrismRuntime;
  }
  return runtime;
}

function failure(message: string): PrismOutput {
  return { tree: null, state: {}, effects: [], errors: [{ node: 'root', message }] };
}

function parseOutput(json: string): PrismOutput {
  const o = JSON.parse(json);
  return {
    tree: o.tree ?? null,
    state: o.state ?? {},
    effects: Array.isArray(o.effects) ? o.effects : [],
    errors: Array.isArray(o.errors) ? o.errors : [],
  };
}

/** Shows a block. `savedStateJson` brings back state saved from an earlier session. */
export function prismLoad(instanceId: string, envelopeJson: string, savedStateJson?: string): PrismOutput {
  try {
    return parseOutput(getRuntime().load(instanceId, envelopeJson, savedStateJson));
  } catch (e) {
    return failure(`load failed: ${String(e)}`);
  }
}

/** The user did something: tapped (no value) or changed an input (with its new value). */
export function prismEvent(instanceId: string, handlerId: string, value?: unknown): PrismOutput {
  try {
    const valueJson = value === undefined ? undefined : JSON.stringify(value);
    return parseOutput(getRuntime().event(instanceId, handlerId, valueJson));
  } catch (e) {
    return failure(`event failed: ${String(e)}`);
  }
}

/** The block is no longer on screen: free its state. */
export function prismUnload(instanceId: string): void {
  try {
    getRuntime().unload(instanceId);
  } catch (e) {
    // Nothing to do: the block is gone anyway.
  }
}
