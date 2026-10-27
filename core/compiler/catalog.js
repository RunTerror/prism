// Reads the two source files. See DESIGN-SYSTEM.md.
//   catalog.json  what the AI may write: parts, props, value lists (the prompt is built from it)
//   tokens.json   how it looks: sizes, corners, fonts and colours (the AI never sees it)

import { readJson } from "./load.js";

export const defaultCatalog = withSharedProps(readJson("catalog.json"));
export const defaultTokens = readJson("tokens.json");

/**
 * A part with "sameAs": "slider" is the same control as that basic block, so it borrows the block's
 * props instead of a second copy. Its own "props" only change single fields (Chart hides height).
 */
export function withSharedProps(catalog) {
  for (const part of Object.values(catalog.parts)) {
    if (!part.sameAs) continue;
    const props = structuredClone(catalog.blocks[part.sameAs].props);
    for (const [name, change] of Object.entries(part.props || {})) props[name] = { ...props[name], ...change };
    part.props = props;
  }
  return catalog;
}

/** The type definition behind a prop: a named type ("tone") or one written inline ({ enum: [...] }). */
export function typeOf(catalog, prop) {
  return typeof prop.type === "string" ? catalog.types[prop.type] : prop.type;
}

/** True when version a ("1.6.0") is newer than b. */
export function newerVersion(a, b) {
  const x = String(a).split("."), y = String(b).split(".");
  for (let i = 0; i < 3; i++) {
    const d = (Number(x[i]) || 0) - (Number(y[i]) || 0);
    if (d) return d > 0;
  }
  return false;
}

/**
 * The catalog one app can use (VERSIONS.md):
 *   packs    the part packs it turns on, like ["teach", "ask"] (catalog.json "packs"; default all)
 *   library  the part library version it will draw with, like "1.4.0" (default: the newest)
 * Parts outside those packs, or newer than that library (a part's "since"), are left out, with
 * aliases that lead to them: the AI isn't taught them and the compiler drops them.
 */
export function forApp(catalog, { packs, library } = {}) {
  if (!packs && !library) return catalog;
  const all = catalog.packs || {};
  if (packs) for (const name of packs) if (!all[name]) throw new Error(`Unknown pack "${name}". Packs: ${Object.keys(all).join(", ")}`);
  const off = {}; // part name -> why it is off: { pack } or { since }
  if (packs) for (const [name, pack] of Object.entries(all)) if (!packs.includes(name)) for (const part of pack.parts) off[part] = { pack: name };
  if (library) for (const [name, part] of Object.entries(catalog.parts)) {
    if (part.since && newerVersion(part.since, library) && !off[name]) off[name] = { since: part.since, library };
  }
  const parts = {}, partAliases = {};
  for (const [name, part] of Object.entries(catalog.parts)) if (!off[name]) parts[name] = part;
  for (const [alias, target] of Object.entries(catalog.partAliases || {})) if (!off[target]) partAliases[alias] = target;
  // `offParts` lets the compiler say why a part was dropped.
  return { ...catalog, parts, partAliases, offParts: off };
}

/** Only some packs turned on (see forApp). */
export const withPacks = (catalog, packs) => forApp(catalog, { packs });

/** "none" | "text" | "parts", plus the parts allowed inside (if limited). */
export function childrenOf(part) {
  return typeof part.children === "string" ? { kind: part.children, only: null } : { kind: part.children.kind, only: part.children.only || null };
}

/**
 * The short form of one prop that the runtime checks against (see checkValue in prism-runtime.js):
 *   { t, e, a, n, d, r, min, max, int, btw }
 */
export function compactProp(catalog, prop) {
  const def = typeOf(catalog, prop);
  const s = {};
  if (def && def.enum) {
    s.t = "enum";
    s.e = def.enum;
    if (def.aliases) s.a = def.aliases;
  } else {
    s.t = prop.type;
  }
  if (prop.default !== undefined) s.d = prop.default;
  if (prop.required) s.r = true;
  if (prop.min !== undefined) s.min = prop.min;
  if (prop.max !== undefined) s.max = prop.max;
  if (prop.integer) s.int = true;
  if (prop.between) s.btw = prop.between;
  return s;
}

/** The short form of one part, sent in the envelope's `spec` so every device checks props the same way. */
export function compactPart(catalog, name, group = "parts") {
  const part = catalog[group][name];
  const { kind, only } = childrenOf(part);
  const spec = { c: kind, p: {} };
  if (only) spec.only = only;
  for (const [propName, prop] of Object.entries(part.props)) {
    if (prop.type !== "event") spec.p[propName] = compactProp(catalog, prop);
  }
  return spec;
}

/**
 * The catalog name for a tag the AI wrote: exact name, alias (<VStack> -> Stack), or a lowercase
 * name (<button> -> Button). Returns null if nothing matches.
 */
export function resolvePartName(catalog, name) {
  if (catalog.parts[name]) return name;
  const capital = name.charAt(0).toUpperCase() + name.slice(1);
  for (const n of [name, capital]) {
    if (catalog.parts[n]) return n;
    if (catalog.partAliases[n]) return catalog.partAliases[n];
  }
  return null;
}

/** The catalog prop for a prop the AI wrote: exact name, or an alias the part has (color -> tone). */
export function resolvePropName(catalog, part, name) {
  if (part.props[name]) return name;
  const alias = catalog.propAliases[name];
  return alias && part.props[alias] ? alias : null;
}

/**
 * Every basic block's short spec, for the runtime (prism.setBlocks). Blocks are what the part
 * library builds parts from (ARCHITECTURE.md section 9); the AI never writes them itself.
 */
export function compactBlocks(catalog) {
  const out = {};
  for (const name of Object.keys(catalog.blocks || {})) out[name] = compactPart(catalog, name, "blocks");
  return out;
}
