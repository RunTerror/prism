// The version rule (VERSIONS.md), for servers: which part library an app will draw with.
//
// An app tells the server { blocks, library }: the blocks version its drawer draws, and the part
// library built into its SDK. The server's library reaches the app only if the app's drawer has
// the blocks it needs (GET /library checks the same rule). Everything the AI is taught and every
// screen it writes is then limited to that library: compile(..., { library }).

import { createRequire } from "node:module";
import { defaultCatalog, newerVersion } from "./catalog.js";

const require = createRequire(import.meta.url);

/** This server's part library: { version, blocks } (blocks: what a drawer needs to draw it). */
export function serverLibrary() {
  require("./index.js"); // loads the runtime and the library into globalThis
  const lib = globalThis.prismLibrary;
  return { version: lib.version, blocks: lib.blocks };
}

/** True when an app whose drawer draws `blocks` can use this server's library. */
export function canUseServerLibrary(blocks, server = serverLibrary()) {
  return Number(blocks || 1) >= server.blocks;
}

/**
 * The part library version an app will draw with, to pass as `library` to buildPrompt and
 * compile. No app info: the newest (the app is assumed up to date).
 *   libraryFor({ blocks: 2, library: "1.4.0" })  ->  "1.6.0"  (it can load ours)
 *   libraryFor({ blocks: 1, library: "1.4.0" })  ->  "1.4.0"  (its drawer is too old for ours)
 */
export function libraryFor(app, server = serverLibrary()) {
  if (!app) return undefined;
  const own = app.library || "1.0.0";
  if (canUseServerLibrary(app.blocks, server) && newerVersion(server.version, own)) return server.version;
  return own;
}

/** The three numbers this core was built with: { format, blocks, library }. */
export function versions() {
  return { format: 1, blocks: defaultCatalog.blocksVersion, library: serverLibrary().version };
}
