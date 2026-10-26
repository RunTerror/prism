/*
 * Prism part library: builds the AI's chat parts from basic blocks (ARCHITECTURE.md section 9).
 *
 * The AI writes <Quiz question=… />; when the screen draws, the runtime calls Quiz(p, kids, ui)
 * here, and the blocks it returns are what reaches the drawer. New parts and design fixes ship
 * by updating this file on the server: apps load a newer copy with prism.setLibrary(code), and
 * every SDK carries a copy inside, so the first screen never waits.
 *
 * Every part gets:
 *   p     its props, already checked against catalog.json (defaults filled in)
 *   kids  its children, already drawn (blocks or strings)
 *   ui    ui.h(type, props, children)  a basic block
 *         ui.use(name, start)          [value, set]: a part's own state (kept in snapshots)
 *         ui.on(name, fn)              a handler for a block's onPress / onChange
 *         ui.emit(event, value)        call the AI's handler for this part (onChange…)
 *         ui.ask(text)                 send text as the user's next message
 *
 * Plain ES5 on purpose: it runs as-is in JavaScriptCore, QuickJS, V8 and browsers.
 */
(function (root) {
  "use strict";

  function nodes(kids) {
    var out = [];
    for (var i = 0; i < kids.length; i++) if (kids[i] && typeof kids[i] === "object") out.push(kids[i]);
    return out;
  }

  function pick(p, names) {
    var out = {};
    for (var i = 0; i < names.length; i++) if (p[names[i]] !== undefined) out[names[i]] = p[names[i]];
    return out;
  }
  /** No card inside a card: an inner card becomes a recessed area. */
  function flattenCards(kids) {
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (!n || typeof n !== "object") continue;
      if (n.t === "box" && n.p && n.p.surface === "card") n.p.surface = "sunk";
      if (n.c) flattenCards(n.c);
    }
    return kids;
  }
  /** What a drawn child is, for laying out a Row: "text", "pill", "button", "box" (a column of things) or "other". */
  function kind(n) {
    if (!n || typeof n !== "object") return "other";
    if (n.t === "text") return "text";
    if (n.t === "button") return "button";
    if (n.t === "box") return n.p && n.p.surface === "pill" ? "pill" : n.p && n.p.dir === "row" ? "other" : "box";
    return "other";
  }

  /**
   * The line that joins numbered or dotted items: a marker on top, then a vertical line that fills
   * the rest of the item's height (the item row stretches its children). The last item has no line.
   */
  function rail(ui, marker, last) {
    var parts = [marker];
    if (!last) parts.push(ui.h("box", { grow: true, align: "center" }, [ui.h("divider", { vertical: true }, [])]));
    return ui.h("box", { align: "center", gap: "xs" }, parts);
  }

  /** A control block whose events call the AI's handlers. */
  function control(type, names) {
    return function (p, kids, ui) {
      var props = pick(p, names);
      props.onChange = ui.on("change", function (v) { ui.emit("change", v); });
      if (type === "input") props.onSubmit = ui.on("submit", function (v) { ui.emit("submit", v); });
      return ui.h(type, props, []);
    };
  }

  // Arrows like ↩ and ↗ carry U+FE0E ("draw as text"), or iOS shows them as emoji.
  var parts = {
    // ---------- Layout ----------

    Stack: function (p, kids, ui) {
      return ui.h("box", { gap: p.tight ? "sm" : "md", align: p.align }, kids);
    },

    /**
     * Side by side, laid out from what is inside (the AI never sets widths):
     * - columns of things (Stat, Field…) share the width equally and line up at the top;
     * - otherwise text takes the free space, so a Badge or Button after it sits at the end;
     * - wrap (tags, chips) keeps everything at its own size.
     */
    Row: function (p, kids, ui) {
      var items = nodes(kids);
      if (p.wrap) return ui.h("box", { dir: "row", gap: p.tight ? "xs" : "sm", align: p.align || "center", wrap: true }, items);
      var columns = 0, texts = 0;
      for (var i = 0; i < items.length; i++) {
        var k = kind(items[i]);
        if (k === "box") columns++;
        if (k === "text") texts++;
      }
      var out = [];
      for (var j = 0; j < items.length; j++) {
        var kj = kind(items[j]);
        var grows = columns ? kj === "box" || kj === "text" : kj === "text";
        out.push(grows ? ui.h("box", { grow: true }, [items[j]]) : items[j]);
      }
      return ui.h("box", {
        dir: "row", gap: p.tight ? "xs" : columns > 1 ? "lg" : "sm",
        // Columns of different heights line up at the top (align is hidden from the AI, so it always has its default).
        align: columns ? "start" : p.align || "center", justify: p.justify
      }, out);
    },

    /** Equal columns, filled row by row; empty cells keep the last row lined up. */
    Grid: function (p, kids, ui) {
      var cols = Math.max(1, p.columns || 2);
      var items = nodes(kids);
      var gap = p.tight ? "sm" : "md";
      var rows = [];
      for (var i = 0; i < items.length; i += cols) {
        var cells = [];
        for (var j = 0; j < cols; j++) cells.push(ui.h("box", { grow: true }, items[i + j] ? [items[i + j]] : []));
        rows.push(ui.h("box", { dir: "row", gap: gap }, cells));
      }
      return ui.h("box", { gap: gap }, rows);
    },

    /** A card; with `image`, the picture sits at the top, inside the card's padding. */
    Card: function (p, kids, ui) {
      var top = p.image ? [ui.h("image", { src: p.image, alt: p.title || "", ratio: "wide" }, [])] : [];
      var head = [];
      if (p.title) head.push(ui.h("text", { role: "title" }, [p.title]));
      if (p.subtitle) head.push(ui.h("text", { role: "secondary" }, [p.subtitle]));
      var children = top.concat(head.length ? [ui.h("box", { gap: "xs" }, head)] : []);
      return ui.h("box", { surface: "card", pad: "lg", gap: "md" }, children.concat(flattenCards(kids)));
    },

    Divider: function (p, kids, ui) { return ui.h("divider", {}, []); },
    Spacer: function (p, kids, ui) { return ui.h("spacer", {}, []); },

    // ---------- Content ----------

    Title: function (p, kids, ui) {
      return ui.h("text", { role: "title", align: p.align }, kids);
    },

    Text: function (p, kids, ui) {
      return ui.h("text", {
        role: p.secondary ? "secondary" : "body", strong: !!p.strong, status: p.status,
        align: p.align, lines: p.lines, strike: p.strike
      }, kids);
    },

    Badge: function (p, kids, ui) {
      var status = p.status;
      // A pill's padding comes from the drawer (badge tokens: less above and below, more at the sides).
      return ui.h("box", { surface: "pill", status: status }, [ui.h("text", { role: "label", status: status }, kids)]);
    },

    Callout: function (p, kids, ui) {
      var status = p.status;
      var children = p.title ? [ui.h("text", { strong: true, status: status }, [p.title])] : [];
      return ui.h("box", { surface: "note", status: status, pad: "md", gap: "xs" }, children.concat(kids));
    },

    /** A key number: small label, big value, and how it changed. */
    Stat: function (p, kids, ui) {
      var change = p.change;
      var children = [ui.h("text", { role: "secondary" }, [p.label]), ui.h("text", { role: "number", lines: 1 }, [p.value])];
      if (change) children.push(ui.h("text", { role: "secondary", status: p.status }, [change]));
      return ui.h("box", { gap: "xs", label: p.label + ": " + p.value + (change ? ", " + change : "") }, children);
    },

    Progress: function (p, kids, ui) {
      // With a label, the words and the percent are drawn above the bar (and read out), so the bar
      // itself has no label; without one, the bar says "Progress".
      if (!p.label) return ui.h("progress", { value: p.value, status: p.status, label: "Progress" }, []);
      var bar = ui.h("progress", { value: p.value, status: p.status }, []);
      var percent = Math.round(Math.max(0, Math.min(1, p.value || 0)) * 100) + "%";
      return ui.h("box", { gap: "xs" }, [
        ui.h("box", { dir: "row", gap: "sm", align: "center" }, [
          ui.h("box", { grow: true }, [ui.h("text", { role: "secondary" }, [p.label])]),
          ui.h("text", { role: "secondary", strong: true }, [percent])
        ]),
        bar
      ]);
    },

    /** Rows with a line between them. */
    Table: function (p, kids, ui) {
      var rows = nodes(kids);
      var out = [];
      for (var i = 0; i < rows.length; i++) {
        if (i > 0) out.push(ui.h("divider", {}, []));
        out.push(rows[i]);
      }
      return ui.h("box", { role: "list" }, out);
    },

    TableRow: function (p, kids, ui) {
      return ui.h("box", { dir: "row", gap: "sm", role: "item" }, nodes(kids));
    },

    Cell: function (p, kids, ui) {
      return ui.h("box", { grow: true, pad: "sm" }, [
        ui.h("text", { role: p.header ? "label" : "body", align: p.align }, kids)
      ]);
    },

    Chart: function (p, kids, ui) {
      return ui.h("chart", pick(p, ["data", "labels", "kind", "height", "label"]), []);
    },

    Image: function (p, kids, ui) {
      return ui.h("image", pick(p, ["src", "alt", "ratio", "fit"]), []);
    },

    // ---------- Controls ----------

    /** One main action per screen: later "main" buttons become quiet ones. */
    Button: function (p, kids, ui) {
      var main = !!p.main;
      if (main) {
        if (ui.screen.mainButton) main = false;
        else ui.screen.mainButton = true;
      }
      var kind = p.danger ? "danger" : main ? "main" : "quiet";
      return ui.h("button", {
        kind: kind, label: p.label, disabled: p.disabled,
        onPress: ui.on("press", function () { ui.emit("press"); })
      }, kids);
    },

    Checkbox: control("checkbox", ["value", "label", "disabled"]),
    Switch: control("switch", ["value", "label", "disabled"]),
    Input: control("input", ["value", "label", "placeholder", "kind", "multiline", "disabled"]),
    Slider: control("slider", ["value", "min", "max", "step", "label", "disabled"]),
    Select: control("select", ["value", "options", "label", "placeholder", "disabled"]),

    // ---------- Chat parts ----------

    /**
     * Numbered steps joined by a line: a number in a circle, the step's title beside it, its words
     * under the title. The space between steps is inside each step, so the line never breaks.
     */
    Steps: function (p, kids, ui) {
      var steps = nodes(kids);
      var rows = [];
      for (var i = 0; i < steps.length; i++) {
        var last = i === steps.length - 1;
        var body = [steps[i]];
        if (!last) body.push(ui.h("box", { pad: "xs" }, []));
        rows.push(ui.h("box", { dir: "row", gap: "md", align: "stretch", role: "item" }, [
          rail(ui, ui.h("text", { role: "count" }, [String(i + 1)]), last),
          ui.h("box", { grow: true }, body)
        ]));
      }
      return ui.h("box", { role: "list" }, rows);
    },

    Step: function (p, kids, ui) {
      return ui.h("box", { gap: "xs" }, [ui.h("text", { strong: true }, [p.title])].concat(kids));
    },

    /**
     * How something works: boxes and arrows, laid out by the part (the AI never places anything).
     * Without links, the boxes join in the order given and each box's `via` labels the arrow into
     * it. With links:
     * - a box goes one row below the lowest box that links to it (boxes are listed first to last);
     * - a row holds at most 3 boxes side by side; arrows (with their labels) join neighbouring rows;
     * - a link back up (a retry) or one that skips rows becomes a small note on its box, never a
     *   line across the picture.
     */
    Flow: function (p, kids, ui) {
      var nodes = p.nodes.slice(0, 8);
      var index = {};
      for (var i = 0; i < nodes.length; i++) {
        var key = String(nodes[i].id != null ? nodes[i].id : nodes[i].title);
        if (!(key in index)) index[key] = i;
        if (nodes[i].title != null && !(String(nodes[i].title) in index)) index[String(nodes[i].title)] = i;
      }
      var links = [];
      if (!p.links || !p.links.length) {
        for (var s0 = 1; s0 < nodes.length; s0++) links.push({ from: s0 - 1, to: s0, label: nodes[s0].via != null ? String(nodes[s0].via) : "" });
      }
      for (var l = 0; p.links && l < p.links.length; l++) {
        var a = index[String(p.links[l].from)], b = index[String(p.links[l].to)];
        if (a != null && b != null && a !== b) links.push({ from: a, to: b, label: p.links[l].label != null ? String(p.links[l].label) : "" });
      }
      // Levels: a forward link (to a box listed later) puts its target at least one level lower.
      var level = [];
      for (var n = 0; n < nodes.length; n++) level.push(0);
      for (var t = 0; t < nodes.length; t++) {
        for (var k = 0; k < links.length; k++) {
          if (links[k].to === t && links[k].from < t) level[t] = Math.max(level[t], level[links[k].from] + 1);
        }
      }
      var rows = [];
      for (var m = 0; m < nodes.length; m++) (rows[level[m]] = rows[level[m]] || []).push(m);
      // At most 3 side by side: a longer level carries on in a second row (no arrows between them).
      var lines = [];
      for (var r = 0; r < rows.length; r++) {
        if (!rows[r]) continue;
        for (var c = 0; c < rows[r].length; c += 3) lines.push({ level: r, items: rows[r].slice(c, c + 3), first: c === 0 });
      }
      var title = function (i) { return String(nodes[i].title != null ? nodes[i].title : nodes[i].id); };
      var box = function (i, alone) {
        var words = [ui.h("text", { strong: true, align: "center" }, [title(i)])];
        if (nodes[i].detail) words.push(ui.h("text", { role: "secondary", align: "center" }, [String(nodes[i].detail)]));
        for (var q = 0; q < links.length; q++) {
          var x = links[q];
          if (x.from !== i) continue;
          var back = x.to < x.from, skip = !back && level[x.to] > level[x.from] + 1;
          if (back || skip) words.push(ui.h("text", { role: "secondary", status: undefined, align: "center" },
            [(back ? "\u21A9\uFE0E " : "→ ") + title(x.to) + (x.label ? " · " + x.label : "")]));
        }
        // The box itself grows, so boxes side by side are the same height.
        return ui.h("box", { grow: true, surface: "sunk", pad: alone ? "md" : "sm", gap: "xs", align: "center", justify: "center", role: "item" }, words);
      };
      var out = [];
      for (var d = 0; d < lines.length; d++) {
        var line = lines[d];
        if (d > 0 && line.first) {
          // Arrows with their labels, side by side ("↓ sends"). Usually one under each box above that
          // links down; when several boxes join into one, each arrow sits under its own box.
          var above = lines[d - 1].items, below = line.items;
          var join = below.length < above.length;
          var columns = join ? above : below;
          var arrows = [];
          for (var e = 0; e < columns.length; e++) {
            var said = [], any = false;
            for (var g = 0; g < links.length; g++) {
              var y = links[g];
              if (y.from > y.to || level[y.from] !== line.level - 1) continue;
              if (join ? y.from === columns[e] && below.indexOf(y.to) >= 0 : y.to === columns[e]) {
                any = true;
                if (y.label) said.push(y.label);
              }
            }
            var bits = any ? [ui.h("text", { role: "secondary", strong: true }, ["↓"])] : [];
            if (any && said.length) bits.push(ui.h("text", { role: "secondary" }, [said.join(" · ")]));
            arrows.push(ui.h("box", { grow: true, dir: "row", gap: "xs", align: "center", justify: "center", pad: "xs" }, bits));
          }
          out.push(ui.h("box", { dir: "row", gap: "sm" }, arrows));
        } else if (d > 0) {
          out.push(ui.h("box", { pad: "xs" }, []));
        }
        var cells = [];
        for (var f = 0; f < line.items.length; f++) cells.push(box(line.items[f], line.items.length === 1));
        out.push(ui.h("box", { dir: "row", gap: "sm", align: "stretch" }, cells));
      }
      return ui.h("box", { role: "list", label: "Flow, top to bottom" }, out);
    },

    /** Code to read and copy: a small header (language, Copy), then the code, scrolling sideways. */
    Code: function (p, kids, ui) {
      var copied = ui.use("copied", false);
      var code = String(p.code || "").replace(/\s+$/, "");
      return ui.h("box", { surface: "sunk", pad: "md", gap: "sm", role: "group", label: "Code" + (p.language ? ", " + p.language : "") }, [
        ui.h("box", { dir: "row", gap: "sm", align: "center" }, [
          ui.h("box", { grow: true }, [ui.h("text", { role: "secondary", strong: true }, [p.language || "Code"])]),
          ui.h("box", {
            dir: "row", gap: "xs", align: "center", label: "Copy code",
            onPress: ui.on("copy", function () { ui.copy(code); copied[1](true); })
          }, [ui.h("text", { role: "secondary", strong: true }, [copied[0] ? "Copied ✓" : "Copy"])])
        ]),
        ui.h("text", { role: "code" }, [code])
      ]);
    },

    /** Hidden until tapped: a quiet row with the label, the parts below it when open. */
    Reveal: function (p, kids, ui) {
      var open = ui.use("open", false);
      return ui.h("box", { surface: "sunk", pad: "md", gap: "md", role: "group" }, [
        ui.h("box", {
          dir: "row", gap: "sm", align: "center", label: p.label + (open[0] ? ", open" : ", closed"),
          onPress: ui.on("toggle", function () { open[1](!open[0]); })
        }, [
          ui.h("box", { grow: true }, [ui.h("text", { strong: true }, [p.label])]),
          ui.h("text", { role: "secondary", strong: true }, [open[0] ? "Hide" : "Show"])
        ]),
        ui.h("collapse", { open: !!open[0] }, [ui.h("box", { gap: "md" }, flattenCards(kids))])
      ]);
    },

    /**
     * Pick one (or several): pills when the labels are short and have no detail, rows otherwise.
     * The look comes from the content, never from the AI.
     */
    Options: function (p, kids, ui) {
      var opts = p.options.slice(0, 6);
      var many = !!p.multiple;
      var own = ui.use("value", many ? [] : p.value != null ? p.value : null);
      var chosen = !many && p.value != null ? p.value : own[0];
      var isOn = function (v) { return many ? chosen.indexOf(v) >= 0 : chosen === v; };
      var rows = false;
      for (var i = 0; i < opts.length; i++) if (opts[i].detail || opts[i].label.length > 24) rows = true;
      var out = [];
      for (var j = 0; j < opts.length; j++) {
        (function (o, index) {
          var on = isOn(o.value);
          var press = ui.on("pick" + index, function () {
            var next = o.value;
            if (many) {
              next = chosen.slice();
              var at = next.indexOf(o.value);
              if (at >= 0) next.splice(at, 1); else next.push(o.value);
            }
            own[1](next);
            ui.emit("change", next);
          });
          if (!rows) {
            out.push(ui.h("button", { kind: "quiet", selected: on, onPress: press }, [(on && many ? "✓ " : "") + o.label]));
            return;
          }
          var words = [ui.h("text", { strong: on }, [o.label])];
          if (o.detail) words.push(ui.h("text", { role: "secondary" }, [o.detail]));
          out.push(ui.h("box", {
            dir: "row", gap: "md", align: "center", pad: "md", surface: "sunk", onPress: press,
            label: o.label + (on ? ", selected" : "")
          }, [
            ui.h("box", { grow: true, gap: "xs" }, words),
            on ? ui.h("text", { role: "count" }, ["✓"]) : ui.h("text", { role: "secondary" }, [many ? "Add" : "Pick"])
          ]));
        })(opts[j], j);
      }
      return rows
        ? ui.h("box", { gap: "sm", role: "group" }, out)
        : ui.h("box", { dir: "row", gap: "sm", wrap: true, role: "group" }, out);
    },

    /**
     * A few answers sent together. The form checks them (required, email, number, phone) and shows
     * a short error under a field; the AI never writes error text. After sending, it locks.
     */
    Form: function (p, kids, ui) {
      var fields = p.fields.slice(0, 6);
      var values = ui.use("values", {});
      var tried = ui.use("tried", false);
      var sent = ui.use("sent", false);
      var problem = function (f) {
        var v = String(values[0][f.name] == null ? "" : values[0][f.name]).trim();
        if (!v) return f.required ? "Please fill this in." : null;
        if (f.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "That doesn't look like an email.";
        if (f.kind === "number" && isNaN(Number(v))) return "Please enter a number.";
        if (f.kind === "phone" && v.replace(/[\s()+-]/g, "").length < 7) return "That number looks too short.";
        return null;
      };
      var out = [];
      var bad = 0;
      for (var i = 0; i < fields.length; i++) {
        (function (f, index) {
          var name = String(f.name || "field" + index);
          f.name = name;
          var err = problem(f);
          if (err) bad++;
          var input = ui.h("input", {
            label: String(f.label || name) + (f.required ? " *" : ""),
            placeholder: f.placeholder != null ? String(f.placeholder) : undefined,
            value: values[0][name] == null ? "" : String(values[0][name]),
            kind: f.kind === "number" ? "number" : f.kind === "email" ? "email" : undefined,
            multiline: f.kind === "long",
            disabled: !!sent[0],
            onChange: ui.on("set" + index, function (v) {
              var next = {};
              for (var k in values[0]) next[k] = values[0][k];
              next[name] = v;
              values[1](next);
            })
          }, []);
          out.push(err && tried[0] && !sent[0]
            ? ui.h("box", { gap: "xs" }, [input, ui.h("text", { role: "secondary", status: "bad" }, [err])])
            : input);
        })(fields[i], i);
      }
      out.push(ui.h("button", {
        kind: "main", full: true, disabled: !!sent[0],
        onPress: ui.on("submit", function () {
          tried[1](true);
          if (bad) return;
          sent[1](true);
          var answers = {};
          for (var k = 0; k < fields.length; k++) answers[fields[k].name] = values[0][fields[k].name] == null ? "" : values[0][fields[k].name];
          if (ui.listens("submit")) ui.emit("submit", answers);
          else {
            var lines = [];
            for (var m = 0; m < fields.length; m++) lines.push((fields[m].label || fields[m].name) + ": " + answers[fields[m].name]);
            ui.ask(lines.join("\n"));
          }
        })
      }, [sent[0] ? "Sent ✓" : p.submit]));
      return ui.h("box", { gap: "md", role: "group", label: "Form" }, out);
    },

    /** Where the facts came from: numbered rows; a tap opens the page. */
    Sources: function (p, kids, ui) {
      var rows = [ui.h("text", { role: "secondary", strong: true }, ["Sources"])];
      for (var i = 0; i < p.items.length; i++) {
        (function (s, index) {
          var url = String(s.url || "");
          var safe = /^https:\/\//i.test(url);
          var site = s.site ? String(s.site) : safe ? url.replace(/^https:\/\/(www\.)?/i, "").split("/")[0] : "";
          var row = { dir: "row", gap: "md", align: "center", role: "item", label: "Source " + (index + 1) + ", " + (s.title || site) };
          if (safe) row.onPress = ui.on("open" + index, function () { ui.open(url); });
          var words = [ui.h("text", { lines: 1 }, [String(s.title || site || url)])];
          if (site) words.push(ui.h("text", { role: "secondary", lines: 1 }, [site]));
          var cells = [ui.h("text", { role: "count" }, [String(index + 1)]), ui.h("box", { grow: true }, words)];
          if (safe) cells.push(ui.h("text", { role: "secondary" }, ["\u2197\uFE0E"]));
          rows.push(ui.h("box", row, cells));
        })(p.items[i], i);
      }
      return ui.h("box", { gap: "md", role: "list" }, rows);
    },

    /**
     * An agent's plan: each step with its state, joined by a line like Steps. When every step is
     * done (or skipped), it folds into one line ("Done · 4 steps") that opens on tap.
     */
    Plan: function (p, kids, ui) {
      var items = p.items.slice(0, 8);
      var marks = { done: ["✓", "good"], failed: ["!", "bad"], skipped: ["–", undefined] };
      var allDone = items.length > 0;
      var rows = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var state = String(it.state || "waiting");
        if (state !== "done" && state !== "skipped") allDone = false; // finished, one way or another
        var mark = marks[state];
        var last = i === items.length - 1;
        var words = [ui.h("text", {
          strong: state === "running", role: state === "done" || state === "skipped" ? "secondary" : "body",
          strike: state === "skipped", status: state === "failed" ? "bad" : undefined
        }, [String(it.title || "")])];
        if (state === "running") words.push(ui.h("text", { role: "secondary" }, [it.detail ? String(it.detail) : "Working on it…"]));
        else if (it.detail) words.push(ui.h("text", { role: "secondary", status: state === "failed" ? "bad" : undefined }, [String(it.detail)]));
        if (!last) words.push(ui.h("box", { pad: "xs" }, []));
        rows.push(ui.h("box", { dir: "row", gap: "md", align: "stretch", role: "item", label: "Step " + (i + 1) + ", " + it.title + ", " + state }, [
          rail(ui, ui.h("text", { role: "count", status: mark ? mark[1] : undefined }, [mark ? mark[0] : String(i + 1)]), last),
          ui.h("box", { grow: true, gap: "xs" }, words)
        ]));
      }
      var list = ui.h("box", { role: "list" }, rows);
      if (!allDone) return list;
      var open = ui.use("open", false);
      return ui.h("box", { gap: "md" }, [
        ui.h("box", {
          dir: "row", gap: "sm", align: "center", label: "Done, " + items.length + " steps",
          onPress: ui.on("toggle", function () { open[1](!open[0]); })
        }, [
          ui.h("text", { role: "count", status: "good" }, ["✓"]),
          ui.h("box", { grow: true }, [ui.h("text", { strong: true }, ["Done · " + items.length + " steps"])]),
          ui.h("text", { role: "secondary", strong: true }, [open[0] ? "Hide" : "Show"])
        ]),
        ui.h("collapse", { open: !!open[0] }, [list])
      ]);
    },

    /**
     * Ask before acting. Allow asks the app to do `action` (only parts can do that), then the card
     * locks and says what happened. A danger action gets a red button, never the accent.
     */
    Confirm: function (p, kids, ui) {
      var state = ui.use("state", "ask");
      var children = [ui.h("text", { role: "title" }, [p.title])].concat(flattenCards(kids));
      if (state[0] === "ask") {
        children.push(ui.h("box", { dir: "row", gap: "sm" }, [
          ui.h("box", { grow: true }, [ui.h("button", {
            kind: "quiet", full: true,
            onPress: ui.on("cancel", function () { state[1]("cancelled"); ui.emit("cancel"); })
          }, ["Cancel"])]),
          ui.h("box", { grow: true }, [ui.h("button", {
            kind: p.danger ? "danger" : "main", full: true,
            onPress: ui.on("allow", function () { state[1]("allowed"); ui.action(p.action, p.args); ui.emit("allow"); })
          }, [p.allow])])
        ]));
      } else {
        var yes = state[0] === "allowed";
        children.push(ui.h("box", { dir: "row", gap: "sm", align: "center" }, [
          ui.h("text", { role: "count", status: yes ? "good" : undefined }, [yes ? "✓" : "–"]),
          ui.h("text", { role: "secondary", strong: true }, [yes ? "Allowed. The app is doing it." : "Cancelled. Nothing was done."])
        ]));
      }
      return ui.h("box", { surface: "card", pad: "lg", gap: "md", role: "group" }, children);
    },

    /** A segmented control: one main button for the chosen option, plain ones for the rest. */
    Choice: function (p, kids, ui) {
      var own = ui.use("value", p.value != null ? p.value : p.options.length ? p.options[0].value : null);
      var chosen = p.value != null ? p.value : own[0];
      var buttons = [];
      for (var i = 0; i < p.options.length; i++) {
        (function (o) {
          buttons.push(ui.h("box", { grow: true }, [
            ui.h("button", {
              full: true,
              kind: "plain",
              selected: o.value === chosen,
              onPress: ui.on("pick" + i, function () { own[1](o.value); ui.emit("change", o.value); })
            }, [o.label])
          ]));
        })(p.options[i]);
      }
      return ui.h("box", { dir: "row", gap: "xs", surface: "sunk", pad: "xs", role: "group" }, buttons);
    },

    /** Label on the left, value on the right. */
    Field: function (p, kids, ui) {
      return ui.h("box", { dir: "row", gap: "md", align: "center", justify: "between" }, [
        ui.h("box", { grow: true }, [ui.h("text", { role: "secondary" }, [p.label])]),
        ui.h("text", { align: "end" }, [p.value])
      ]);
    },

    /** A question card; after a tap, a green or red note explains the answer. */
    Quiz: function (p, kids, ui) {
      var picked = ui.use("picked", null);
      var done = picked[0] !== null;
      var children = [ui.h("text", { role: "title" }, [p.question])];
      for (var i = 0; i < p.options.length; i++) {
        (function (index) {
          // After a pick: the right answer turns green, a wrong pick red, the rest stay grey.
          var status = !done ? undefined : index === p.answer ? "good" : index === picked[0] ? "bad" : undefined;
          var mark = !done ? String.fromCharCode(65 + index) : index === p.answer ? "✓" : index === picked[0] ? "✗" : String.fromCharCode(65 + index);
          var row = { dir: "row", gap: "md", align: "center", pad: "md", surface: status ? "note" : "sunk", status: status,
            label: String.fromCharCode(65 + index) + ": " + p.options[index] };
          if (!done) row.onPress = ui.on("pick" + index, function () { picked[1](index); });
          children.push(ui.h("box", row, [
            ui.h("text", { role: "count", status: status }, [mark]),
            ui.h("box", { grow: true }, [ui.h("text", { status: status }, [p.options[index]])])
          ]));
        })(i);
      }
      if (done) {
        var right = picked[0] === p.answer;
        var note = [ui.h("text", { strong: true, status: right ? "good" : "bad" }, [right ? "Correct!" : "Not quite"])];
        if (p.explain) note.push(ui.h("text", {}, [p.explain]));
        children.push(ui.h("box", { gap: "xs", pad: "xs" }, note));
      }
      return ui.h("box", { surface: "card", pad: "lg", gap: "sm", role: "group" }, children);
    },

    /** Suggested next questions; a tap sends one as the user's message. */
    FollowUps: function (p, kids, ui) {
      var buttons = [];
      for (var i = 0; i < p.items.length; i++) {
        (function (text, index) {
          buttons.push(ui.h("button", { onPress: ui.on("ask" + index, function () { ui.ask(text); }) }, [text]));
        })(p.items[i], i);
      }
      return ui.h("box", { dir: "row", gap: "sm", wrap: true }, buttons);
    },

    /**
     * Options compared field by field: two side by side, more as cards to swipe. With onChange,
     * each card can be chosen (a quiet selected button, so the screen keeps one main action).
     */
    Compare: function (p, kids, ui) {
      var items = p.items.slice(0, 4);
      var own = ui.use("value", p.value != null ? p.value : null);
      var chosen = p.value != null ? p.value : own[0];
      var pickable = ui.listens("change");
      var cards = [];
      for (var i = 0; i < items.length; i++) {
        (function (item, index) {
          var name = item[p.name] != null ? String(item[p.name]) : "";
          var lines = [ui.h("text", { role: "title" }, [name])];
          for (var f = 0; f < p.fields.length; f++) {
            var field = p.fields[f];
            var value = item[field.value];
            var label = String(field.label);
            lines.push(ui.h("box", { gap: "xs" }, [
              ui.h("text", { role: "secondary" }, [label.charAt(0).toUpperCase() + label.slice(1)]),
              ui.h("text", { strong: true }, [value == null ? "—" : String(value)])
            ]));
          }
          if (pickable) {
            lines.push(ui.h("button", {
              full: true, selected: name === chosen,
              onPress: ui.on("pick" + index, function () { own[1](name); ui.emit("change", name); })
            }, [name === chosen ? "Chosen" : "Choose"]));
          }
          cards.push(ui.h("box", { surface: "card", pad: "md", gap: "sm", role: "item" }, lines));
        })(items[i], i);
      }
      if (cards.length <= 2) {
        var cells = [];
        for (var c = 0; c < cards.length; c++) cells.push(ui.h("box", { grow: true }, [cards[c]]));
        return ui.h("box", { dir: "row", gap: "sm", align: "stretch", role: "list" }, cells);
      }
      return ui.h("pager", { peek: true, gap: "sm" }, cards);
    },

    /** Cards to swipe through. */
    Carousel: function (p, kids, ui) {
      return ui.h("pager", { peek: true, gap: "md" }, nodes(kids));
    }
  };

  // version: this library (VERSIONS.md). blocks: the blocks version a drawer needs to draw it
  // (2: text roles count and code, divider vertical).
  var library = { version: "1.6.0", blocks: 2, parts: parts };

  // Keep the newest copy that this device can draw: a newer library from the server wins, unless
  // it needs blocks this device's drawer doesn't have (then the copy inside the SDK stays).
  var current = root.prismLibrary;
  var drawable = library.blocks <= (root.prismBlocksVersion || 1);
  if (drawable && (!current || newer(library.version, current.version))) root.prismLibrary = library;

  function newer(a, b) {
    var x = String(a).split("."), y = String(b).split(".");
    for (var i = 0; i < 3; i++) {
      var d = (Number(x[i]) || 0) - (Number(y[i]) || 0);
      if (d) return d > 0;
    }
    return false;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
