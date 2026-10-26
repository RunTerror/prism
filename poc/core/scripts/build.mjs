// Compiles every example and writes the runtime, examples, tokens and AI instructions to dist/
// Run: npm run build   (from poc/core)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, defaultCatalog } from "../compiler/index.js";
import { compactBlocks, defaultTokens } from "../compiler/catalog.js";
import { resolveTokens, tokensCss, dtcgTokens } from "../compiler/tokens.js";
import { buildPrompt } from "../compiler/prompt.js";

const core = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(core, "dist");
mkdirSync(dist, { recursive: true });

const examples = readdirSync(join(core, "examples"))
  .filter((f) => f.endsWith(".prism"))
  .sort()
  .map((file) => {
    const source = readFileSync(join(core, "examples", file), "utf8");
    const id = file.replace(/\.prism$/, "");
    const title = (source.match(/^\/\/\s*title:\s*(.+)$/m) || [, id])[1].trim();
    // Optional `// appData: {...}` line: the images the "server" approves for this example.
    const appData = JSON.parse((source.match(/^\/\/\s*appData:\s*(.+)$/m) || [, "{}"])[1]);
    // `// blocks: true`: an example of our own code using basic blocks (the AI can't).
    const blocks = /^\/\/\s*blocks:\s*true\s*$/m.test(source);
    const envelope = compile(source, { id, appData, blocks });
    const problems = envelope.diagnostics.map((d) => `    ${d.level}: ${d.message}`).join("\n");
    console.log(`${envelope.ok ? "ok  " : "FAIL"} ${id}${problems ? "\n" + problems : ""}`);
    return { id, title, source, envelope };
  });

// The component gallery (web "Components" page): one or more screens per part, in showcase/.
// Header lines: `// part: Steps`, `// title: ...`, `// ask: ...` (the user's question it answers).
const showcase = readdirSync(join(core, "showcase"))
  .filter((f) => f.endsWith(".prism"))
  .sort()
  .map((file) => {
    const source = readFileSync(join(core, "showcase", file), "utf8");
    const id = file.replace(/\.prism$/, "");
    const meta = (key) => (source.match(new RegExp(`^//\\s*${key}:\\s*(.+)$`, "m")) || [, ""])[1].trim();
    const appData = JSON.parse(meta("appData") || "{}"); // the images the "server" approves
    const envelope = compile(source, { id, appData });
    const problems = envelope.diagnostics.map((d) => `    ${d.level}: ${d.message}`).join("\n");
    console.log(`${envelope.ok ? "ok  " : "FAIL"} showcase/${id}${problems ? "\n" + problems : ""}`);
    return { id, part: meta("part"), title: meta("title"), ask: meta("ask"), source: source.replace(/^\/\/\s*(part|title|ask|appData):.*\n/gm, ""), envelope };
  });
writeFileSync(join(dist, "showcase.json"), JSON.stringify(showcase, null, 2));

// catalog.json is not copied: clients get the part rules inside each envelope (`spec`) and the
// sizes and colours from tokens.json / tokens.css. Remove a copy left by an older build.
rmSync(join(dist, "catalog.json"), { force: true });
writeFileSync(join(dist, "examples.json"), JSON.stringify(examples, null, 2));
// The runtime every platform loads: the source, the basic block specs from catalog.json, and the
// part library (the copy every SDK carries; a newer one can come from the server).
const libraryCode = readFileSync(join(core, "library", "prism-library.js"), "utf8");
writeFileSync(join(dist, "prism-runtime.js"),
  readFileSync(join(core, "runtime", "prism-runtime.js"), "utf8") +
  `\n// Basic block specs from catalog.json "blocks" (added by scripts/build.mjs).\nglobalThis.prism.setBlocks(${JSON.stringify(compactBlocks(defaultCatalog))}, ${defaultCatalog.blocksVersion});\n` +
  `\n// The part library (core/library/prism-library.js), built in.\n` + libraryCode);
// The library on its own, for servers to send to apps (GET /library in poc/server).
writeFileSync(join(dist, "prism-library.js"), libraryCode);
// The three version numbers (VERSIONS.md), for SDKs and servers to read.
const libraryInfo = (() => { const g = { prismBlocksVersion: 99 }; new Function("globalThis", libraryCode)(g); return g.prismLibrary; })();
const versions = { format: 1, blocks: defaultCatalog.blocksVersion, library: libraryInfo.version, libraryNeedsBlocks: libraryInfo.blocks };
if (versions.libraryNeedsBlocks > versions.blocks) throw new Error(`library ${versions.library} needs blocks ${versions.libraryNeedsBlocks}, catalog has ${versions.blocks}`);
writeFileSync(join(dist, "versions.json"), JSON.stringify(versions, null, 2) + "\n");

// Design system outputs, all from tokens.json (DESIGN-SYSTEM.md):
//   tokens.json  plain numbers and colours, for drawers in any language
//   tokens.css   CSS variables, for the web drawer
//   prompt.md    the AI instructions
writeFileSync(join(dist, "tokens.json"), JSON.stringify(resolveTokens(defaultTokens), null, 2) + "\n");
writeFileSync(join(dist, "tokens.css"), tokensCss(defaultTokens));
//   prism.tokens.json  W3C Design Tokens format, for design tools (Figma plugins, Style Dictionary)
writeFileSync(join(dist, "prism.tokens.json"), JSON.stringify(dtcgTokens(defaultTokens), null, 2) + "\n");
writeFileSync(join(dist, "prompt.md"), buildPrompt(defaultCatalog));
//   prompt-tool.md  the same, for models that show screens with the show_screen tool (compiler/tool.js)
writeFileSync(join(dist, "prompt-tool.md"), buildPrompt(defaultCatalog, { mode: "tool" }));

// Clients read from dist/ themselves: web/electron import core directly; the mobile client
// (poc/sdk, being rebuilt) copies the runtime, examples and tokens in.
