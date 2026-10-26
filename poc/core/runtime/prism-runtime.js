/*
 * Prism runtime. The same file runs on every platform:
 * browser Web Worker, Electron, JavaScriptCore (iOS), V8 sandbox (Android), Node (server, tests).
 *
 * The host only needs "run a JS string, get a string back". Every call below takes and
 * returns strings, so no platform needs a special bridge.
 *
 *   prism.load(instanceId, envelopeJson, savedStateJson?) -> outputJson
 *   prism.event(instanceId, handlerId, valueJson?)        -> outputJson
 *   prism.unload(instanceId)                              -> "true"
 *
 * outputJson = { "tree": node|null, "state": {...}, "effects": [...], "errors": [...] }
 *
 * When the envelope has a `spec` (made from catalog.json), every prop in the tree is checked and
 * completed: defaults filled in, aliases fixed, bad values replaced. Drawers can trust it.
 *
 * Basic blocks (box, text, button, pager...; lowercase names) are checked the same way, against
 * the block specs given once with prism.setBlocks(spec). The build adds that call to
 * dist/prism-runtime.js, so devices always have them. See ARCHITECTURE.md section 9.
 */
(function (root) {
  "use strict";

  var MAX_STEPS = 200000;
  // Chart limits: more than this can't be read on a phone anyway, and keeps the tree small.
  var MAX_SERIES = 5;
  var MAX_POINTS = 200;
  var instances = {};
  // Basic block specs (lowercase names), from catalog.json "blocks". Set once by prism.setBlocks.
  var BLOCKS = {};

  // The part library (core/library/prism-library.js) sets root.prismLibrary when it loads. Every
  // SDK carries a copy; prism.setLibrary(code) loads a newer one from the server.
  function library() {
    return root.prismLibrary || null;
  }
  // Returned by P.safe when a part fails, so a parent whose children all failed can disappear too.
  var FAILED = { prismFailed: true };

  function StopError(message) {
    this.message = message;
    this.prismStop = true;
  }

  /** True when version a ("1.6.0") is newer than b. */
  function newerVersion(a, b) {
    var x = String(a).split("."), y = String(b).split(".");
    for (var i = 0; i < 3; i++) {
      var d = (Number(x[i]) || 0) - (Number(y[i]) || 0);
      if (d) return d > 0;
    }
    return false;
  }

  function copy(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function eventName(prop) {
    // onPress -> press, onChange -> change
    return prop.charAt(2).toLowerCase() + prop.slice(3);
  }

  function pushChildren(out, value) {
    if (value === null || value === undefined || value === false || value === true || value === "" || value === FAILED) return;
    if (Array.isArray(value)) {
      for (var i = 0; i < value.length; i++) pushChildren(out, value[i]);
      return;
    }
    if (typeof value === "number") value = String(value);
    if (typeof value === "string") {
      // Join neighbouring text so drawers get "1 of 2 done", not ["1", " of ", "2", " done"].
      if (out.length && typeof out[out.length - 1] === "string") out[out.length - 1] += value;
      else out.push(value);
      return;
    }
    if (typeof value === "object" && value.t) out.push(value);
  }

  function has(obj, key) {
    return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function describe(v) {
    return typeof v === "string" ? '"' + v + '"' : String(v);
  }

  // One chart value: a number, a number written as text, or null (a gap) for anything else.
  function chartNumber(x) {
    if (typeof x === "number" && isFinite(x)) return x;
    if (typeof x === "string" && x.trim() !== "" && isFinite(Number(x))) return Number(x);
    return null;
  }

  // Chart data, always as [{ name, values }]. A flat list of numbers becomes one series.
  function checkSeries(v) {
    if (!Array.isArray(v) || v.length === 0) return { err: "must be a list of numbers" };
    var flat = true;
    for (var i = 0; i < v.length; i++) if (v[i] && typeof v[i] === "object") { flat = false; break; }
    var input = flat ? [{ name: "", values: v }] : v;
    var out = [];
    var fixed = false;
    for (var j = 0; j < input.length && out.length < MAX_SERIES; j++) {
      var item = input[j];
      var raw = item && typeof item === "object" ? (Array.isArray(item) ? item : item.values) : null;
      if (!Array.isArray(raw)) { fixed = true; continue; }
      var values = [];
      for (var k = 0; k < raw.length && k < MAX_POINTS; k++) {
        var n = chartNumber(raw[k]);
        if (n !== raw[k]) fixed = true;
        values.push(n);
      }
      if (raw.length > MAX_POINTS) fixed = true;
      var name = item && !Array.isArray(item) && (typeof item.name === "string" || typeof item.name === "number") ? String(item.name) : "";
      out.push({ name: name, values: values });
    }
    if (input.length > MAX_SERIES) fixed = true;
    var any = false;
    for (var m = 0; m < out.length && !any; m++) for (var q = 0; q < out[m].values.length; q++) if (out[m].values[q] !== null) { any = true; break; }
    if (!any) return { err: "has no numbers" };
    return { v: out, fixed: fixed };
  }

  /*
   * Checks one prop value against its spec (made by the compiler from catalog.json).
   * Returns { v } when fine, { v, fixed: true } when it was repaired, { err } when unusable.
   * The compiler uses this same function for literal values, so server and device agree.
   *   spec: { t: "enum" | "text" | "string" | "number" | "bool" | "options" | "series" | "textList" | "asset",
   *           e: values, a: aliases, min, max, int }
   *   ctx:  { images: { name: url } }, the images the server approved for this reply (appData)
   */
  function checkValue(s, v, ctx) {
    switch (s.t) {
      case "enum": {
        if (typeof v === "number" && s.a && has(s.a, String(v))) return { v: s.a[String(v)], fixed: true };
        if (typeof v !== "string") return { err: "must be one of " + s.e.join(", ") };
        if (s.e.indexOf(v) >= 0) return { v: v };
        var lower = v.toLowerCase();
        if (s.e.indexOf(lower) >= 0) return { v: lower, fixed: true };
        if (s.a && has(s.a, v)) return { v: s.a[v], fixed: true };
        if (s.a && has(s.a, lower)) return { v: s.a[lower], fixed: true };
        return { err: describe(v) + " is not one of " + s.e.join(", ") };
      }
      case "number": {
        var n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
        if (!isFinite(n)) return { err: describe(v) + " is not a number" };
        var fixed = typeof v !== "number";
        if (s.int && n !== Math.round(n)) { n = Math.round(n); fixed = true; }
        if (s.min != null && n < s.min) { n = s.min; fixed = true; }
        if (s.max != null && n > s.max) { n = s.max; fixed = true; }
        return { v: n, fixed: fixed };
      }
      case "bool":
        if (typeof v === "boolean") return { v: v };
        if (v === "true" || v === "false") return { v: v === "true", fixed: true };
        return { v: !!v };
      case "text":
      case "string":
        if (typeof v === "string") return { v: v };
        if (typeof v === "number" && isFinite(v)) return { v: String(v) };
        return { err: "must be text" };
      case "options": {
        if (!Array.isArray(v)) return { err: "must be a list" };
        var out = [];
        for (var i = 0; i < v.length; i++) {
          var o = v[i];
          if (typeof o === "string" || (typeof o === "number" && isFinite(o))) out.push({ label: String(o), value: String(o) });
          else if (o && typeof o === "object" && (has(o, "value") || has(o, "label"))) {
            var value = has(o, "value") ? o.value : o.label;
            var label = has(o, "label") ? o.label : o.value;
            if ((typeof value === "string" || typeof value === "number") && (typeof label === "string" || typeof label === "number")) {
              var opt = { label: String(label), value: String(value) };
              if (typeof o.detail === "string" && o.detail) opt.detail = o.detail; // a second line (Options)
              out.push(opt);
            }
          }
        }
        return { v: out, fixed: out.length !== v.length };
      }
      case "series":
        return checkSeries(v);
      case "textList": {
        if (!Array.isArray(v)) return { err: "must be a list" };
        var texts = [];
        for (var t = 0; t < v.length && t < MAX_POINTS; t++) {
          var x = v[t];
          texts.push(typeof x === "string" ? x : typeof x === "number" && isFinite(x) ? String(x) : "");
        }
        var changed = v.length > MAX_POINTS;
        for (var u = 0; u < texts.length && !changed; u++) if (texts[u] !== v[u]) changed = true;
        return { v: texts, fixed: changed };
      }
      case "items": {
        // A list of things (Compare): up to 8 objects; each value plain text, a number or true/false.
        if (!Array.isArray(v)) return { err: "must be a list" };
        var items = [];
        for (var it = 0; it < v.length && items.length < 8; it++) {
          var src = v[it];
          if (!src || typeof src !== "object" || Array.isArray(src)) continue;
          var item = {};
          for (var key in src) {
            var x = src[key];
            if (typeof x === "string" || typeof x === "boolean" || (typeof x === "number" && isFinite(x))) item[key] = x;
          }
          items.push(item);
        }
        return { v: items, fixed: items.length !== v.length };
      }
      case "record": {
        // One object of plain values (Confirm's args for the app).
        if (!v || typeof v !== "object" || Array.isArray(v)) return { err: "must be an object" };
        var rec = {}, dropped = false;
        for (var rk in v) {
          var rv = v[rk];
          if (typeof rv === "string" || typeof rv === "boolean" || (typeof rv === "number" && isFinite(rv))) rec[rk] = rv;
          else dropped = true;
        }
        return { v: rec, fixed: dropped };
      }
      case "asset": {
        // Only a name the server approved. A web address typed by the AI is never loaded.
        var images = (ctx && ctx.images) || {};
        if (typeof v !== "string") return { err: "must be an image name" };
        if (has(images, v)) return { v: v };
        return { err: describe(v) + " is not an image supplied for this reply" };
      }
      default:
        return { v: v };
    }
  }

  // Props checked against the part's spec: aliases fixed, bad values replaced by the default,
  // defaults filled in. Drawers can then trust every prop they get.
  function resolveProps(inst, type, id, spec, given) {
    var p = {};
    for (var k in given) {
      var s = spec.p[k];
      if (!s) continue;
      var r = checkValue(s, given[k], inst.appData);
      if (r.err) inst.errors.push({ node: id, message: type + " " + k + ": " + r.err });
      else p[k] = r.v;
    }
    for (var name in spec.p) {
      var ps = spec.p[name];
      if (p[name] === undefined && has(ps, "d")) p[name] = ps.d;
      if (ps.btw) {
        // A value kept between two other props, like Slider value between min and max.
        var lo = p[ps.btw[0]];
        var hi = p[ps.btw[1]];
        if (typeof lo === "number" && typeof hi === "number") {
          if (hi < lo) hi = p[ps.btw[1]] = lo;
          if (p[name] === undefined) p[name] = lo;
          else p[name] = Math.min(hi, Math.max(lo, p[name]));
        }
      }
      if (ps.r && p[name] === undefined) {
        inst.errors.push({ node: id, message: type + " needs " + name });
        return null;
      }
    }
    return p;
  }

  // Children checked against the part's spec:
  //   none  -> no children
  //   text  -> only text (parts inside are dropped)
  //   parts -> loose text becomes a Text part, so <Card>Hello</Card> works; `only` limits which parts
  function fitChildren(inst, P, type, id, spec, c) {
    var out = [];
    if (spec.c === "none") return out;
    for (var i = 0; i < c.length; i++) {
      var child = c[i];
      if (spec.c === "text") {
        if (typeof child === "string") out.push(child);
        else inst.errors.push({ node: id, message: type + " only takes text; " + child.t + " dropped" });
      } else if (typeof child === "string") {
        if (spec.only || !child.trim()) continue;
        // Loose text becomes a Text part (or a text block inside a block), so <Card>Hello</Card> works.
        var wrapped = P.el(has(BLOCKS, type) ? "text" : "Text", id + "~" + i, null, [child.trim()]);
        if (wrapped !== FAILED) out.push(wrapped);
      } else if (spec.only && spec.only.indexOf(child.part || child.t) < 0) {
        inst.errors.push({ node: id, message: type + " only takes " + spec.only.join(", ") + "; " + child.t + " dropped" });
      } else {
        out.push(child);
      }
    }
    return out;
  }

  function makeP(inst) {
    var P = {};

    P.screen = function (fn) {
      inst.screen = fn;
    };

    P.el = function (type, id, props, children) {
      var spec = has(BLOCKS, type) ? BLOCKS[type] : inst.spec ? inst.spec[type] : null;
      var node = { t: type, id: id };
      var p = null;
      var on = null;
      if (props) {
        for (var k in props) {
          var v = props[k];
          if (v === undefined || v === null) continue;
          if (k === "key") {
            node.k = v;
          } else if (v && v.prismHandler) {
            (on || (on = {}))[eventName(k)] = v.id;
          } else if (typeof v !== "function") {
            (p || (p = {}))[k] = v;
          }
        }
      }
      if (spec) {
        p = resolveProps(inst, type, id, spec, p || {});
        if (!p) return FAILED;
        var any = false;
        for (var pk in p) { any = true; break; }
        if (!any) p = null;
      }
      if (p) node.p = p;
      // Every child failed (e.g. <Text>{items[0].name}</Text> crashed): drop the whole part.
      if (children && children.length) {
        var allFailed = true;
        for (var i = 0; i < children.length; i++) if (children[i] !== FAILED) { allFailed = false; break; }
        if (allFailed) return FAILED;
      }
      var c = [];
      pushChildren(c, children);
      if (spec && c.length) c = fitChildren(inst, P, type, id, spec, c);
      if (c.length) node.c = c;
      if (on) node.on = on;
      var lib = library();
      if (lib && !inst.raw && !has(BLOCKS, type) && has(lib.parts, type)) return expand(lib.parts[type], node);
      return node;
    };

    // A library part (ARCHITECTURE.md section 9): its library function turns it into basic blocks.
    // `node` is the part as written (props checked, children drawn); the blocks replace it.
    function expand(fn, node) {
      var key = node.k !== undefined ? node.id + ":" + node.k : node.id;
      var count = 0;
      var all = inst.state.__parts || (inst.state.__parts = {});
      var mine = has(all, key) ? all[key] : (all[key] = {});
      var on = node.on || {};
      var ui = {
        h: function (type, props, children) { return P.el(type, key + "/" + count++, props || null, children || null); },
        use: function (name, start) {
          if (!has(mine, name)) mine[name] = start === undefined ? null : copy(start);
          return [mine[name], function (value) { mine[name] = value; }];
        },
        on: function (name, f) { return P.on(key + "~" + name, f); },
        listens: function (event) { return has(on, event); },
        emit: function (event, value) {
          var f = has(on, event) ? inst.handlers[on[event]] : null;
          if (f) f(value);
        },
        ask: function (text) { P.ask(text); },
        open: function (url) { P.open(url); },
        copy: function (text) { P.copy(text); },
        toast: function (text) { P.toast(text); },
        // Ask the app to do one of its actions. Only parts can (Confirm, after the user taps Allow):
        // the AI's own code has no P.action, so it can never act without asking.
        action: function (name, args) {
          inst.effects.push({ type: "action", value: JSON.stringify({ name: String(name), args: args || {} }) });
        },
        // Shared by every part in this draw of the screen: rules across parts (one main button).
        screen: inst.shared
      };
      var out = fn(node.p || {}, node.c || [], ui);
      if (Array.isArray(out)) out = P.el("box", key + "/root", null, out);
      if (!out || typeof out !== "object" || !out.t) return FAILED;
      // Remember which part this was (not sent to drawers), so <Steps> still accepts only <Step>.
      Object.defineProperty(out, "part", { value: node.t, enumerable: false });
      return out;
    }

    // Gives each handler a name the device can send back. The same handler inside a list
    // gets h0, h0#1, h0#2 ... in drawing order.
    P.on = function (base, fn) {
      var n = inst.handlerCounts[base] || 0;
      inst.handlerCounts[base] = n + 1;
      var id = n ? base + "#" + n : base;
      inst.handlers[id] = fn;
      return { prismHandler: true, id: id };
    };

    // If one part of the screen fails, only that part disappears.
    P.safe = function (id, fn) {
      try {
        return fn();
      } catch (e) {
        if (e && e.prismStop) throw e;
        inst.errors.push({ node: id, message: String((e && e.message) || e) });
        return FAILED;
      }
    };

    // Counts steps so an endless loop stops on every engine.
    P.tick = function () {
      if (++inst.steps > MAX_STEPS) throw new StopError("Stopped: too many steps");
    };

    // Guards obj[key] lookups written by the AI.
    P.key = function (key) {
      if (key === "constructor" || key === "__proto__" || key === "prototype") {
        throw new Error("Not allowed: " + key);
      }
      return key;
    };

    P.toast = function (text) { inst.effects.push({ type: "toast", value: String(text) }); };
    P.open = function (url) { inst.effects.push({ type: "open", value: String(url) }); };
    P.copy = function (text) { inst.effects.push({ type: "copy", value: String(text) }); };
    P.ask = function (text) { inst.effects.push({ type: "ask", value: String(text) }); };

    return Object.freeze(P);
  }

  // Chart series colours, in order: series 1 is the accent, the others calm chart colours (tokens
  // chart2-5), never status colours. Up to 5, so no two series share a colour, and drawers only
  // read series.tone. The other "few colours" rules (DESIGN-SYSTEM.md) live in the part library.
  var CHART_TONES = ["primary", "chart2", "chart3", "chart4", "chart5"];

  function calm(tree) {
    function walk(n) {
      if (!n || typeof n !== "object") return;
      var p = n.p;
      if (p && (n.t === "Chart" || n.t === "chart") && p.data) {
        for (var s = 0; s < p.data.length; s++) p.data[s].tone = CHART_TONES[s % CHART_TONES.length];
      }
      if (n.c) for (var i = 0; i < n.c.length; i++) walk(n.c[i]);
    }
    walk(tree);
    return tree;
  }

  function render(inst) {
    inst.handlers = {};
    inst.handlerCounts = {};
    inst.steps = 0;
    inst.shared = {}; // for library rules across the whole screen (one main button)
    try {
      var tree = inst.screen(inst.state, inst.text);
      if (Array.isArray(tree)) tree = makeP(inst).el("Stack", "root", null, tree);
      return tree && tree !== FAILED ? calm(tree) : null;
    } catch (e) {
      inst.errors.push({ node: "root", message: String((e && e.message) || e) });
      return null;
    }
  }

  function output(inst, tree) {
    var out = JSON.stringify({ tree: tree, state: inst.state, effects: inst.effects, errors: inst.errors });
    inst.effects = [];
    inst.errors = [];
    return out;
  }

  function failure(message) {
    return JSON.stringify({ tree: null, state: {}, effects: [], errors: [{ node: "root", message: message }] });
  }

  var prism = {
    version: 1,

    /**
     * Loads a part library from its code (core/library/prism-library.js, as sent by the server).
     * An older or equal version than the one loaded is ignored. Returns the version in use.
     */
    setLibrary: function (code) {
      try {
        new Function(code)();
      } catch (e) {
        return "error: " + String((e && e.message) || e);
      }
      var lib = library();
      return lib ? String(lib.version) : "none";
    },

    /** The version of the part library in use, or "none". */
    libraryVersion: function () {
      var lib = library();
      return lib ? String(lib.version) : "none";
    },

    /** Gives the runtime the basic block specs (compactBlocks(catalog)). Called once, at start. */
    /**
     * The basic blocks this device's drawer can draw, and their version (VERSIONS.md). A part
     * library that needs newer blocks won't load (it checks globalThis.prismBlocksVersion).
     */
    setBlocks: function (spec, version) {
      BLOCKS = (typeof spec === "string" ? JSON.parse(spec) : spec) || {};
      if (version) root.prismBlocksVersion = Number(version);
      return "true";
    },

    /** The blocks version this device's drawer draws (1 if never set). */
    blocksVersion: function () {
      return String(root.prismBlocksVersion || 1);
    },

    // options (JSON, optional): { "raw": true } keeps parts as parts instead of library blocks.
    // Only for tests that check a part's own inputs; devices never pass it.
    load: function (instanceId, envelopeJson, savedStateJson, optionsJson) {
      var env;
      try {
        env = typeof envelopeJson === "string" ? JSON.parse(envelopeJson) : envelopeJson;
      } catch (e) {
        return failure("Bad envelope");
      }
      if (!env || env.v !== 1 || !env.code) return failure("Envelope cannot be shown");
      // A screen made for a newer part library than this device has: show the fallback text
      // (tree null) instead of parts it can't draw.
      var lib = library();
      if (env.needs && env.needs.library && (!lib || newerVersion(env.needs.library, lib.version))) {
        return failure("Needs part library " + env.needs.library + "; this device has " + (lib ? lib.version : "none"));
      }

      var inst = {
        state: copy(env.state || {}),
        text: env.text || [],
        spec: env.spec || null,
        appData: env.appData || {},
        screen: null,
        handlers: {},
        handlerCounts: {},
        effects: [],
        errors: [],
        steps: 0,
        raw: false,
        shared: {}
      };
      try {
        inst.raw = !!(optionsJson && JSON.parse(optionsJson).raw);
      } catch (e) {
        inst.raw = false;
      }
      if (savedStateJson) {
        try {
          var saved = typeof savedStateJson === "string" ? JSON.parse(savedStateJson) : savedStateJson;
          for (var k in saved) inst.state[k] = saved[k];
        } catch (e) {
          inst.errors.push({ node: "root", message: "Saved state ignored" });
        }
      }

      try {
        // The code only gets P. The server already refused any other outside names.
        new Function("P", env.code)(makeP(inst));
      } catch (e) {
        return failure("Code failed to start: " + String((e && e.message) || e));
      }
      if (typeof inst.screen !== "function") return failure("Code has no screen");

      instances[instanceId] = inst;
      return output(inst, render(inst));
    },

    event: function (instanceId, handlerId, valueJson) {
      var inst = instances[instanceId];
      if (!inst) return failure("Unknown instance " + instanceId);
      var fn = inst.handlers[handlerId];
      if (fn) {
        var value;
        if (valueJson !== undefined && valueJson !== null && valueJson !== "") {
          try {
            value = typeof valueJson === "string" ? JSON.parse(valueJson) : valueJson;
          } catch (e) {
            value = valueJson;
          }
        }
        inst.steps = 0;
        try {
          fn(value);
        } catch (e) {
          inst.errors.push({ node: handlerId, message: String((e && e.message) || e) });
        }
      } else {
        inst.errors.push({ node: handlerId, message: "Unknown handler" });
      }
      return output(inst, render(inst));
    },

    unload: function (instanceId) {
      delete instances[instanceId];
      return "true";
    },

    // Used by the compiler to check literal values with the same rules as the device.
    checkValue: checkValue
  };

  root.prism = prism;
  if (typeof module !== "undefined" && module.exports) module.exports = prism;
})(typeof globalThis !== "undefined" ? globalThis : this);
