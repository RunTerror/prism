// The web page version of load.js: the JSON files and the two scripts are bundled into the page
// (by Vite: ?raw gives a file's text). Same exports, same behaviour.

import catalog from "../catalog.json";
import tokens from "../tokens.json";
import runtimeCode from "../runtime/prism-runtime.js?raw";
import libraryCode from "../library/prism-library.js?raw";

const files = { "catalog.json": catalog, "tokens.json": tokens };

/** catalog.json or tokens.json, fresh each time. */
export const readJson = (name) => structuredClone(files[name]);

/** The runtime (it also sets globalThis.prism). */
export const loadRuntime = () => {
  new Function(runtimeCode).call(globalThis);
  return globalThis.prism;
};

/** The part library (sets globalThis.prismLibrary). Load it after the runtime knows the basic blocks. */
export const loadLibrary = () => { new Function(libraryCode).call(globalThis); };
