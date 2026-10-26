// A small MCP server (stdio) with Prism's show_screen tool, to try tool mode with any MCP client.
//   claude -p "Make a tip calculator" --system-prompt "$(cat dist/prompt-tool.md)" \
//     --mcp-config '{"mcpServers":{"prism":{"command":"node","args":["scripts/mcp-server.mjs"]}}}'
// Set PRISM_TOOL_LOG to a file to log each call and its result.
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

const { prismTool, handleToolCall } = await import("../compiler/tool.js");
const LOG = process.env.PRISM_TOOL_LOG;
let calls = 0;

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
createInterface({ input: process.stdin }).on("line", (line) => {
  let req;
  try { req = JSON.parse(line); } catch { return; }
  const { id, method, params } = req;
  if (method === "initialize") {
    send({ jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "prism", version: "0.1.0" } } });
  } else if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools: [prismTool("mcp")] } });
  } else if (method === "tools/call") {
    const { envelope, result } = handleToolCall(params.arguments, { id: `call_${++calls}` });
    if (LOG) appendFileSync(LOG, JSON.stringify({ code: params.arguments?.code, ok: envelope?.ok, uses: envelope?.uses, result }) + "\n");
    send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: result }], isError: !envelope?.ok } });
  } else if (id !== undefined) {
    send({ jsonrpc: "2.0", id, result: {} });
  }
});
