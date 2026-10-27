// Everything the compiler loads from outside its own code, in one place. This is the Node version:
// it reads the JSON files from disk and loads the runtime and the part library with require.
// load.browser.js is the same for a web page (the web app's Playground compiles in the browser).

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** catalog.json or tokens.json, fresh each time. */
export const readJson = (name) => JSON.parse(readFileSync(new URL(`../${name}`, import.meta.url), "utf8"));

/** The runtime (it also sets globalThis.prism). */
export const loadRuntime = () => require("../runtime/prism-runtime.js");

/** The part library (sets globalThis.prismLibrary). Load it after the runtime knows the basic blocks. */
export const loadLibrary = () => { require("../library/prism-library.js"); };
