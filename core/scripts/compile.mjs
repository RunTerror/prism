// Compile one file or stdin and print the envelope. Useful for testing LLM output.
//   node scripts/compile.mjs examples/03-tasks.prism
//   node scripts/compile.mjs --message reply.md     (a whole Markdown reply with ```prism blocks)
import { readFileSync } from "node:fs";
import { compile, compileMessage } from "../compiler/index.js";

const args = process.argv.slice(2);
const message = args[0] === "--message";
const file = message ? args[1] : args[0];
const source = readFileSync(file ?? 0, "utf8");
console.log(JSON.stringify(message ? compileMessage(source) : compile(source), null, 2));
