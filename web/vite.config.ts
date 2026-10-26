import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

const coreDir = fileURLToPath(new URL("../core", import.meta.url));
const compilerUrl = pathToFileURL(fileURLToPath(new URL("../core/compiler/index.js", import.meta.url))).href;

// Serves POST /api/compile so the Playground can compile on the "server" (the dev server).
// Body: { source } -> envelope, or { message } -> [parts].
function compileApi(): Plugin {
  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end();
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    try {
      const { compile, compileMessage } = await import(/* @vite-ignore */ compilerUrl);
      const payload = JSON.parse(body || "{}");
      const result =
        typeof payload.message === "string"
          ? compileMessage(payload.message, { messageId: payload.id || "msg" })
          : compile(String(payload.source ?? ""), { id: payload.id || "playground" });
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: String((e as Error)?.message || e) }));
    }
  };
  return {
    name: "prism-compile-api",
    configureServer(server) {
      server.middlewares.use("/api/compile", handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/compile", handler);
    },
  };
}

// The chat server (server/, port 8787) has no CORS headers, so the page reaches it through this proxy.
const chatProxy = Object.fromEntries(
  ["/chat", "/replies", "/health"].map((path) => [path, { target: process.env.PRISM_CHAT_SERVER || "http://localhost:8787" }])
);

export default defineConfig({
  base: "./", // relative paths so Electron can load the built files
  plugins: [react(), compileApi()],
  server: { fs: { allow: [".", coreDir] }, proxy: chatProxy },
  preview: { proxy: chatProxy },
});
