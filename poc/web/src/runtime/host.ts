// Main-thread side of the runtime. It never runs AI code itself: it only sends strings to the sandbox
// (sandbox.ts: hidden iframe → worker). If a call hangs (the runtime's own step limit should stop loops
// first), the sandbox is replaced: the widget that hung is set aside, every other widget loads again.
import { createSandbox } from "./sandbox";

const TIMEOUT_MS = 3000;

type Op = "load" | "event" | "unload" | "debugHang";
type Pending = { instanceId: string; resolve: (out: string | null) => void; timer: ReturnType<typeof setTimeout> };

class RuntimeHost {
  private frame: HTMLIFrameElement | null = null;
  private port: Promise<MessagePort> | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private restartListeners = new Set<() => void>();
  private stopListeners = new Map<string, () => void>();

  /** Starts the sandbox on first use, so importing this file never touches the page. */
  private ready(): Promise<MessagePort> {
    if (!this.port) {
      const box = createSandbox();
      this.frame = box.frame;
      this.port = box.port.then((port) => {
        port.onmessage = (e: MessageEvent<{ id: number; out: string }>) => this.answer(e.data.id, e.data.out);
        return port;
      });
    }
    return this.port;
  }

  private answer(id: number, out: string | null) {
    const call = this.pending.get(id);
    if (!call) return;
    clearTimeout(call.timer);
    this.pending.delete(id);
    call.resolve(out);
  }

  private timedOut(id: number) {
    const stuck = this.pending.get(id);
    if (!stuck) return;
    console.warn(`[prism] ${stuck.instanceId} did not answer in ${TIMEOUT_MS} ms; replacing the sandbox`);
    // Every call in flight dies with the old sandbox. Answer them with null: "nothing new to draw".
    for (const callId of [...this.pending.keys()]) this.answer(callId, null);
    this.port?.then((port) => port.close());
    this.frame?.remove();
    this.frame = null;
    this.port = null;
    this.stopListeners.get(stuck.instanceId)?.();
    this.restartListeners.forEach((fn) => fn());
  }

  private call(instanceId: string, op: Op, args: (string | undefined)[]): Promise<string | null> {
    const id = ++this.seq;
    return new Promise((resolve) => {
      // The clock starts now, so a sandbox that never starts also counts as hung.
      const timer = setTimeout(() => this.timedOut(id), TIMEOUT_MS);
      this.pending.set(id, { instanceId, resolve, timer });
      this.ready().then((port) => this.pending.has(id) && port.postMessage({ id, op, args }));
    });
  }

  /** Each answer is the runtime's output JSON, or null when the sandbox was replaced mid-call. */
  load(instanceId: string, envelopeJson: string, savedStateJson?: string) {
    return this.call(instanceId, "load", [instanceId, envelopeJson, savedStateJson]);
  }
  event(instanceId: string, handlerId: string, valueJson?: string) {
    return this.call(instanceId, "event", [instanceId, handlerId, valueJson]);
  }
  unload(instanceId: string) {
    return this.call(instanceId, "unload", [instanceId]);
  }
  /** Test hook (dev only): makes the sandbox hang as if this widget's code never returned. */
  debugHang(instanceId: string) {
    return this.call(instanceId, "debugHang", []);
  }

  /** Widgets use this to load themselves again after the sandbox was replaced. */
  onRestart(fn: () => void) {
    this.restartListeners.add(fn);
    return () => void this.restartListeners.delete(fn);
  }
  /** Called when this widget is the one that hung. */
  onStop(instanceId: string, fn: () => void) {
    this.stopListeners.set(instanceId, fn);
    return () => void this.stopListeners.delete(instanceId);
  }
}

export const runtime = new RuntimeHost();

if (import.meta.env.DEV) (window as unknown as { __prismRuntime: RuntimeHost }).__prismRuntime = runtime;
