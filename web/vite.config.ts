import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const coreDir = fileURLToPath(new URL("../core", import.meta.url));

// The chat server (server/, port 8787) has no CORS headers, so the page reaches it through this proxy.
const chatProxy = Object.fromEntries(
  ["/chat", "/replies", "/health"].map((path) => [path, { target: process.env.PRISM_CHAT_SERVER || "http://localhost:8787" }])
);

export default defineConfig({
  base: "./", // relative paths so Electron can load the built files
  plugins: [react()],
  // The Playground runs the compiler (core/compiler) in the page. Its one Node-only file, load.js
  // (reads the JSON files, loads the runtime), is swapped for the page version.
  resolve: {
    alias: [{ find: /^\.\/load\.js$/, replacement: fileURLToPath(new URL("../core/compiler/load.browser.js", import.meta.url)) }],
  },
  server: { fs: { allow: [".", coreDir] }, proxy: chatProxy },
  preview: { proxy: chatProxy },
});
