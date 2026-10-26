// Prism as a tool call: any model that can call tools (Claude, GPT, Gemini, local models) can show
// screens. Prism holds no API keys and calls no model; your server does, and hands the call here.
//
//   prismTool("anthropic" | "openai" | "mcp")  -> the tool definition, in that API's shape
//   toolPrompt()                                -> the instructions to put in the system prompt
//   handleToolCall(input, options)              -> { envelope, result }
//   partialToolCode(argumentsSoFar)             -> the code written so far, while the call streams
//
//   your server                                  Prism
//   ───────────                                  ─────
//   system prompt += toolPrompt()
//   tools += [prismTool("anthropic")]
//   model calls show_screen({ code })    ──────▶  handleToolCall({ code })
//   send envelope to the app             ◀──────  { envelope, result }
//   give `result` back to the model as the tool result ("Shown to the user." or what to fix)

import { compile, defaultCatalog } from "./index.js";
import { buildPrompt } from "./prompt.js";

export const TOOL_NAME = "show_screen";

const DESCRIPTION =
  "Show an interactive screen in the chat, right where you call it. Use it when trying something " +
  "helps more than reading: a calculator, a comparison, a quiz, steps to follow. `code` is screen " +
  "code as described in your instructions: setup lines first, then one JSX screen.";

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    code: {
      type: "string",
      description: "The screen: useState lines and values first, then one JSX tree using only the listed parts."
    }
  },
  required: ["code"],
  additionalProperties: false
};

/** The tool definition, in the shape each API expects. */
export function prismTool(format = "anthropic") {
  const schema = structuredClone(INPUT_SCHEMA);
  switch (format) {
    case "anthropic": return { name: TOOL_NAME, description: DESCRIPTION, input_schema: schema };
    case "openai": return { type: "function", function: { name: TOOL_NAME, description: DESCRIPTION, parameters: schema, strict: true } };
    case "mcp": return { name: TOOL_NAME, description: DESCRIPTION, inputSchema: schema };
    default: throw new Error(`Unknown tool format "${format}": use anthropic, openai or mcp`);
  }
}

/** The instructions for tool mode: the same rules and parts as the ```prism block mode. */
export function toolPrompt(catalog = defaultCatalog, { packs, library } = {}) {
  return buildPrompt(catalog, { mode: "tool", packs, library });
}

/**
 * Compile one show_screen call.
 * @param input    the call's arguments: { code } as an object, or the JSON text OpenAI sends
 * @param options  { id, appData, catalog, packs, library } as for compile()
 * @returns { envelope, result }  envelope for the app (null if the input was unusable),
 *                                result: text to send back to the model as the tool result
 */
export function handleToolCall(input, { id = "tool_0", appData = {}, catalog = defaultCatalog, packs, library } = {}) {
  let args = input;
  if (typeof args === "string") {
    try { args = JSON.parse(args); } catch { args = null; }
  }
  const code = args && typeof args.code === "string" ? args.code : null;
  if (!code || !code.trim()) {
    return { envelope: null, result: `Not shown: ${TOOL_NAME} needs { "code": "<screen code>" }.` };
  }

  const envelope = compile(code, { id, appData, catalog, packs, library });
  if (!envelope.ok) {
    const problems = envelope.diagnostics.filter((d) => d.level === "error").map(lineOf);
    return { envelope, result: `Not shown. Fix these and call ${TOOL_NAME} again:\n${problems.join("\n")}` };
  }
  const fixed = envelope.diagnostics.map(lineOf);
  const result = fixed.length
    ? `Shown to the user. The app fixed ${fixed.length} small problem(s); avoid them next time:\n${fixed.slice(0, 5).join("\n")}`
    : "Shown to the user.";
  return { envelope, result };
}

const lineOf = (d) => `- ${d.message}${d.line ? ` (line ${d.line})` : ""}`;

/**
 * The `code` written so far, from a show_screen call that is still streaming (Claude's
 * input_json_delta, OpenAI's arguments delta). Feed the result to partialEnvelope() in
 * partial.js to show the screen while it is written. Null until `code` has started.
 *
 *   '{"code": "const [n, setN] = useState(0)\n<Card ti'  ->  'const [n, setN] = useState(0)\n<Card ti'
 */
export function partialToolCode(argumentsSoFar) {
  const m = /"code"\s*:\s*"/.exec(argumentsSoFar);
  if (!m) return null;
  let out = "";
  for (let i = m.index + m[0].length; i < argumentsSoFar.length; i++) {
    const ch = argumentsSoFar[i];
    if (ch === '"') return out; // the string is complete
    if (ch !== "\\") { out += ch; continue; }
    const next = argumentsSoFar[i + 1];
    if (next === undefined) return out; // an escape cut in half: wait for the rest
    if (next === "u") {
      const hex = argumentsSoFar.slice(i + 2, i + 6);
      if (hex.length < 4) return out;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 5;
      continue;
    }
    out += { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" }[next] ?? next;
    i++;
  }
  return out;
}
