// Partial screens while the AI is still writing a block (ARCHITECTURE.md section 9, streaming).
//
//   partialSource(text) -> a complete block made from the text so far, or null
//
// The block arrives in order: setup lines (state, values, helpers) first, then the screen. Once
// the screen has started, everything before it is complete, and the screen is a tree that only
// grows. So we cut the text at the end of its last complete line and close whatever is still
// open: tags, { }, ( ) and [ ].
//
//   written so far:   <Card title="BMI">          we compile:   <Card title="BMI">
//                       <Slider label="Weight" />                 <Slider label="Weight" />
//                       <Stat label="Your BM                    </Card>
//
// If the cut lands somewhere that still can't be closed (half an expression), we try a line or
// two earlier. The server compiles the result and sends it only if it compiles cleanly.

/**
 * Complete blocks made from the text so far, newest first: cut after the last complete line, then
 * a line earlier, and so on (`tries` lines at most). The caller compiles them in order and keeps
 * the first that compiles cleanly (a cut can close fine but still be half an expression).
 */
export function partialSources(text, tries = 6) {
  const lines = text.split("\n");
  lines.pop(); // the last line isn't finished yet
  const screenAt = lines.findIndex((l) => /^</.test(l));
  if (screenAt === -1) return []; // the screen hasn't started
  const setup = lines.slice(0, screenAt).join("\n");
  const out = [];
  for (let end = lines.length; end > screenAt && lines.length - end < tries; end--) {
    const screen = lines.slice(screenAt, end).join("\n");
    const closers = closeOpen(screen);
    if (closers !== null) out.push((setup ? setup + "\n" : "") + screen + closers);
  }
  return out;
}

/** The newest partial block that compiles cleanly (`compile` from compiler/index.js), or null. */
export function partialEnvelope(text, compile, options = {}) {
  for (const source of partialSources(text)) {
    const env = compile(source, options);
    if (env.ok && !env.diagnostics.some((d) => d.level === "error")) return env;
  }
  return null;
}

/**
 * What it takes to close everything still open in a piece of JSX, or null when the text ends in
 * the middle of an opening tag (the tag's props aren't all there yet).
 * Strings and template literals are skipped; `<` followed by a letter starts a tag.
 */
export function closeOpen(src) {
  const stack = []; // { kind: "tag", name } | { kind: "{" | "(" | "[" }
  let i = 0;
  const n = src.length;
  const inExpr = () => stack.length > 0 && stack[stack.length - 1].kind !== "tag";

  // Skips a string starting at src[i] (the quote). Returns false if it never ends.
  const skipString = () => {
    const q = src[i++];
    while (i < n) {
      if (src[i] === "\\") { i += 2; continue; }
      if (src[i] === q) { i++; return true; }
      i++;
    }
    return false;
  };

  // Reads an opening tag starting at src[i] === "<". Pushes it unless it closes itself.
  // Returns false if the text ends before the tag does.
  const openTag = () => {
    i++;
    const m = /^[A-Za-z][\w.-]*/.exec(src.slice(i));
    const name = m ? m[0] : "";
    i += name.length;
    let depth = 0; // { } inside the tag's props
    while (i < n) {
      const c = src[i];
      if (c === '"' || c === "'" || c === "`") { if (!skipString()) return false; continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (depth === 0 && c === "/" && src[i + 1] === ">") { i += 2; return true; }
      else if (depth === 0 && c === ">") { i++; stack.push({ kind: "tag", name }); return true; }
      i++;
    }
    return false;
  };

  while (i < n) {
    const c = src[i];
    if (inExpr()) {
      if (c === '"' || c === "'" || c === "`") { if (!skipString()) return null; continue; }
      if (c === "<" && /[A-Za-z]/.test(src[i + 1] || "")) { if (!openTag()) return null; continue; }
      if (c === "{" || c === "(" || c === "[") { stack.push({ kind: c }); i++; continue; }
      if (c === "}" || c === ")" || c === "]") { stack.pop(); i++; continue; }
      i++;
      continue;
    }
    // In JSX children (or before the first tag).
    if (c === "<" && src[i + 1] === "/") {
      const end = src.indexOf(">", i);
      if (end === -1) return null;
      for (let k = stack.length - 1; k >= 0; k--) if (stack[k].kind === "tag") { stack.splice(k); break; }
      i = end + 1;
      continue;
    }
    if (c === "<" && src[i + 1] === ">") { stack.push({ kind: "tag", name: "" }); i += 2; continue; }
    if (c === "<" && /[A-Za-z]/.test(src[i + 1] || "")) { if (!openTag()) return null; continue; }
    if (c === "{") { stack.push({ kind: "{" }); i++; continue; }
    i++;
  }

  let out = "";
  for (let k = stack.length - 1; k >= 0; k--) {
    const s = stack[k];
    out += s.kind === "tag" ? `</${s.name}>` : s.kind === "{" ? "}" : s.kind === "(" ? ")" : "]";
  }
  return out ? "\n" + out : "";
}
