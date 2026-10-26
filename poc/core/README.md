# prism-genui

The engine behind Prism: lets any AI model show small interactive screens in a chat. It holds no API keys and calls no model. You give its tool and instructions to the model you already use, and pass the model's calls back here.

Status: 0.1 open preview. See the [main README](../../README.md) for the whole picture and what's not done yet.

## Use it as a tool (recommended)

```js
import { prismTool, toolPrompt, handleToolCall, partialToolCode } from "prism-genui/tool";

const system = "You are a helpful assistant.\n\n" + toolPrompt();
const tools = [prismTool("anthropic")];          // or "openai", or "mcp"

// When the model calls show_screen:
const { envelope, result } = handleToolCall(call.input, { id: call.id });
// envelope -> send to the app (iOS, Android or web SDK draws it)
// result   -> give back to the model: "Shown to the user." or a list of what to fix
```

While a call is still streaming, `partialToolCode(argumentsSoFar)` returns the code written so far. Pass it to `partialEnvelope(code, compile)` from `prism-genui/partial` to show the screen early.

## Use it with ```prism blocks

For models without tool calls: put `dist/prompt.md` in the system prompt. The model writes ```` ```prism ```` blocks in its reply, and `compileMessage(reply)` splits the reply into text parts and envelopes.

```js
import { compileMessage } from "prism-genui";

for (const part of compileMessage(replyText, { messageId: "msg_1" })) {
  if (part.type === "markdown") showText(part.text);
  else if (part.envelope.ok) sendToApp(part.envelope);
}
```

## Turn on only the parts you need

Optional parts come in packs: `teach` (Flow, Code, Reveal), `ask` (Options, Form) and `act` (Plan, Confirm, Sources). All are on by default. Give the same `packs` to the prompt and the compiler to keep the AI's instructions shorter; parts from other packs are dropped:

```js
import { buildPrompt } from "prism-genui/prompt";
import { compileMessage, defaultCatalog } from "prism-genui";

const packs = ["teach", "ask"]; // this app runs no actions, so no Plan or Confirm
const system = buildPrompt(defaultCatalog, { packs });
const parts = compileMessage(replyText, { messageId: "msg_1", packs });
```

## What's inside

| Import | What it is |
|---|---|
| `prism-genui` | `compile(code)`, `compileMessage(reply)`: check the AI's code and pack the envelope |
| `prism-genui/tool` | The `show_screen` tool, its instructions, and the call handler |
| `prism-genui/partial` | Partial screens while the model is still writing |
| `prism-genui/runtime` | The runtime that runs envelopes (the SDKs carry their own copy) |
| `prism-genui/catalog.json` | What the AI may write: parts, settings, allowed values |
| `prism-genui/tokens.json` | How it looks: spacing, corners, fonts, colours |
| `prism-genui/dist/*` | Built files: `prompt.md`, `prompt-tool.md`, `prism-runtime.js`, `prism-library.js`, `tokens.css`, `prism.tokens.json` |
| `scripts/mcp-server.mjs` | A small MCP server with the `show_screen` tool |

## License

Apache 2.0.
