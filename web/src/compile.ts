// Compiling: in the Electron app, its main process does it; in a browser, this page does, with the
// same compiler (core/compiler). It's loaded the first time it's needed: it is big (it reads JSX).
import type { CompilePayload, Envelope, MessagePart } from "./types";

/** The two compiler functions used here (core/compiler/index.js is plain JavaScript, without types). */
type Compiler = {
  compile(source: string, options: { id: string }): Envelope;
  compileMessage(message: string, options: { messageId: string }): MessagePart[];
};

export async function compile(payload: CompilePayload): Promise<Envelope | MessagePart[]> {
  if (window.prismHost) return window.prismHost.compile(payload);
  // Babel (inside the compiler) reads process.env, which only Node has. The production build fills
  // it in; the dev server doesn't, so give it an empty one.
  (globalThis as { process?: unknown }).process ??= { env: {} };
  // @ts-ignore: no type file for the compiler (see Compiler above)
  const compiler = (await import("../../core/compiler/index.js")) as Compiler;
  return "message" in payload
    ? compiler.compileMessage(payload.message, { messageId: payload.id || "msg" })
    : compiler.compile(String(payload.source ?? ""), { id: payload.id || "playground" });
}
