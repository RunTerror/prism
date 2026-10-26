// Checks AI replies: compiles each ```prism block, draws it once, and reports the results.
// Replies come from agents given dist/prompt.md (see eval/README.md).
//   node scripts/eval.mjs eval/runs/haiku-run1.md [more files...]
// A replies file holds answers separated by a line `=====ANSWER=====`, one per request, in order.
// Requests that come with server-approved images list them in eval/app-data.json, by request number.
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { createRequire } from "node:module";
import { compileMessage } from "../compiler/index.js";

const prism = createRequire(import.meta.url)("../runtime/prism-runtime.js");

const appDataFile = new URL("../eval/app-data.json", import.meta.url);
/** The images the server approves for each request: { "18": { images: { name: url } } }. */
export const appDataByRequest = existsSync(appDataFile) ? JSON.parse(readFileSync(appDataFile, "utf8")) : {};

/** Result for one answer: "clean" | "warnings" | "runtime-errors" | "refused" | "no-block". */
export function checkAnswer(answer, id, appData = {}) {
  const block = compileMessage(answer, { messageId: id, appData }).find((p) => p.type === "prism");
  if (!block) return { status: "no-block", messages: [] };
  const env = block.envelope;
  if (!env.ok) return { status: "refused", messages: env.diagnostics.map((d) => d.message) };
  const out = JSON.parse(prism.load(id, JSON.stringify(env)));
  prism.unload(id);
  const messages = [...env.diagnostics.map((d) => d.message), ...out.errors.map((e) => `runtime: ${e.message}`)];
  const uses = env.uses || [];
  if (out.errors.length || !out.tree) return { status: "runtime-errors", messages, uses };
  return { status: env.diagnostics.length ? "warnings" : "clean", messages, uses };
}

/** The request an answer is for: a first line `Request 18` if present, else its position. */
export const requestNumber = (answer, i) => (answer.match(/^Request (\d+)/) || [, String(i + 1)])[1];

export const splitAnswers = (text) => text.split(/^=====ANSWER=====\s*$/m).map((a) => a.trim()).filter(Boolean);

if (import.meta.url === `file://${process.argv[1]}`) {
  const counts = {};
  const common = new Map();
  let total = 0;
  for (const file of process.argv.slice(2)) {
    console.log(`\n${basename(file)}`);
    splitAnswers(readFileSync(file, "utf8")).forEach((answer, i) => {
      const r = checkAnswer(answer, `${basename(file)}#${i + 1}`, appDataByRequest[requestNumber(answer, i)]);
      total++;
      counts[r.status] = (counts[r.status] || 0) + 1;
      console.log(`  ${String(i + 1).padStart(2)}. ${r.status.padEnd(14)} ${(r.uses || []).join(" ")}`);
      for (const m of r.messages) {
        console.log(`        ${m}`);
        // Group similar messages: drop quoted values so "tone=\"x\"" and "tone=\"y\"" count together.
        const key = m.replace(/"[^"]*"/g, '"…"').replace(/\d+/g, "N");
        common.set(key, (common.get(key) || 0) + 1);
      }
    });
  }
  console.log(`\nTotal ${total}: ` + ["clean", "warnings", "runtime-errors", "refused", "no-block"]
    .map((s) => `${s} ${counts[s] || 0}`).join(", "));
  if (common.size) {
    console.log("\nMost common problems:");
    [...common].sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([m, n]) => console.log(`  ${n}x  ${m}`));
  }
}
