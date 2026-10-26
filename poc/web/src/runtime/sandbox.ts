// The hidden sandbox: an iframe with only `allow-scripts`, so it gets its own blank origin
// (no cookies, no storage, no access to the page). Inside it, a Web Worker runs the runtime and the AI code.
// Two locks, but the page is built inline
// (srcdoc), so there is no extra file to host and it works the same in Electron.
import runtimeSource from "../../../core/dist/prism-runtime.js?raw"; // runtime + block specs (npm run build in core)
import workerEntry from "./worker-entry.js?raw";

// Workers made from a blob keep this policy, so AI code can't reach the network either.
const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval'", // inline: this page's own script; eval: the runtime's new Function
  "worker-src blob:",
].join("; ");

// The page's script: wait for the port from the parent, start the worker, hand the port over.
const bootstrap = `
(() => {
  const source = document.getElementById("prism-worker").textContent;
  addEventListener("message", (e) => {
    if (e.source !== parent || !e.data || e.data.type !== "prism-init" || !e.ports[0]) return;
    const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
    const worker = new Worker(url, { name: "prism-runtime" });
    URL.revokeObjectURL(url);
    worker.postMessage({ port: e.ports[0] }, [e.ports[0]]);
  }, { once: true });
})();`;

/** Keeps text safe inside a <script> element. */
const scriptSafe = (s: string) => s.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

const SRCDOC = `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<script type="text/plain" id="prism-worker">${scriptSafe(runtimeSource + "\n;\n" + workerEntry)}</script>
<script>${scriptSafe(bootstrap)}</script>
</head><body></body></html>`;

/** Adds a new hidden sandbox to the page. Resolves with the port to talk to its worker. */
export function createSandbox(): { frame: HTMLIFrameElement; port: Promise<MessagePort> } {
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.title = "Prism execution sandbox";
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.style.display = "none";
  frame.srcdoc = SRCDOC;
  const port = new Promise<MessagePort>((resolve) => {
    frame.addEventListener("load", () => {
      const channel = new MessageChannel();
      // The sandbox has no origin of its own, so "*" is the only target that reaches it.
      // The port goes only to this frame's window.
      frame.contentWindow?.postMessage({ type: "prism-init" }, "*", [channel.port2]);
      resolve(channel.port1);
    }, { once: true });
  });
  document.body.appendChild(frame);
  return { frame, port };
}
