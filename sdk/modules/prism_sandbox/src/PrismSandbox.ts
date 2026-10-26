// prism_sandbox: runs the AI's code in its own locked JavaScript context (a Valdi Worker), away
// from the drawing code. Same three calls as prism_core, but async:
// the request goes to the worker as a message and the screen tree comes back as a message.
//
//   await sandboxLoad(id, envelopeJson)     -> PrismOutput
//   await sandboxEvent(id, handler, value)  -> PrismOutput
//   sandboxUnload(id)
//
// One worker is shared by every widget; each widget is an "instance" inside it.
// Messages are handled in order, so taps are applied in the order they happened.
import Worker from 'worker/src/Worker';
import { withGlobalNativeRefs } from 'valdi_core/src/NativeReferences';
import { PrismOutput } from 'prism_core/src/PrismCore';

let worker: Worker | undefined;
let nextId = 1;
const waiting: { [id: number]: (out: PrismOutput) => void } = {};

function parseOutput(json: string): PrismOutput {
  try {
    const o = JSON.parse(json);
    return {
      tree: o.tree ?? null,
      state: o.state ?? {},
      effects: Array.isArray(o.effects) ? o.effects : [],
      errors: Array.isArray(o.errors) ? o.errors : [],
    };
  } catch (e) {
    return { tree: null, state: {}, effects: [], errors: [{ node: 'root', message: `bad output: ${String(e)}` }] };
  }
}

/**
 * The shared worker, started on first use.
 *
 * Created under Valdi's GLOBAL native references: by default Valdi ties a JS callback given to
 * native code (here `onmessage`) to the component that created it, and disposes it when that
 * component goes away. The worker is shared by every widget, so it must not belong to the first
 * one (otherwise every widget opened after the first one closes never gets an answer).
 */
function getWorker(): Worker {
  if (!worker) {
    worker = withGlobalNativeRefs(() => {
      const w = new Worker('prism_sandbox/src/SandboxWorker');
      w.onmessage = (event) => {
        const reply = event.data as { id: number; out: string };
        const resolve = waiting[reply.id];
        delete waiting[reply.id];
        if (resolve) resolve(parseOutput(reply.out));
      };
      return w;
    });
  }
  return worker;
}

function request(op: string, args: (string | undefined)[]): Promise<PrismOutput> {
  const id = nextId++;
  return new Promise((resolve) => {
    waiting[id] = resolve;
    getWorker().postMessage({ id, op, args });
  });
}

/** Shows a block: runs its code in the sandbox and returns the first screen tree. */
export function sandboxLoad(instanceId: string, envelopeJson: string, savedStateJson?: string): Promise<PrismOutput> {
  return request('load', [instanceId, envelopeJson, savedStateJson]);
}

/** The user did something: the sandbox runs the handler and returns the new tree. */
export function sandboxEvent(instanceId: string, handlerId: string, value?: unknown): Promise<PrismOutput> {
  return request('event', [instanceId, handlerId, value === undefined ? undefined : JSON.stringify(value)]);
}

/** The block went away: free its state in the sandbox. */
export function sandboxUnload(instanceId: string): void {
  void request('unload', [instanceId]);
}

/** The library code last sent to the worker, so each version is sent once. */
let sentLibrary: string | undefined;

/**
 * Loads a newer part library (its code, from the app's server) into the sandbox. Sent before the
 * next load, and messages are handled in order, so that load already uses it. The runtime ignores
 * a version that isn't newer than the one it has.
 */
export function sandboxUseLibrary(code: string | undefined): void {
  if (!code || code === sentLibrary) return;
  sentLibrary = code;
  void request('setLibrary', [code]);
}
