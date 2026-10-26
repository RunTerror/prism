// Runs after prism-runtime.js inside the sandbox worker (sandbox.ts joins the two into one blob).
// Plain JavaScript on purpose: it is loaded as text, not bundled.
/* global prism */
"use strict";

// Extra safety: the sandbox's CSP already blocks the network; also remove the doors themselves.
for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches"]) {
  try {
    Object.defineProperty(self, name, { value: undefined, configurable: false, writable: false });
  } catch (e) {
    /* some engines don't allow it; the compiler already blocks these names */
  }
}

// The first message carries the port to the page. Every call after that comes through the port.
self.onmessage = (first) => {
  self.onmessage = null;
  const port = first.data && first.data.port;
  if (!port) return;
  port.onmessage = (e) => {
    const { id, op, args } = e.data;
    if (op === "debugHang") for (;;) {} // dev-only test hook: a call that never answers
    let out;
    try {
      out = prism[op].apply(null, args);
    } catch (err) {
      out = JSON.stringify({ tree: null, state: {}, effects: [], errors: [{ node: "root", message: String(err) }] });
    }
    port.postMessage({ id, out });
  };
};
