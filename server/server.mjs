// Prism dev server: the "chat backend" for the mobile and web clients.
//
//   GET  /library?blocks=2  { "version": "1.6.0", "code": "…" }: the part library apps load (ARCHITECTURE.md
//                  section 9); version null when the app's drawer is too old for it (VERSIONS.md)
//   POST /chat   { "message": "Make me a tip calculator", "mode": "claude" | "replay" }
//                plus "app": { "blocks": 2, "library": "1.6.0" } (VERSIONS.md): only parts that app can draw
//   -> Server-Sent Events, as the model writes:
//        event: text         {"text": "Here is"}                  normal Markdown, token by token
//        event: block_start  {"id": "msg_1/block_0"}               a ```prism block has started
//        event: block_progress {"id": "...", "lines": 12, "title": "Tip calculator", "parts": ["Card", "Slider"],
//                               "shape": ["Slider", "Slider", "Divider", "Stat"]}
//                                                                  while the block is written (for the loading card)
//        event: block_partial {"id": "...", "envelope": {...}}     the screen so far (open tags closed), a few
//                                                                  times a second while the block is written
//        event: block        {"id": "...", "envelope": {...}}      the block is complete and compiled
//        event: status       {"text": "Searching the web…"}       what the model is doing (no text yet)
//        event: done         {"ms": 8123, "costUsd": 0.004}
//        event: error        {"message": "..."}
//
// Modes:
//   claude  runs the real model through the Claude Code CLI (`claude -p`, your Claude login, no API key).
//           System prompt = server/assistant.md (who the assistant is, when to use screens)
//                         + core/dist/prompt.md (how to write a prism block).
//           Send the same "conversation" id to continue a chat: follow-ups remember earlier messages.
//   replay  streams a reply a model wrote earlier (core/test/ai-replies) at a realistic speed.
//           Free, offline, and always the same: good for testing the clients.
//
//   node server/server.mjs            (from the repo root; PORT=8787, PRISM_MODEL=haiku, PRISM_PACKS=teach,ask,act)
import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { compile, defaultCatalog } from "../core/compiler/index.js";
import { buildPrompt } from "../core/compiler/prompt.js";
import { canUseServerLibrary, libraryFor, serverLibrary } from "../core/compiler/versions.js";
import { partialEnvelope } from "../core/compiler/partial.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = join(HERE, "..", "core");
// PRISM_PACKS=teach,ask turns on only those part packs (catalog.json "packs"); unset = all packs.
const PACKS = process.env.PRISM_PACKS ? process.env.PRISM_PACKS.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
// library: the part library the asking app draws with (VERSIONS.md); the AI only learns its parts.
const SYSTEM_PROMPT = (library) =>
  readFileSync(join(HERE, "assistant.md"), "utf8") + "\n" +
  (PACKS || library ? buildPrompt(defaultCatalog, { packs: PACKS, library }) : readFileSync(join(CORE, "dist", "prompt.md"), "utf8"));
const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.PRISM_MODEL || "haiku";
// The CLI reads memory and CLAUDE.md files from the folder it runs in. Run it in an empty folder
// so the chat assistant never sees this repo or your notes.
const CHAT_DIR = join(tmpdir(), "prism-chat");
mkdirSync(CHAT_DIR, { recursive: true });

// Every reply is saved here (what the model wrote + what the compiler said), to debug bad answers.
const LOG_DIR = join(HERE, "logs");
mkdirSync(LOG_DIR, { recursive: true });

let messageCount = 0;
/** conversation id from the app -> Claude CLI session id, so follow-ups continue the same chat. */
const sessions = new Map();

// ---------------------------------------------------------------- stream splitter

const OPEN = "```prism";
/** How often a partial screen may be sent while a block is written. */
const PARTIAL_MS = 250;
/** Parts that have a shape of their own in the loading preview (layout parts like Stack don't). */
const SHAPE_PARTS = new Set(["Title", "Text", "Slider", "Input", "Select", "Button", "Switch", "Checkbox", "Badge", "Stat",
  "Progress", "Divider", "Callout", "TableRow"]);
/** A line of plain text that starts with a part tag, like `<Button ...` or `</Card>`. */
const STRAY_TAG = /^\s*<\/?[A-Z][A-Za-z]*[\s>\/]/;
const CLOSE = "\n```";

/**
 * Splits a model's streamed text into events: normal text goes out as it arrives; a ```prism block
 * is held back until its closing fence, then compiled and sent as one envelope.
 * Text that might be the start of a fence ("``" at the end of a chunk) is held until it's clear.
 */
export class StreamSplitter {
  /** options: what compile() gets for this app, like { library: "1.4.0" } (packs come from PRISM_PACKS). */
  constructor(messageId, send, options = {}) {
    this.messageId = messageId;
    this.send = send;
    this.compileOptions = { packs: PACKS, ...options };
    this.buffer = "";
    this.inBlock = false;
    this.blockIndex = 0;
  }

  feed(text) {
    this.buffer += text;
    for (;;) {
      if (!this.inBlock) {
        const at = this.buffer.indexOf(OPEN);
        if (at === -1) {
          // Send everything except a tail that could still become "```prism".
          const keep = partialSuffix(this.buffer, OPEN);
          const out = this.buffer.slice(0, this.buffer.length - keep);
          if (out) this.sendText(out);
          this.buffer = this.buffer.slice(out.length);
          return;
        }
        const before = this.buffer.slice(0, at);
        if (before) this.sendText(before);
        // The block's code starts after the rest of the opening line.
        const lineEnd = this.buffer.indexOf("\n", at);
        if (lineEnd === -1) { this.buffer = this.buffer.slice(at); return; } // opening line not finished yet
        this.inBlock = true;
        this.sentLines = -1;
        this.partialAt = 0;
        this.partialCode = "";
        this.blockId = `${this.messageId}/block_${this.blockIndex++}`;
        this.send("block_start", { id: this.blockId });
        this.buffer = this.buffer.slice(lineEnd + 1);
      } else {
        const end = this.buffer.indexOf(CLOSE);
        const startsClosed = this.buffer.startsWith("```"); // empty block
        if (end === -1 && !startsClosed) { this.progress(); return; } // keep collecting the block
        const source = startsClosed ? "" : this.buffer.slice(0, end + 1);
        const after = startsClosed ? 3 : end + CLOSE.length;
        this.buffer = this.buffer.slice(after);
        this.inBlock = false;
        this.send("block", { id: this.blockId, envelope: compile(source, { id: this.blockId, ...this.compileOptions }) });
      }
    }
  }

  /**
   * Plain text out. Screen tags written outside a block (`<Button onPress={...}>Next</Button>` in the
   * Markdown) would show as raw code, so lines that start with a catalog-style tag are held back
   * until the line ends, then dropped. Everything else goes out as it arrives.
   */
  sendText(text) {
    this.line = (this.line ?? "") + text;
    let out = "";
    let nl;
    while ((nl = this.line.indexOf("\n")) !== -1) {
      const line = this.line.slice(0, nl + 1);
      this.line = this.line.slice(nl + 1);
      if (!STRAY_TAG.test(line)) out += line;
    }
    // An unfinished line streams on unless it may be a stray tag.
    if (this.line && !/^\s*(<\/?[A-Za-z]*)?$/.test(this.line) && !STRAY_TAG.test(this.line)) { out += this.line; this.line = ""; }
    if (out) this.send("text", { text: out });
  }

  /** A hint for the loading card: how far along the block is and what it is building. Sent once per new line. */
  progress() {
    const lines = this.buffer.split("\n").length - 1;
    if (lines === this.sentLines) return;
    this.sentLines = lines;
    const parts = [...new Set([...this.buffer.matchAll(/<([A-Z][A-Za-z]*)/g)].map((m) => m[1]))];
    const title = this.buffer.match(/<(?:Card|Title)\b[^>]*?title="([^"]+)"/)?.[1] ?? this.buffer.match(/<Title[^>]*>([^<{]+)</)?.[1]?.trim();
    // The visible parts in the order they are written (repeats kept), for a preview with the right shapes.
    const shape = [...this.buffer.matchAll(/<([A-Z][A-Za-z]*)/g)].map((m) => m[1]).filter((t) => SHAPE_PARTS.has(t)).slice(0, 40);
    this.send("block_progress", { id: this.blockId, lines, parts, shape, ...(title ? { title } : {}) });
    this.partial();
  }

  /** The screen so far, when it compiles cleanly and changed: at most every PARTIAL_MS. */
  partial() {
    const now = Date.now();
    if (now - this.partialAt < PARTIAL_MS) return;
    const env = partialEnvelope(this.buffer, compile, { id: this.blockId, ...this.compileOptions });
    if (!env || env.code === this.partialCode) return;
    this.partialAt = now;
    this.partialCode = env.code;
    this.send("block_partial", { id: this.blockId, envelope: env });
  }

  /** The stream ended: flush held text; an unfinished block is compiled as far as it got. */
  end() {
    if (this.inBlock) {
      this.inBlock = false;
      this.send("block", { id: this.blockId, envelope: compile(this.buffer, { id: this.blockId, ...this.compileOptions }) });
    } else if (this.buffer) {
      this.sendText(this.buffer);
    }
    this.buffer = "";
    if (this.line && !STRAY_TAG.test(this.line)) this.send("text", { text: this.line });
    this.line = "";
  }
}

/** How many characters at the end of `text` could be the beginning of `token`. */
function partialSuffix(text, token) {
  for (let n = Math.min(token.length - 1, text.length); n > 0; n--) {
    if (token.startsWith(text.slice(-n))) return n;
  }
  return 0;
}

// ---------------------------------------------------------------- reply sources

/** The real model, through the Claude Code CLI. Calls onText for each streamed piece. */
function streamFromClaude(message, conversation, onText, onDone, onError, onStatus, library) {
  let session = conversation && sessions.get(conversation);
  const resume = Boolean(session);
  if (!session) session = randomUUID();
  const args = [
    "-p", message,
    "--model", MODEL,
    "--system-prompt", SYSTEM_PROMPT(library),  // replaces Claude Code's own (much larger) system prompt
    ...(resume ? ["--resume", session] : ["--session-id", session]),
    // Only web search: models don't know new things (like Valdi), so they look them up.
    "--tools", "WebSearch", "--allowedTools", "WebSearch",
    "--restricted", "--strict-mcp-config", // no settings, hooks or MCP servers from this machine
    "--output-format", "stream-json", "--include-partial-messages", "--verbose",
  ];
  const child = spawn("claude", args, { cwd: CHAT_DIR, stdio: ["ignore", "pipe", "pipe"] });
  let pending = "";
  let cost = null;
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    pending += chunk;
    let nl;
    while ((nl = pending.indexOf("\n")) !== -1) {
      const line = pending.slice(0, nl);
      pending = pending.slice(nl + 1);
      let e;
      try { e = JSON.parse(line); } catch { continue; }
      if (e.type === "stream_event" && e.event?.type === "content_block_delta" && e.event.delta?.type === "text_delta") {
        onText(e.event.delta.text);
      } else if (e.type === "stream_event" && e.event?.type === "content_block_start" && /tool_use$/.test(e.event.content_block?.type)) {
        onStatus(/search/i.test(e.event.content_block.name) ? "Searching the web…" : "Working…");
      } else if (e.type === "result") {
        cost = e.total_cost_usd ?? null;
        if (e.is_error) stderr += e.result || "";
      }
    }
  });
  child.stderr.on("data", (d) => { stderr += d; });
  child.on("close", (code) => {
    if (code !== 0) return onError(stderr.trim() || `claude exited ${code}`);
    if (conversation) sessions.set(conversation, session); // only remember chats that worked
    onDone({ costUsd: cost });
  });
  return () => child.kill();
}

/** A saved reply, streamed in small pieces at about the speed a fast model writes. */
function streamFromReplay(name, onText, onDone, onError) {
  const answers = loadReplies();
  const answer = answers[name] ?? Object.values(answers)[0];
  if (!answer) { onError("no saved replies found"); return () => {}; }
  let i = 0;
  const timer = setInterval(() => {
    if (i >= answer.length) { clearInterval(timer); onDone({ costUsd: 0 }); return; }
    const n = 3 + Math.floor(Math.random() * 8); // 3-10 characters per piece, like real tokens
    onText(answer.slice(i, i + n));
    i += n;
  }, 25);
  return () => clearInterval(timer);
}

/** Saved model replies by name: "haiku-slim-a.md#3" -> the 3rd answer in that file. */
function loadReplies() {
  const dir = join(CORE, "test", "ai-replies");
  const out = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    readFileSync(join(dir, file), "utf8").split(/^=====ANSWER=====\s*$/m).map((a) => a.trim()).filter(Boolean)
      .forEach((a, i) => { out[`${file}#${i + 1}`] = a; });
  }
  return out;
}

// ---------------------------------------------------------------- HTTP

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, model: MODEL }));
    return;
  }
  if (req.method === "GET" && (req.url === "/library" || req.url.startsWith("/library?"))) {
    // Only to an app whose drawer can draw it: GET /library?blocks=2 (no number = blocks 1).
    const blocks = Number(new URL(req.url, "http://x").searchParams.get("blocks") || 1);
    if (!canUseServerLibrary(blocks)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ version: null, needsBlocks: serverLibrary().blocks, code: null }));
      return;
    }
    // Read fresh on every request, so an edit to the library reaches apps right away.
    const code = readFileSync(join(CORE, "library", "prism-library.js"), "utf8");
    const ctx = { prismBlocksVersion: Infinity }; // only reading its version here, not drawing it
    ctx.globalThis = ctx;
    vm.runInNewContext(code, ctx);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ version: ctx.prismLibrary.version, code }));
    return;
  }
  if (req.method === "GET" && req.url === "/replies") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Object.keys(loadReplies())));
    return;
  }
  if (req.method !== "POST" || req.url !== "/chat") {
    res.writeHead(404); res.end(); return;
  }

  // app: { blocks, library } from the SDK (VERSIONS.md). Without it the app is taken as up to date.
  const { message = "", mode = "claude", replay, conversation, app } = await readBody(req);
  const library = libraryFor(app);
  const messageId = `msg_${++messageCount}`;
  const started = Date.now();
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const splitter = new StreamSplitter(messageId, send, { library });
  console.log(`[${messageId}] ${mode}: ${mode === "replay" ? replay ?? "(first)" : message}${library ? ` (library ${library})` : ""}`);

  let raw = "";
  const problems = [];
  const sendAndLog = send;
  splitter.send = (event, data) => {
    if (event === "block" && data.envelope.diagnostics?.length) problems.push({ id: data.id, ok: data.envelope.ok, diagnostics: data.envelope.diagnostics });
    sendAndLog(event, data);
  };
  const saveLog = (end) => writeFileSync(join(LOG_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}-${messageId}.md`),
    `# ${mode}: ${message}\n\n${end}\n\n## Compiler\n\n\`\`\`json\n${JSON.stringify(problems, null, 2)}\n\`\`\`\n\n## Reply\n\n${raw}\n`);
  const onText = (t) => { raw += t; splitter.feed(t); };
  const onDone = ({ costUsd }) => {
    splitter.end();
    send("done", { ms: Date.now() - started, costUsd });
    saveLog(`done in ${Date.now() - started} ms`);
    for (const p of problems) console.log(`[${messageId}] ${p.id} ${p.ok ? "shown with warnings" : "REFUSED"}: ${p.diagnostics.map((d) => `line ${d.line}: ${d.message}`).join(" | ")}`);
    res.end();
    console.log(`[${messageId}] done in ${Date.now() - started} ms${costUsd ? `, $${costUsd.toFixed(4)}` : ""}`);
  };
  const onError = (message) => { send("error", { message }); saveLog(`error: ${message}`); res.end(); console.log(`[${messageId}] error: ${message}`); };
  const stop = mode === "replay" ? streamFromReplay(replay, onText, onDone, onError) : streamFromClaude(message, conversation, onText, onDone, onError, (text) => send("status", { text }), library);
  req.on("close", () => { if (!res.writableEnded) stop(); }); // the phone hung up
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Prism dev server on http://localhost:${PORT}  (model: ${MODEL})`));
}
