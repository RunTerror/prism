// Prism compiler: turns the AI's ```prism block (JSX) into an envelope of plain JavaScript.
// Runs on our server (and in tests). See FORMAT.md for the format at each step.

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { createRequire } from "node:module";
import { defaultCatalog, childrenOf, compactProp, compactPart, compactBlocks, resolvePartName, resolvePropName, withPacks, forApp, newerVersion } from "./catalog.js";

const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;
const require = createRequire(import.meta.url);
const runtime = require("../runtime/prism-runtime.js");
runtime.setBlocks(compactBlocks(defaultCatalog), defaultCatalog.blocksVersion); // the test draw (STEP 7) knows the basic blocks too
require("../library/prism-library.js"); // ...and the part library (sets globalThis.prismLibrary)

export { defaultCatalog, withPacks, forApp };

// The only outside names AI code may use. Everything else (window, fetch, eval, Function...) is refused.
const ALLOWED_GLOBALS = new Set([
  "P", "S", "T",
  "Math", "JSON", "Number", "String", "Boolean", "Array", "Object", "Date",
  "parseInt", "parseFloat", "isNaN", "isFinite", "undefined", "NaN", "Infinity"
]);
const BANNED_MEMBERS = new Set([
  "constructor", "__proto__", "prototype",
  "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"
]);
// React hooks we don't support yet. useState is handled on its own (STEP 1 and STEP 2).
const UNSUPPORTED_HOOKS = new Set([
  "useEffect", "useLayoutEffect", "useMemo", "useCallback", "useRef", "useReducer", "useContext", "useId"
]);
// List and object methods that change a value in place. With useState, changes go through the setter.
const MUTATING_METHODS = new Set(["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"]);

const pMember = (name) => t.memberExpression(t.identifier("P"), t.identifier(name));
const tickCall = () => t.callExpression(pMember("tick"), []);

function isPlainData(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isPlainData);
  if (typeof value === "object") return Object.values(value).every(isPlainData);
  return false;
}

// useState(...) or React.useState(...)
function isUseStateCall(node) {
  if (!t.isCallExpression(node)) return false;
  const c = node.callee;
  return t.isIdentifier(c, { name: "useState" }) ||
    (t.isMemberExpression(c) && !c.computed && t.isIdentifier(c.object, { name: "React" }) && t.isIdentifier(c.property, { name: "useState" }));
}

// e.target.value / e.target.checked (and currentTarget), where e is the handler's first parameter.
function isTargetValue(node, param) {
  return t.isMemberExpression(node) && !node.computed &&
    t.isIdentifier(node.property) && ["value", "checked"].includes(node.property.name) &&
    t.isMemberExpression(node.object) && !node.object.computed &&
    t.isIdentifier(node.object.property) && ["target", "currentTarget"].includes(node.object.property.name) &&
    t.isIdentifier(node.object.object, { name: param.name });
}

// The start value of a useState line, worked out on the server: lists, objects, spreads and other
// constants (`done: empty`), plus anything Babel can work out (`n * 2`). Babel alone gives up when
// one list constant is used twice, which AI code does often. Returns { ok, value }.
function startValue(path, seen = new Set()) {
  const node = path.node;
  if (t.isArrayExpression(node)) {
    const out = [];
    for (const el of path.get("elements")) {
      if (!el.node) return { ok: false };
      const spread = el.isSpreadElement();
      const r = startValue(spread ? el.get("argument") : el, seen);
      if (!r.ok || (spread && !Array.isArray(r.value))) return { ok: false };
      if (spread) out.push(...r.value); else out.push(r.value);
    }
    return { ok: true, value: out };
  }
  if (t.isObjectExpression(node)) {
    const out = {};
    for (const prop of path.get("properties")) {
      if (prop.isSpreadElement()) {
        const r = startValue(prop.get("argument"), seen);
        if (!r.ok || !r.value || typeof r.value !== "object" || Array.isArray(r.value)) return { ok: false };
        Object.assign(out, r.value);
        continue;
      }
      if (!prop.isObjectProperty() || prop.node.computed) return { ok: false };
      const key = t.isIdentifier(prop.node.key) ? prop.node.key.name : prop.node.key.value;
      const r = startValue(prop.get("value"), seen);
      if (!r.ok) return { ok: false };
      out[key] = r.value;
    }
    return { ok: true, value: out };
  }
  if (t.isIdentifier(node)) {
    // Another top-level constant: work out its value too (each time it is used).
    const binding = path.scope.getBinding(node.name);
    if (binding && binding.kind === "const" && binding.constant && binding.path.isVariableDeclarator() &&
        t.isIdentifier(binding.path.node.id) && binding.path.node.init && !seen.has(node.name)) {
      return startValue(binding.path.get("init"), new Set([...seen, node.name]));
    }
  }
  const r = path.evaluate();
  return r.confident ? { ok: true, value: r.value } : { ok: false };
}

// The value of a literal prop (`"lg"`, `{2}`, `{-1}`, `{true}`), or undefined if it is worked out at run time.
function literalValue(node) {
  if (t.isStringLiteral(node) || t.isNumericLiteral(node) || t.isBooleanLiteral(node)) return node.value;
  if (t.isUnaryExpression(node, { operator: "-" }) && t.isNumericLiteral(node.argument)) return -node.argument.value;
  if (t.isTemplateLiteral(node) && node.expressions.length === 0) return node.quasis[0].value.cooked;
  return undefined;
}

/**
 * The images the server approved for this reply, as { images: { name: url } }.
 * The server fills appData from tool or search results; the AI only ever names an image.
 * An entry is a web address, or { url, description } (the description only goes into the AI
 * instructions, see imagesPrompt). Only https addresses are kept.
 */
export function normalizeAppData(appData, report = () => {}) {
  const images = {};
  const given = (appData && appData.images) || {};
  for (const [name, entry] of Object.entries(given)) {
    const url = typeof entry === "string" ? entry : entry && typeof entry.url === "string" ? entry.url : null;
    if (url && /^https:\/\/[^\s]+$/i.test(url)) images[name] = url;
    else report("warning", `appData image "${name}" is not an https address; left out`, null);
  }
  return { images };
}

/**
 * Compile one ```prism block.
 * @param appData  the images the server approved for this reply (see normalizeAppData)
 * @returns envelope { v, id, ok, code, text, state, uses, spec, appData, fallback, diagnostics }
 *
 * The steps, in order (each one is marked below with a STEP header):
 *   STEP 0  Read the text           Babel turns the block into a tree (AST)
 *   STEP 1  Sort the top lines      useState lines, helpers, the screen
 *   STEP 2  Replace useState        const [count, setCount] = useState(0)  ->  two plain lines
 *   STEP 3  Fix event habits        e.target.value  ->  e
 *   STEP 4  Safety checks           unknown names, writes to state, step counting
 *   STEP 5  Tags to calls           <Text>Hi</Text>  ->  P.el("Text", ...), checked against the catalog
 *   STEP 6  Build the envelope      one screen function, plus text, state, spec
 *   STEP 7  Test draw               run it once, make the plain-text backup
 * Any step can report a problem. Errors stop the block (after STEP 5); warnings don't.
 * A full worked example (a counter, through every step) is at the end of this file.
 */
export function compile(source, { id = "block_0", catalog: fullCatalog = defaultCatalog, packs, library, appData = {}, blocks = false } = {}) {
  // packs: the part packs this app turns on; library: the part library version it draws with (VERSIONS.md)
  const catalog = forApp(fullCatalog, { packs, library });
  const diagnostics = [];
  const report = (level, message, node) =>
    diagnostics.push({ level, message, line: node && node.loc ? node.loc.start.line : null });
  const data = normalizeAppData(appData, report);
  const failed = () => ({
    v: 1, id, ok: false, code: null, text: [], state: {}, uses: [], spec: {}, appData: data,
    fallback: "This part of the answer could not be shown.", diagnostics
  });

  // ===========================================================================================
  // STEP 0: Read the text
  //   In:  the AI's block as text.   Out: `program`, the top of Babel's tree.
  //
  //   const [count, setCount] = useState(0)        const [count, setCount] = useState(0);
  //                                         --->
  //   <Card>...</Card>                             <><Card>...</Card></>
  //
  // The screen starts at the first line beginning with "<" (no indent). Without the added ";", a
  // setup line with no semicolon would run into `<Card ...` and be read as "less than".
  // Wrapping the screen in <>...</> allows several parts side by side. Line numbers stay the same.
  // ===========================================================================================
  // A React habit: `return (<Card>...</Card>)` at the top. Then the text is read as it is, and STEP 1
  // takes the returned value as the screen.
  let topReturn = false;
  if (/^return\b/m.test(source)) {
    try {
      const probe = parse(source, { sourceType: "script", plugins: ["jsx"], allowReturnOutsideFunction: true });
      topReturn = probe.program.body.some((st) => st.type === "ReturnStatement");
    } catch { /* not that habit: read it the usual way */ }
  }
  let pre = source;
  const screenStart = topReturn ? -1 : pre.search(/^</m);
  if (screenStart !== -1) {
    const setupText = pre.slice(0, screenStart);
    const nl = setupText.endsWith("\n") ? "\n" : "";
    pre = setupText.slice(0, setupText.length - nl.length) + ";" + nl + "<>" + pre.slice(screenStart) + "</>";
  }

  let ast;
  try {
    ast = parse(pre, { sourceType: "script", plugins: ["jsx"], allowReturnOutsideFunction: topReturn });
  } catch (e) {
    report("error", `Syntax error: ${e.message.replace(/\s*\(\d+:\d+\)$/, "")}`, e.loc ? { loc: { start: e.loc } } : null);
    return failed();
  }

  let program;
  traverse(ast, { Program(p) { program = p; p.stop(); } });

  // ===========================================================================================
  // STEP 1: Sort the top lines
  //   Each top-level line must be one of:
  //     const [count, setCount] = useState(0)    state: start value saved in `state`
  //     const done = items.length                 a worked-out value (kept as is)
  //     function total(x) { ... }                 a helper (kept as is)
  //     if (bmi < 18.5) { label = "Under" }       plain code: if, switch, loops, x = ... (kept as is,
  //                                               runs at every draw, like a React component body)
  //     <Card>...</Card>                          the screen
  //   Anything else (import, export, class...) is an error.
  // ===========================================================================================
  const stateNames = new Set();
  const setterOf = new Map(); // state name -> setter name
  const state = {};
  const screens = new Set();
  const stateDeclarators = [];
  for (const stmt of program.get("body")) {
    if (stmt.isVariableDeclaration()) {
      for (const d of stmt.get("declarations")) {
        if (!isUseStateCall(d.node.init)) continue;
        stateDeclarators.push(d);
        const declId = d.node.id;
        const [valueId, setterId] = t.isArrayPattern(declId) ? declId.elements : [];
        if (!t.isIdentifier(valueId) || (setterId && !t.isIdentifier(setterId)) || declId.elements.length > 2) {
          report("error", "Write state as: const [name, setName] = useState(startValue)", d.node);
          continue;
        }
        const name = valueId.name;
        if (["P", "S", "T"].includes(name)) { report("error", `"${name}" is a reserved name`, d.node); continue; }
        stateNames.add(name);
        if (setterId) setterOf.set(name, setterId.name);
        const args = d.node.init.arguments;
        if (args.length === 0) { state[name] = null; continue; }
        const result = startValue(d.get("init.arguments.0"));
        if (args.length === 1 && result.ok && isPlainData(result.value)) state[name] = result.value;
        else report("error", `useState for "${name}" must start with plain data (numbers, text, true/false, lists, objects)`, d.node);
      }
    } else if (stmt.isFunctionDeclaration() || stmt.isEmptyStatement()) {
      // helper (kept as is) or a stray semicolon
    } else if (stmt.isIfStatement() || stmt.isSwitchStatement() || stmt.isLoop() || stmt.isBlockStatement() || stmt.isTryStatement() ||
               (stmt.isExpressionStatement() && !t.isJSX(stmt.node.expression))) {
      // plain code that works out values before the screen (loops get P.tick() in step 6)
    } else if (stmt.isReturnStatement() && stmt.node.argument) {
      // return (<Card>...</Card>) at the top, as in a React component: the returned value is the screen.
      report("warning", "The screen needs no `return`; the returned value was used as the screen", stmt.node);
      const [screen] = stmt.replaceWith(t.expressionStatement(stmt.node.argument));
      screens.add(screen.node);
    } else if (stmt.isExpressionStatement() && (t.isJSXElement(stmt.node.expression) || t.isJSXFragment(stmt.node.expression))) {
      // Our own <>...</> wrapper around a single part: unwrap it.
      const expr = stmt.node.expression;
      if (t.isJSXFragment(expr)) {
        const parts = expr.children.filter((c) => !(t.isJSXText(c) && !c.value.trim()));
        if (parts.length === 1 && t.isJSXElement(parts[0])) stmt.node.expression = parts[0];
      }
      screens.add(stmt.node);
    } else {
      report("error", "Only useState lines, let/const lines, functions, plain code (if, loops) and the screen are allowed at the top", stmt.node);
    }
  }
  if (screens.size === 0) report("error", "No screen found: the block must end with a JSX tree", null);
  for (const d of stateDeclarators) d.remove();

  // ===========================================================================================
  // STEP 2: Replace each useState line with two plain lines (works just like React)
  //
  //   const [count, setCount] = useState(0)
  //     --->
  //   const count = S.count;                    the value at this draw (handlers see this value)
  //   const setCount = function (v) { ... };    takes a value or an update function:
  //                                             setCount(5), setCount(c => c + 1)
  //
  // State lives in S, so the runtime can save it. It redraws after every event.
  // ===========================================================================================
  const stateDecls = [];
  const stateValueNodes = new Set();
  for (const name of stateNames) {
    const valueDecl = parse(`const ${name} = S.${name};`).program.body[0];
    stateValueNodes.add(valueDecl.declarations[0]);
    stateDecls.push(valueDecl);
    const setter = setterOf.get(name);
    if (setter) stateDecls.push(parse(`const ${setter} = function (v) { S.${name} = typeof v === "function" ? v(S.${name}) : v; };`).program.body[0]);
  }
  if (stateDecls.length) program.unshiftContainer("body", stateDecls);
  program.scope.crawl();
  const isStateValue = (p, name) => {
    const b = p.scope.getBinding(name);
    return !!b && stateValueNodes.has(b.path.node);
  };

  // ===========================================================================================
  // STEP 3: Fix a React habit in event props
  //
  //   onChange={e => setName(e.target.value)}   --->   onChange={e => setName(e)}
  //   e.preventDefault()                         --->   removed
  //
  // Our onChange already gets the new value, not a browser event. (Wrong prop names like
  // onClick are fixed in STEP 5, from the catalog.)
  // ===========================================================================================
  program.traverse({
    JSXAttribute(p) {
      const attr = p.node;
      if (!t.isJSXIdentifier(attr.name)) return;
      if (!/^on[A-Z]/.test(attr.name.name) || !p.get("value").isJSXExpressionContainer()) return;
      const fn = p.get("value.expression");
      if (!fn.isFunction() || !t.isIdentifier(fn.node.params[0])) return;
      const param = fn.node.params[0];
      const binding = fn.scope.getBinding(param.name);
      let fixed = false;
      fn.traverse({
        MemberExpression(mp) {
          if (isTargetValue(mp.node, param) && mp.scope.getBinding(param.name) === binding) {
            mp.replaceWith(t.identifier(param.name));
            fixed = true;
          }
        },
        ExpressionStatement(sp) {
          const e = sp.node.expression;
          if (t.isCallExpression(e) && t.isMemberExpression(e.callee) && t.isIdentifier(e.callee.object, { name: param.name }) &&
              t.isIdentifier(e.callee.property) && ["preventDefault", "stopPropagation"].includes(e.callee.property.name) &&
              sp.scope.getBinding(param.name) === binding) {
            sp.remove();
            fixed = true;
          }
        }
      });
      if (fixed) report("warning", `${attr.name.name} gets the new value directly; ${param.name}.target.value was changed to ${param.name}`, attr);
    }
  });

  // ===========================================================================================
  // STEP 4: Safety checks on every name
  //   fetch, window, eval ...          error: only names in ALLOWED_GLOBALS may be used
  //   count = 5, count++               error: use setCount(...)
  //   useEffect(...)                   error: only useState
  //   items.push(x)                    warning: prefer setItems([...items, x])
  //   obj.constructor                  error: classic sandbox escape
  //   obj[k]                    --->   obj[P.key(k)]           checked again while running
  //   while (...) { ... }       --->   while (...) { P.tick(); ... }   stops endless loops
  // ===========================================================================================
  program.traverse({
    ThisExpression(p) { report("error", "`this` is not allowed", p.node); },
    "ClassDeclaration|ClassExpression"(p) { report("error", "Classes are not allowed", p.node); },
    "WithStatement|DebuggerStatement|YieldExpression|AwaitExpression|MetaProperty|Import"(p) {
      report("error", `${p.node.type} is not allowed`, p.node);
    },
    Identifier(p) {
      const { node, parent } = p;
      const name = node.name;
      const isWrite =
        (t.isAssignmentExpression(parent) && parent.left === node) ||
        (t.isUpdateExpression(parent) && parent.argument === node);
      if (!isWrite && !p.isReferencedIdentifier()) return;
      if (isWrite && isStateValue(p, name)) {
        const setter = setterOf.get(name);
        report("error", setter
          ? `"${name}" can't be changed directly; use ${setter}(...)`
          : `"${name}" can't be changed: its useState line has no setter`, node);
        return;
      }
      if (p.scope.getBinding(name)) return;
      if (name === "useState") report("error", "useState must be its own top-level line: const [x, setX] = useState(...)", node);
      else if (UNSUPPORTED_HOOKS.has(name)) report("error", `${name} is not supported yet; only useState`, node);
      else if (!ALLOWED_GLOBALS.has(name)) report("error", `Unknown name "${name}"`, node);
    },
    CallExpression(p) {
      // tasks.push(x) still works in our runtime, but it isn't the useState way. Report it so we can tune the prompt.
      const callee = p.node.callee;
      if (t.isMemberExpression(callee) && !callee.computed && t.isIdentifier(callee.object) &&
          isStateValue(p, callee.object.name) &&
          t.isIdentifier(callee.property) && MUTATING_METHODS.has(callee.property.name)) {
        const setter = setterOf.get(callee.object.name) || "its setter";
        report("warning", `${callee.object.name}.${callee.property.name}(...) changes state in place; prefer ${setter}(...) with a new value`, p.node);
      }
    },
    "MemberExpression|OptionalMemberExpression"(p) {
      const { node } = p;
      if (!node.computed) {
        if (t.isIdentifier(node.property) && BANNED_MEMBERS.has(node.property.name)) {
          report("error", `".${node.property.name}" is not allowed`, node);
        }
      } else if (t.isStringLiteral(node.property)) {
        if (BANNED_MEMBERS.has(node.property.value)) report("error", `["${node.property.value}"] is not allowed`, node);
      } else if (!t.isNumericLiteral(node.property)) {
        node.property = t.callExpression(pMember("key"), [node.property]);
      }
    },
    Loop(p) {
      const body = p.get("body");
      if (!body.isBlockStatement()) body.replaceWith(t.blockStatement([body.node]));
      p.get("body").unshiftContainer("body", t.expressionStatement(tickCall()));
    },
    Function(p) {
      if (p.node.async || p.node.generator) report("error", "async and generator functions are not allowed yet", p.node);
      const body = p.get("body");
      if (body.isBlockStatement()) body.unshiftContainer("body", t.expressionStatement(tickCall()));
      else body.replaceWith(t.sequenceExpression([tickCall(), body.node]));
    }
  });

  // ===========================================================================================
  // STEP 5: Turn tags into P.el calls, checked against the catalog (catalog.json)
  //
  //   <button danger onClick={go}>Delete</button>
  //     --->
  //   P.el("Button", "n3", { danger: true, onPress: P.on("h0", go) }, [T[0]])     T[0] = "Delete"
  //
  //   The AI's own components work like in React: a tag named after a function in the block
  //   becomes a call to it.
  //     const Steps = ({ title }) => <Card title={title}>...</Card>
  //     <Steps title="Loop" />          --->   Steps({ title: "Loop" })
  //
  //   For each other tag, in this order:
  //     a. Part name     exact, alias (<VStack> -> Stack) or capitalised (<button> -> Button); else dropped
  //     b. Placement     <Step> only in <Steps>, <Steps> only takes <Step>
  //     c. Props         name aliases (onClick -> onPress), literal values checked (status="error" -> "bad")
  //     d. Required      <Image> without src is dropped
  //     e. Children      none / text / parts; fixed words move to the text list (T)
  //     f. Safety net    every child wrapped in P.safe(...), so one crash hides only that part
  // ===========================================================================================
  const text = [];
  const textIndex = new Map();
  const textRef = (value) => {
    let i = textIndex.get(value);
    if (i === undefined) { i = text.length; text.push(value); textIndex.set(value, i); }
    return t.memberExpression(t.identifier("T"), t.numericLiteral(i), true);
  };
  const uses = new Set();
  let nodeCount = 0;
  let handlerCount = 0;
  let safeCount = 0;

  const putBack = (p, expr) => {
    if (p.parentPath.isJSXElement() || p.parentPath.isJSXFragment()) p.replaceWith(t.jsxExpressionContainer(expr));
    else p.replaceWith(expr);
  };
  const wrapChildren = (nodes, textOnly, partName) => {
    const out = [];
    for (const child of nodes) {
      if (t.isStringLiteral(child)) { out.push(textRef(child.value)); continue; }
      if (t.isNullLiteral(child)) continue;
      const isPart = t.isCallExpression(child) && t.isMemberExpression(child.callee) &&
        t.isIdentifier(child.callee.property, { name: "el" });
      if (isPart && textOnly) {
        // <Text><Text weight="semibold">Note:</Text> more</Text>: keep the inner words (not their style).
        const inner = child.arguments[3];
        if (t.isStringLiteral(child.arguments[0], { value: "Text" }) && t.isArrayExpression(inner)) {
          report("warning", `<Text> inside <${partName}>: its words were kept, its style dropped`, child);
          out.push(...inner.elements);
        } else {
          report("warning", `<${partName}> only takes text; the part inside it was dropped`, child);
        }
        continue;
      }
      const safeId = isPart ? child.arguments[1].value : `x${safeCount++}`;
      out.push(t.callExpression(pMember("safe"), [t.stringLiteral(safeId), t.arrowFunctionExpression([], child)]));
    }
    return out;
  };

  // The AI's own components: capitalised top-level functions (function Steps() / const Steps = () =>).
  const ownComponents = new Set();
  for (const stmt of program.node.body) {
    if (t.isFunctionDeclaration(stmt) && stmt.id && /^[A-Z]/.test(stmt.id.name)) ownComponents.add(stmt.id.name);
    if (t.isVariableDeclaration(stmt)) {
      for (const d of stmt.declarations) {
        if (t.isIdentifier(d.id) && /^[A-Z]/.test(d.id.name) && (t.isArrowFunctionExpression(d.init) || t.isFunctionExpression(d.init))) {
          ownComponents.add(d.id.name);
        }
      }
    }
  }

  program.traverse({
    JSXElement: {
      enter(p) { p.node.prismId = `n${nodeCount++}`; },
      exit(p) {
        const { node } = p;
        const nameNode = node.openingElement.name;
        const written = t.isJSXIdentifier(nameNode) ? nameNode.name : generate(nameNode).code;
        // <br /> is a common AI habit inside text: it becomes a line break, not a dropped part.
        if (written === "br" && !node.children.length) {
          putBack(p, t.stringLiteral("\n"));
          return;
        }
        if (ownComponents.has(written)) {
          // <Steps title="x">kids</Steps>  --->  Steps({ title: "x", children: [kids] })
          const props = [];
          for (const attr of node.openingElement.attributes) {
            if (t.isJSXSpreadAttribute(attr)) { props.push(t.spreadElement(attr.argument)); continue; }
            if (!t.isJSXIdentifier(attr.name)) continue;
            const value = attr.value === null ? t.booleanLiteral(true)
              : t.isJSXExpressionContainer(attr.value) ? attr.value.expression : attr.value;
            if (t.isJSXEmptyExpression(value)) continue;
            props.push(t.objectProperty(t.identifier(attr.name.name), value));
          }
          const kids = wrapChildren(t.react.buildChildren(node), false, written);
          if (kids.length) props.push(t.objectProperty(t.identifier("children"), t.arrayExpression(kids)));
          putBack(p, t.callExpression(t.identifier(written), [t.objectExpression(props)]));
          return;
        }
        // Basic blocks (box, text, button...) only when the caller allows them: our part library and
        // tests. For the AI, <box> is just an unknown part, so it can't style anything itself.
        const isBlock = blocks && Object.prototype.hasOwnProperty.call(catalog.blocks || {}, written);
        const name = isBlock ? written : resolvePartName(catalog, written);
        if (!name) {
          const off = catalog.offParts && catalog.offParts[written];
          report("warning", off && off.pack ? `<${written}> is in the "${off.pack}" pack, which this app hasn't turned on; it was dropped`
            : off ? `<${written}> needs part library ${off.since}, but this app has ${off.library}; it was dropped`
            : `Unknown part <${written}> was dropped`, node);
          putBack(p, t.nullLiteral());
          return;
        }
        if (name !== written) report("warning", `<${written}> was changed to <${name}>`, node);
        const spec = isBlock ? catalog.blocks[name] : catalog.parts[name];

        // Where it sits: <Cell> only inside <TableRow>, <Table> only takes <TableRow>, and so on.
        // Only checked when the parent is written right here; a part built in a helper is checked on the device.
        const parentEl = p.findParent((x) => x.isJSXElement());
        if (parentEl) {
          const parentNameNode = parentEl.node.openingElement.name;
          const parentName = t.isJSXIdentifier(parentNameNode) ? resolvePartName(catalog, parentNameNode.name) : null;
          const parentOnly = parentName ? childrenOf(catalog.parts[parentName]).only : null;
          if (parentName && spec.parents && !spec.parents.includes(parentName)) {
            report("warning", `<${name}> must be inside <${spec.parents.join("> or <")}>; dropped`, node);
            putBack(p, t.nullLiteral());
            return;
          }
          if (parentOnly && !parentOnly.includes(name)) {
            report("warning", `<${parentName}> only takes <${parentOnly.join("> or <")}>; <${name}> dropped`, node);
            putBack(p, t.nullLiteral());
            return;
          }
        }

        const props = [];
        const given = new Set();
        for (const attr of node.openingElement.attributes) {
          if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) {
            report("warning", `<${name}>: spread or namespaced props are not allowed`, attr);
            continue;
          }
          const writtenProp = attr.name.name;
          let value;
          if (attr.value === null) value = t.booleanLiteral(true);
          else if (t.isStringLiteral(attr.value)) value = attr.value;
          else if (t.isJSXExpressionContainer(attr.value) && !t.isJSXEmptyExpression(attr.value.expression)) value = attr.value.expression;
          else { report("warning", `<${name} ${writtenProp}>: value not understood, dropped`, attr); continue; }

          if (writtenProp === "key") { props.push(t.objectProperty(t.identifier("key"), value)); continue; }
          const propName = resolvePropName(catalog, spec, writtenProp);
          if (!propName) { report("warning", `<${name}> has no prop "${writtenProp}", dropped`, attr); continue; }
          if (given.has(propName)) { report("warning", `<${name}> has "${propName}" twice; the second was dropped`, attr); continue; }
          if (propName !== writtenProp) report("warning", `<${name} ${writtenProp}> was renamed to ${propName}`, attr);
          const prop = spec.props[propName];

          if (prop.type === "event") {
            if (literalValue(value) !== undefined) { report("warning", `<${name} ${propName}> must be a function; dropped`, attr); continue; }
            value = t.callExpression(pMember("on"), [t.stringLiteral(`h${handlerCount++}`), value]);
          } else {
            // Literal values are checked now, with the runtime's own rules. The rest is checked on the device.
            const literal = literalValue(value);
            if (literal !== undefined) {
              const r = runtime.checkValue(compactProp(catalog, prop), literal, data);
              if (r.err) { report("warning", `<${name} ${propName}>: ${r.err}; dropped`, attr); continue; }
              if (r.fixed && r.v !== literal) {
                report("warning", `<${name} ${propName}=${JSON.stringify(literal)}> was changed to ${JSON.stringify(r.v)}`, attr);
              }
              value = prop.type === "text" ? textRef(r.v) : t.valueToNode(r.v);
            }
          }
          given.add(propName);
          props.push(t.objectProperty(t.identifier(propName), value));
        }

        const missing = Object.keys(spec.props).filter((k) => spec.props[k].required && !given.has(k));
        if (missing.length) {
          report("warning", `<${name}> needs ${missing.join(", ")}; dropped`, node);
          putBack(p, t.nullLiteral());
          return;
        }
        if (!isBlock) uses.add(name); // blocks need no spec in the envelope: the runtime has them

        const kids = childrenOf(spec);
        let children = t.react.buildChildren(node);
        if (kids.kind === "none" && children.length) {
          report("warning", `<${name}> takes no children; they were dropped`, node);
          children = [];
        }
        if (!isBlock && kids.kind === "parts" && !kids.only && children.some((c) => t.isStringLiteral(c) || !t.isCallExpression(c))) uses.add("Text");
        children = wrapChildren(children, kids.kind === "text", name);

        putBack(p, t.callExpression(pMember("el"), [
          t.stringLiteral(name),
          t.stringLiteral(node.prismId),
          props.length ? t.objectExpression(props) : t.nullLiteral(),
          children.length ? t.arrayExpression(children) : t.nullLiteral()
        ]));
      }
    },
    JSXFragment: {
      exit(p) {
        putBack(p, t.arrayExpression(wrapChildren(t.react.buildChildren(p.node), false, "Fragment")));
      }
    }
  });

  // Any error so far refuses the whole block. Warnings were fixed and let through.
  if (diagnostics.some((d) => d.level === "error")) return failed();

  // ===========================================================================================
  // STEP 6: Build the envelope
  //
  //   P.screen(function (S, T) {
  //     const count = S.count;           <- setup lines (STEP 2 and the AI's own)
  //     ...
  //     return P.el("Card", ...);        <- the screen (STEP 5)
  //   });
  //
  //   envelope = { code, text, state, uses, spec, ... }
  //   spec: the catalog rules for each part used, so the device checks and completes every prop.
  // ===========================================================================================
  const setup = [];
  const screenExprs = [];
  for (const stmt of program.node.body) {
    if (screens.has(stmt)) screenExprs.push(stmt.expression);
    else if (!t.isEmptyStatement(stmt)) setup.push(stmt);
  }
  // Several parts side by side (written in a row, or as top-level lines) go into one Stack.
  const single = screenExprs.length === 1 && !t.isArrayExpression(screenExprs[0]);
  if (!single) uses.add("Stack");
  const root = single
    ? screenExprs[0]
    : t.callExpression(pMember("el"), [t.stringLiteral("Stack"), t.stringLiteral("root"), t.nullLiteral(),
      screenExprs.length === 1 ? screenExprs[0] : t.arrayExpression(screenExprs)]);
  const screenFn = t.functionExpression(null, [t.identifier("S"), t.identifier("T")],
    t.blockStatement([...setup, t.returnStatement(root)]));
  const code = generate(t.program([t.expressionStatement(t.callExpression(pMember("screen"), [screenFn]))]), { comments: false }).code;

  const used = [...uses].sort();
  const spec = Object.fromEntries(used.map((name) => [name, compactPart(catalog, name)]));
  // needs: the oldest part library that can draw this screen (the newest "since" of its parts).
  // A device with an older library shows the fallback text instead of a broken screen.
  let needsLibrary = "1.0.0";
  for (const name of used) {
    const since = catalog.parts[name] && catalog.parts[name].since;
    if (since && newerVersion(since, needsLibrary)) needsLibrary = since;
  }
  const envelope = { v: 1, id, ok: true, code, text, state, uses: used, needs: { library: needsLibrary }, spec, appData: data, fallback: "", diagnostics };

  // ===========================================================================================
  // STEP 7: Test draw
  //   Run the envelope once with the real runtime, exactly like a device would.
  //   Crashes become warnings, and the drawn tree becomes the plain-text backup (`fallback`).
  // ===========================================================================================
  const first = JSON.parse(runtime.load(`compile:${id}`, JSON.stringify(envelope)));
  runtime.unload(`compile:${id}`);
  for (const e of first.errors) report("warning", `Part ${e.node} failed on first draw: ${e.message}`, null);
  if (!first.tree) {
    report("error", "The screen could not be drawn", null);
    return failed();
  }
  envelope.fallback = toMarkdown(first.tree, data);
  return envelope;
}

/** Split an AI reply into Markdown parts and compiled ```prism blocks. */
export function compileMessage(markdown, { messageId = "msg", catalog = defaultCatalog, packs, library, appData = {} } = {}) {
  const parts = [];
  const re = /```prism[^\n]*\n([\s\S]*?)```/g;
  let last = 0;
  let index = 0;
  let m;
  while ((m = re.exec(markdown))) {
    const before = markdown.slice(last, m.index).trim();
    if (before) parts.push({ type: "markdown", text: before });
    parts.push({ type: "prism", envelope: compile(m[1], { id: `${messageId}/block_${index++}`, catalog, packs, library, appData }) });
    last = m.index + m[0].length;
  }
  const rest = markdown.slice(last).trim();
  if (rest) parts.push({ type: "markdown", text: rest });
  return parts;
}

/** Plain-text version of a screen tree, for old apps and errors. */
export function toMarkdown(tree, appData = { images: {} }) {
  const textOf = (n) => (n.c || []).map((c) => (typeof c === "string" ? c : textOf(c))).join(" ").trim();
  const lines = [];
  // Basic blocks (what library parts are drawn with) read like the parts of the same name.
  const AS_PART = { checkbox: "Checkbox", switch: "Switch", progress: "Progress", select: "Select", chart: "Chart",
    image: "Image", input: "Input", slider: "Slider", divider: "Divider", spacer: "Spacer", button: "Button" };
  const walk = (n, out) => {
    const p = n.p || {};
    switch (AS_PART[n.t] || n.t) {
      case "text":
        if (p.role === "count") out.push(`${textOf(n)}.`);
        else out.push(p.role === "title" || p.role === "number" || p.strong ? `**${textOf(n)}**` : textOf(n));
        break;
      case "box": {
        const inner = [];
        (n.c || []).forEach((c) => typeof c !== "string" && walk(c, inner));
        const joined = p.dir === "row" ? [inner.join(" ").replace(/\s+/g, " ").trim()] : inner;
        if (p.surface === "note") { const body = joined.join(" "); if (body) out.push(`> ${body}`); }
        else out.push(...joined);
        break;
      }
      case "Title": out.push(`**${textOf(n)}**`); break;
      case "Text": case "Badge": out.push(textOf(n)); break;
      case "Card":
        if (p.title) out.push(`**${p.title}**`);
        if (p.subtitle) out.push(p.subtitle);
        (n.c || []).forEach((c) => typeof c !== "string" && walk(c, out));
        break;
      case "Callout": {
        const inner = [];
        (n.c || []).forEach((c) => typeof c !== "string" && walk(c, inner));
        const body = [p.title ? `**${p.title}**` : "", ...inner].filter(Boolean).join(" ");
        if (body) out.push(`> ${body}`);
        break;
      }
      case "Stat": out.push(`${p.label}: **${p.value}**${p.change ? ` (${p.change})` : ""}`); break;
      case "Select": {
        const chosen = (p.options || []).find((o) => o.value === p.value);
        out.push(`${p.label || "Choice"}: ${chosen ? chosen.label : "none"}`);
        break;
      }
      case "Row": {
        const inner = [];
        (n.c || []).forEach((c) => typeof c !== "string" && walk(c, inner));
        if (inner.length) out.push(inner.join(" ").replace(/\s+/g, " ").trim());
        break;
      }
      case "Checkbox": out.push(`- [${p.value ? "x" : " "}] ${p.label || ""}`.trim()); break;
      case "Switch": out.push(`${p.label || "Switch"}: ${p.value ? "on" : "off"}`); break;
      // A progress block without a label sits next to words that already say it (the Progress part).
      case "Progress": if (n.t !== "progress" || p.label) out.push(`${p.label ? p.label + ": " : ""}${Math.round((p.value || 0) * 100)}%`); break;
      case "Table": {
        const rows = (n.c || []).filter((r) => typeof r !== "string").map((r) =>
          (r.c || []).filter((c) => typeof c !== "string").map(textOf));
        if (rows.length) {
          out.push(`| ${rows[0].join(" | ")} |`);
          out.push(`|${rows[0].map(() => "---").join("|")}|`);
          rows.slice(1).forEach((r) => out.push(`| ${r.join(" | ")} |`));
        }
        break;
      }
      case "Chart": {
        // A small table: one row per label, one column per series.
        const series = p.data || [];
        const count = Math.max(0, ...series.map((s) => s.values.length));
        const names = series.map((s, i) => s.name || (series.length > 1 ? `Series ${i + 1}` : "Value"));
        if (p.label) out.push(`**${p.label}**`);
        out.push(`| ${["", ...names].join(" | ")} |`.replace("|  |", "| |"));
        out.push(`|${["", ...names].map(() => "---").join("|")}|`);
        for (let i = 0; i < count; i++) {
          const label = (p.labels && p.labels[i]) || String(i + 1);
          out.push(`| ${[label, ...series.map((s) => (s.values[i] == null ? "" : String(s.values[i])))].join(" | ")} |`);
        }
        break;
      }
      case "Image": {
        const url = appData.images[p.src];
        out.push(url ? `![${p.alt}](${url})` : `[${p.alt}]`);
        break;
      }
      case "Button": case "Input": case "Slider": case "Divider": case "Spacer": break;
      default: (n.c || []).forEach((c) => (typeof c === "string" ? out.push(c) : walk(c, out)));
    }
  };
  walk(tree, lines);
  return lines.filter(Boolean).join("\n");
}

// ===========================================================================================
// WORKED EXAMPLE: a counter, through every step of compile()
// ===========================================================================================
//
// The AI's block:
//
//   const [count, setCount] = useState(0)
//   const double = count * 2
//
//   <Card title="Counter">
//     <Text>Count: {count}</Text>
//     <Button onPress={() => setCount(count + 1)}>Add 1</Button>
//   </Card>
//
// STEP 0: Read the text
//   The screen starts at "<Card" (first line beginning with "<"). Add ";" before it and wrap the
//   screen in <>...</>:
//
//     const double = count * 2;          <- without ";" this reads as `count * 2 < Card ...`
//     <><Card title="Counter"> ... </Card></>
//
//   Babel then reads the text into a tree.
//
// STEP 1: Sort the top lines
//   const [count, setCount] = useState(0)   state line: state = { count: 0 }, setter = setCount
//                                            (the line is removed; STEP 2 puts back its own)
//   const double = count * 2                normal line, kept as is (not run here)
//   <Card>...</Card>                        the screen; the <>...</> wrapper is removed (one part)
//
// STEP 2: Replace useState
//   const count = S.count;                                          read from the state box S
//   const setCount = function (v) { S.count = typeof v === "function" ? v(S.count) : v; };
//
// STEP 3: Fix event habits
//   onPress={() => setCount(count + 1)} has no event parameter, so nothing changes.
//   (onPress={e => { e.preventDefault(); ... }} would lose the preventDefault line.)
//
// STEP 4: Safety checks
//   count, setCount, double are all made in the block: allowed.
//   `count = count + 1` would be an error (use setCount); `fetch(...)` would be an error.
//   Every function gets P.tick() so endless loops are stopped:
//     () => setCount(count + 1)   --->   () => (P.tick(), setCount(count + 1))
//
// STEP 5: Tags to calls
//   Fixed words go to the text list T. Inner parts finish first, so the order is:
//     T[0] = "Count: "    (Text)
//     T[1] = "Add 1"      (Button)
//     T[2] = "Counter"    (Card title)
//   Each tag becomes P.el(part name, id, props, children):
//     <Card title="Counter">               P.el("Card",   "n0", { title: T[2] }, [...])
//     <Text>Count: {count}</Text>          P.el("Text",   "n1", null, [T[0], count])
//     <Button onPress={...}>Add 1</Button> P.el("Button", "n2", { onPress: P.on("h0", ...) }, [T[1]])
//   Each child is wrapped in P.safe(id, () => ...), so one crash hides only that part.
//
// STEP 6: Build the envelope
//   code:
//     P.screen(function (S, T) {
//       const count = S.count;
//       const setCount = function (v) {
//         P.tick();
//         S.count = typeof v === "function" ? v(S.count) : v;
//       };
//       const double = count * 2;
//       return P.el("Card", "n0", {
//         title: T[2]
//       }, [P.safe("n1", () => P.el("Text", "n1", null, [T[0], P.safe("x0", () => count)])), P.safe("n2", () => P.el("Button", "n2", {
//         onPress: P.on("h0", () => (P.tick(), setCount(count + 1)))
//       }, [T[1]]))]);
//     });
//   text:  ["Count: ", "Add 1", "Counter"]
//   state: { count: 0 }
//   uses:  ["Button", "Card", "Text"]
//   spec:  the catalog rules for Button, Card, Text
//   ok:    true, diagnostics: []
//
// STEP 7: Test draw
//   Drawn once with the real runtime: no crashes. The plain-text backup (buttons are skipped):
//     fallback: "**Counter**\nCount: 0"
//
// On the device: S = { count: 0 } shows "Count: 0". Tapping "Add 1" runs setCount(1),
// S.count becomes 1, the screen is drawn again and shows "Count: 1".
// ===========================================================================================
