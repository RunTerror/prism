import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { compile, compileMessage } from "../compiler/index.js";

const require = createRequire(import.meta.url);
const prism = require("../runtime/prism-runtime.js");
const example = (name) => readFileSync(new URL(`../examples/${name}.prism`, import.meta.url), "utf8");

const warnings = (env) => env.diagnostics.filter((d) => d.level === "warning").map((d) => d.message);
const errors = (env) => env.diagnostics.filter((d) => d.level === "error").map((d) => d.message);

let n = 0;
const RAW = JSON.stringify({ raw: true }); // parts stay parts (see start below)
// By default parts stay parts ("raw"), so tests can check each part's own inputs. { expand: true }
// draws like a device does: the part library turns parts into basic blocks.
function start(source, options = {}) {
  const { expand, ...compileOptions } = options;
  const env = compile(source, compileOptions);
  assert.ok(env.ok, JSON.stringify(env.diagnostics));
  const id = `t${n++}`;
  const out = JSON.parse(prism.load(id, JSON.stringify(env), undefined, expand ? undefined : JSON.stringify({ raw: true })));
  return {
    env, out,
    send(handler, value) {
      this.out = JSON.parse(prism.event(id, handler, value === undefined ? undefined : JSON.stringify(value)));
      return this.out;
    }
  };
}
const find = (node, pred) => {
  if (!node || typeof node === "string") return null;
  if (pred(node)) return node;
  for (const c of node.c || []) { const f = find(c, pred); if (f) return f; }
  return null;
};
const findAll = (node, pred, out = []) => {
  if (!node || typeof node === "string") return out;
  if (pred(node)) out.push(node);
  (node.c || []).forEach((c) => findAll(c, pred, out));
  return out;
};

test("every example compiles", () => {
  for (const f of readdirSync(new URL("../examples/", import.meta.url))) {
    if (!f.endsWith(".prism")) continue;
    const source = readFileSync(new URL(`../examples/${f}`, import.meta.url), "utf8");
    const appData = JSON.parse((source.match(/^\/\/\s*appData:\s*(.+)$/m) || [, "{}"])[1]);
    const blocks = /^\/\/\s*blocks:\s*true\s*$/m.test(source);
    const env = compile(source, { appData, blocks });
    assert.ok(env.ok, `${f}: ${JSON.stringify(env.diagnostics)}`);
    if (blocks) assert.deepEqual(warnings(env), [], `${f} uses blocks cleanly`);
    assert.ok(env.fallback.length > 0, `${f} has a fallback`);
  }
});

test("counter: taps change state and redraw", () => {
  const s = start(example("02-counter"));
  assert.equal(find(s.out.tree, (x) => x.t === "Stat").p.value, "0");
  const plus = find(s.out.tree, (x) => x.t === "Button" && x.c[0] === "+1").on.press;
  s.send(plus); s.send(plus);
  assert.equal(find(s.out.tree, (x) => x.t === "Stat").p.value, "2");
  assert.equal(s.out.state.count, 2);
});

test("tasks: list handlers, input and add", () => {
  const s = start(example("03-tasks"));
  const boxes = findAll(s.out.tree, (x) => x.t === "Checkbox");
  assert.deepEqual(boxes.map((b) => b.on.change), ["h0", "h0#1", "h0#2"]);
  s.send("h0#1", true);
  assert.equal(s.out.state.tasks[1].done, true);
  assert.equal(find(s.out.tree, (x) => x.t === "Text").c[0], "2 of 3 done");
  s.send("h1", "Ship it");
  s.send(find(s.out.tree, (x) => x.t === "Button").on.press);
  assert.equal(s.out.state.tasks.length, 4);
  assert.equal(s.out.state.draft, "");
});

test("broken parts disappear alone, endless loops stop", () => {
  const s = start(example("06-broken"));
  assert.equal(s.env.diagnostics.filter((d) => d.level === "warning").length, 2);
  assert.ok(find(s.out.tree, (x) => x.t === "Text" && x.p && x.p.status === "good"));
  s.send(find(s.out.tree, (x) => x.t === "Button").on.press);
  assert.match(s.out.errors[0].message, /too many steps/);
  assert.ok(s.out.tree, "screen still drawn after the loop was stopped");
});

test("server refuses outside access", () => {
  for (const [bad, why] of [
    [`<Text>{fetch("https://x")}</Text>`, /Unknown name "fetch"/],
    [`<Text>{window.location}</Text>`, /Unknown name "window"/],
    [`<Text>{[].map.constructor("return 1")()}</Text>`, /".constructor" is not allowed/],
    [`<Text>{this}</Text>`, /`this` is not allowed/],
    [`const [x, setX] = useState(Date.now())\n<Text>{x}</Text>`, /must start with plain data/]
  ]) {
    const env = compile(bad);
    assert.equal(env.ok, false, bad);
    assert.match(errors(env).join("\n"), why, bad);
  }
});

test("runtime guards computed lookups", () => {
  const s = start(`let k = "constr" + "uctor"\n<Stack><Text>{[][k]}</Text><Text>ok</Text></Stack>`);
  assert.match(s.out.errors[0].message, /Not allowed/);
  assert.ok(find(s.out.tree, (x) => x.t === "Text" && x.c && x.c[0] === "ok"));
});

test("unknown props and bad values are dropped with warnings", () => {
  const env = compile(`<Text status="purple" tone="danger" shadow>Hi</Text>`);
  assert.ok(env.ok);
  assert.deepEqual(warnings(env), [
    '<Text status>: "purple" is not one of good, warning, bad; dropped',
    '<Text> has no prop "tone", dropped',
    '<Text> has no prop "shadow", dropped'
  ]);
});

test("several parts side by side are wrapped in a Stack", () => {
  const s = start(`<Title>A</Title>\n<Text>B</Text>`);
  assert.equal(s.out.tree.t, "Stack");
  assert.equal(s.out.tree.c.length, 2);
});

test("saved state is used on reload", () => {
  const env = compile(example("02-counter"));
  const out = JSON.parse(prism.load("saved", JSON.stringify(env), JSON.stringify({ count: 7 }), RAW));
  assert.equal(find(out.tree, (x) => x.t === "Stat").p.value, "7");
});

test("a whole AI reply with Markdown and a prism block", () => {
  const parts = compileMessage("Here you go:\n\n```prism\n<Text>Hi</Text>\n```\n\nAnything else?");
  assert.deepEqual(parts.map((p) => p.type), ["markdown", "prism", "markdown"]);
  assert.ok(parts[1].envelope.ok);
});

test("a part whose only child crashed disappears completely", () => {
  const s = start(`const [items, setItems] = useState([])\n<Stack><Text>{items[0].name}</Text><Text>ok</Text></Stack>`);
  assert.equal(s.out.tree.c.length, 1);
  assert.equal(s.out.errors.length, 1);
});


test("useState: setters take a value or an update function", () => {
  const s = start(`const [n, setN] = useState(1)
<Stack>
  <Text>{n}</Text>
  <Button onPress={() => setN(10)}>set</Button>
  <Button onPress={() => setN(c => c * 2)}>double</Button>
</Stack>`);
  const [set, dbl] = findAll(s.out.tree, (x) => x.t === "Button").map((b) => b.on.press);
  s.send(set); s.send(dbl);
  assert.equal(s.out.state.n, 20);
  assert.equal(find(s.out.tree, (x) => x.t === "Text").c[0], "20");
});

test("useState: handlers see the value from their draw, like React", () => {
  const s = start(`const [n, setN] = useState(0)
<Stack>
  <Button onPress={() => { setN(n + 1); setN(n + 1) }}>plain</Button>
  <Button onPress={() => { setN(c => c + 1); setN(c => c + 1) }}>update fn</Button>
  <Button onPress={() => { setN(n + 1); P.toast("now " + (n + 1)) }}>toast</Button>
</Stack>`);
  const [plain, fn, toast] = findAll(s.out.tree, (x) => x.t === "Button").map((b) => b.on.press);
  s.send(plain);
  assert.equal(s.out.state.n, 1);
  s.send(fn);
  assert.equal(s.out.state.n, 3);
  s.send(toast);
  assert.deepEqual(s.out.effects, [{ type: "toast", value: "now 4" }]);
});

test("useState: a setter can be passed straight to onChange", () => {
  const s = start(`const [name, setName] = useState("")\n<Input value={name} onChange={setName} />`);
  s.send(s.out.tree.on.change, "Ada");
  assert.equal(s.out.state.name, "Ada");
  assert.equal(s.out.tree.p.value, "Ada");
});

// Real Haiku reply (BMI calculator): let + if/else at the top used to refuse the whole block.
test("plain code at the top (let + if/else, loops) works like a React component body", () => {
  const s = start(`const [weight, setWeight] = useState(70)
const bmi = (weight / (1.7 * 1.7)).toFixed(1)

let category = ""
let status = "good"
if (bmi < 18.5) {
  category = "Underweight"
  status = "warning"
} else if (bmi < 25) {
  category = "Normal weight"
} else {
  category = "Overweight"
  status = "warning"
}
const marks = []
for (let i = 0; i < 3; i++) marks.push(i)

<Stack>
  <Slider label="Weight" value={weight} min={20} max={200} onChange={setWeight} />
  <Badge status={status}>{category + " " + marks.length}</Badge>
</Stack>`);
  const badge = () => s.out.tree.c[1];
  assert.equal(badge().c[0], "Normal weight 3");
  assert.equal(badge().p.status, "good");
  s.send(s.out.tree.c[0].on.change, 100);
  assert.equal(badge().c[0], "Overweight 3");
  assert.equal(badge().p.status, "warning");
});

// Real Haiku reply ("Teach me about agents"): its own components behind tabs, and <Text> inside <Text>
// for bold words. Both used to be dropped, so tapping the tabs changed state but nothing on screen.
test("the AI's own components work like in React, and nested Text keeps its words", () => {
  const s = start(`const [view, setView] = useState("loop")

const Loop = () => (
  <Card title="The Agent Loop">
    <Text>Goal, reason, act, observe.</Text>
  </Card>
)
function Parts({ title, children }) {
  return <Card title={title}>{children}</Card>
}

<Stack>
  <Row>
    <Button onPress={() => setView("loop")}>Loop</Button>
    <Button onPress={() => setView("parts")}>Parts</Button>
  </Row>
  {view === "loop" && <Loop />}
  {view === "parts" && <Parts title="Components"><Text>Model, tools, memory.</Text></Parts>}
  <Text><Text weight="semibold">Chatbot:</Text> answers. <Text weight="semibold">Agent:</Text> acts.</Text>
</Stack>`);
  const titles = () => findAll(s.out.tree, (x) => x.t === "Card").map((c) => c.p.title);
  assert.deepEqual(titles(), ["The Agent Loop"]);
  const [, partsButton] = findAll(s.out.tree, (x) => x.t === "Button");
  s.send(partsButton.on.press);
  assert.deepEqual(titles(), ["Components"], "the tab shows the other component");
  assert.ok(find(s.out.tree, (x) => x.t === "Text" && x.c?.[0] === "Model, tools, memory."), "children passed in");
  const line = s.out.tree.c[s.out.tree.c.length - 1];
  assert.equal(line.c.join(""), "Chatbot: answers. Agent: acts.", "inner Text words kept");
  assert.ok(!warnings(s.env).some((w) => /Unknown part/.test(w)));
});

test("useState: wrong use is refused with a clear message", () => {
  const cases = [
    [`const [count, setCount] = useState(0)\n<Button onPress={() => count++}>+</Button>`, /use setCount/],
    [`const [count, setCount] = useState(0)\n<Button onPress={() => { count = 5 }}>+</Button>`, /use setCount/],
    [`const count = useState(0)\n<Text>{count}</Text>`, /const \[name, setName\] = useState/],
    [`function f() { const [a, setA] = useState(0); return a }\n<Text>{f()}</Text>`, /own top-level line/],
    [`const [a, setA] = useState(() => 1)\n<Text>{a}</Text>`, /plain data/],
    [`const [a, setA] = useState(0)\nconst [a, setB] = useState(1)\n<Text>{a}</Text>`, /already been declared/],
    [`const [S, setS] = useState(0)\n<Text>{S}</Text>`, /reserved/],
    [`useEffect(() => {})\n<Text>hi</Text>`, /useEffect is not supported yet/]
  ];
  for (const [src, re] of cases) {
    const env = compile(src);
    assert.equal(env.ok, false, src);
    assert.ok(errors(env).some((m) => re.test(m)), `${src}\n${JSON.stringify(errors(env))}`);
  }
});

test("useState: React.useState and a missing start value work", () => {
  const env = compile(`const [a, setA] = React.useState(2)\nconst [b, setB] = useState()\n<Text>{a}</Text>`);
  assert.ok(env.ok, JSON.stringify(env.diagnostics));
  assert.deepEqual(env.state, { a: 2, b: null });
});

test("changing state in place still works but gets a warning", () => {
  const src = `const [items, setItems] = useState([])\n<Button onPress={() => items.push(1)}>add</Button>`;
  const s = start(src);
  assert.match(warnings(s.env)[0], /items.push\(...\) changes state in place; prefer setItems/);
  s.send(s.out.tree.on.press);
  assert.deepEqual(s.out.state.items, [1]);
});

test("React habits are fixed: onClick and e.target.value", () => {
  const s = start(`const [name, setName] = useState("")
<Stack>
  <Input value={name} onChange={e => { e.preventDefault(); setName(e.target.value) }} />
  <Button onClick={() => setName("")}>Clear</Button>
</Stack>`);
  const w = warnings(s.env);
  assert.ok(w.some((m) => /onClick> was renamed to onPress/.test(m)), JSON.stringify(w));
  assert.ok(w.some((m) => /e.target.value was changed to e/.test(m)), JSON.stringify(w));
  s.send(find(s.out.tree, (x) => x.t === "Input").on.change, "Bo");
  assert.equal(s.out.state.name, "Bo");
  s.send(find(s.out.tree, (x) => x.t === "Button").on.press);
  assert.equal(s.out.state.name, "");
});

// ---------- Design system (catalog.json) ----------

import { defaultCatalog as catalog, defaultTokens as tokens, typeOf, compactProp } from "../compiler/catalog.js";

test("catalog: every rule points at something real", () => {
  const parts = Object.keys(catalog.parts);
  for (const [name, part] of Object.entries(catalog.parts)) {
    assert.ok(part.description, `${name} has a description`);
    assert.ok(part.example, `${name} has an example`);
    for (const p of part.parents || []) assert.ok(parts.includes(p), `${name} parent ${p}`);
    for (const p of (typeof part.children === "object" && part.children.only) || []) assert.ok(parts.includes(p), `${name} only ${p}`);
    for (const [propName, prop] of Object.entries(part.props)) {
      const where = `${name}.${propName}`;
      assert.ok(prop.description, `${where} has a description`);
      assert.ok(typeOf(catalog, prop), `${where} has a known type`);
      if (prop.default !== undefined) {
        const r = prism.checkValue(compactProp(catalog, prop), prop.default);
        assert.ok(!r.err && !r.fixed, `${where} default is valid`);
      }
      for (const b of prop.between || []) assert.ok(part.props[b], `${where} between ${b}`);
    }
  }
  for (const [alias, target] of Object.entries(catalog.partAliases)) assert.ok(parts.includes(target), `part alias ${alias}`);
  for (const [alias, target] of Object.entries(catalog.propAliases)) {
    assert.ok(parts.some((p) => catalog.parts[p].props[target]), `prop alias ${alias} -> ${target}`);
  }
  for (const [name, type] of Object.entries(catalog.types)) {
    for (const [alias, target] of Object.entries(type.aliases || {})) assert.ok(type.enum.includes(target), `${name} alias ${alias}`);
  }
});

test("catalog: every basic block is complete and valid", () => {
  for (const [name, block] of Object.entries(catalog.blocks)) {
    assert.equal(name, name.toLowerCase(), `${name}: block names are lowercase, so they never clash with parts`);
    assert.ok(!catalog.parts[name], `${name} is not also a part`);
    assert.ok(block.description, `${name} has a description`);
    for (const [propName, prop] of Object.entries(block.props)) {
      const where = `${name}.${propName}`;
      assert.ok(prop.description, `${where} has a description`);
      assert.ok(typeOf(catalog, prop), `${where} has a known type`);
      if (prop.default !== undefined) {
        const r = prism.checkValue(compactProp(catalog, prop), prop.default);
        assert.ok(!r.err && !r.fixed, `${where} default is valid`);
      }
      assert.ok(!["tone", "variant", "color", "size"].includes(propName), `${where}: blocks use roles and status, never tones or sizes`);
    }
  }
});

// Blocks are what the part library builds parts from (ARCHITECTURE.md section 9). The AI must never
// write them, or it could style things itself.
test("blocks: the AI can't use them; its <box> becomes a plain Stack part", () => {
  const env = compile(`<Stack><box surface="card"><Text>hi</Text></box></Stack>`);
  assert.ok(warnings(env).some((w) => /<box> was changed to <Stack>/.test(w)), warnings(env).join("\n"));
  assert.ok(warnings(env).some((w) => /no prop "surface"/.test(w)), "its style is dropped");
  const s = start(`<Stack><box surface="card"><Text>hi</Text></box></Stack>`);
  assert.ok(!find(s.out.tree, (x) => x.t === "box"), "no box reaches the device");
});

test("blocks: our own code can use them; every input is checked and completed", () => {
  const s = start(`const [open, setOpen] = useState(false)
const [picked, setPicked] = useState(null)
<box gap="md">
  <box surface="card" pad="lg" gap="sm" role="item">
    <text role="title">What is a token?</text>
    <button selected={picked === 1} onPress={() => setPicked(1)}>A small piece of text</button>
    <box surface="note" status="success" pad="md">Correct</box>
  </box>
  <button kind="main" onPress={() => setOpen(!open)}>Details</button>
  <collapse open={open}><text role="secondary">More words</text></collapse>
  <pager><box surface="card">1</box><box surface="card">2</box></pager>
  <progress value={2} status="error" />
</box>`, { blocks: true });
  const tree = s.out.tree;
  assert.equal(tree.t, "box");
  assert.deepEqual(tree.p, { dir: "column", gap: "md", pad: "none", align: "stretch", justify: "start", wrap: false, grow: false, surface: "none", role: "none" });
  const note = find(tree, (x) => x.t === "box" && x.p.surface === "note");
  assert.equal(note.p.status, "good", "status alias: success -> good");
  assert.equal(note.c[0].t, "text", "loose text in a box becomes a text block");
  assert.deepEqual(find(tree, (x) => x.t === "button" && x.p.kind === "quiet").p, { kind: "quiet", selected: false, full: false, disabled: false });
  assert.equal(find(tree, (x) => x.t === "progress").p.value, 1, "kept in range");
  assert.equal(find(tree, (x) => x.t === "progress").p.status, "bad");
  assert.equal(find(tree, (x) => x.t === "pager").p.peek, true);
  assert.deepEqual(s.out.errors, []);
  assert.deepEqual(s.env.spec, {}, "blocks need no spec in the envelope");

  s.send(find(s.out.tree, (x) => x.t === "button" && x.p.kind === "quiet").on.press);
  assert.equal(find(s.out.tree, (x) => x.t === "button" && x.p.kind === "quiet").p.selected, true, "a tap changes state");
  s.send(find(s.out.tree, (x) => x.t === "button" && x.p.kind === "main").on.press);
  assert.equal(find(s.out.tree, (x) => x.t === "collapse").p.open, true);
});

// The colours drawers use for meaning (status good / warning / bad map onto success / warning / danger).
const TONES = ["neutral", "primary", "success", "warning", "danger", "info"];

test("catalog: every value name has a token on every platform", () => {
  const { types } = catalog;
  assert.deepEqual(Object.keys(tokens.space), types.space.enum);
  assert.deepEqual(Object.keys(tokens.font.text), types.size.enum);
  assert.deepEqual(Object.keys(tokens.font.title), ["sm", "md", "lg", "xl"]);
  assert.deepEqual(Object.keys(tokens.font.weight), ["regular", "medium", "semibold", "bold"]);
  assert.deepEqual(Object.keys(tokens.control.height), types.size.enum);
  assert.deepEqual(Object.keys(tokens.icon.size), types.size.enum);
  for (const mode of ["light", "dark"]) {
    // Every tone, plus the calm chart colours for series 2-5.
    assert.deepEqual(Object.keys(tokens.color[mode].tone), [...TONES, "chart2", "chart3", "chart4", "chart5"], mode);
    for (const tone of Object.values(tokens.color[mode].tone)) assert.deepEqual(Object.keys(tone), ["solid", "onSolid", "soft", "text"]);
  }
});

test("catalog: every part's example compiles with no warnings", () => {
  const prelude = [
    "const [count, setCount] = useState(0)", "const [done, setDone] = useState(false)",
    "const [on, setOn] = useState(true)", "const [name, setName] = useState(\"\")",
    "const [volume, setVolume] = useState(50)", "const [size, setSize] = useState(\"M\")",
    "const [view, setView] = useState(\"Day\")", "const total = 4", ""
  ].join("\n");
  for (const [name, part] of Object.entries(catalog.parts)) {
    // Parts that must sit inside another part are tried inside it.
    let ex = part.example;
    if (name === "Cell") ex = `<Table>\n<TableRow>\n${ex}\n</TableRow>\n</Table>`;
    if (name === "TableRow") ex = `<Table>\n${ex}\n</Table>`;
    const env = compile(prelude + ex, { appData: { images: { headphones: "https://cdn.example.com/headphones.jpg" } } });
    assert.ok(env.ok, `${name}: ${JSON.stringify(env.diagnostics)}`);
    assert.deepEqual(env.diagnostics, [], `${name} example is clean`);
  }
});

test("AI slips are fixed: part, prop and value aliases, lowercase tags", () => {
  const s = start(`<Card><VStack gap={4} color="red">
  <button onClick={() => P.toast("x")}>Delete</button>
  <Badge status="Success">ok</Badge>
  <TextField onInput={() => 1} />
</VStack></Card>`);
  assert.deepEqual(s.out.tree.c[0].p, { tight: false, align: "stretch" }, "styling the AI tried is dropped");
  const button = find(s.out.tree, (x) => x.t === "Button");
  assert.deepEqual(button.p, { main: false, danger: false, disabled: false });
  assert.ok(button.on.press);
  assert.equal(find(s.out.tree, (x) => x.t === "Badge").p.status, "good");
  const w = warnings(s.env).join("\n");
  for (const re of [/<VStack> was changed to <Stack>/, /<button> was changed to <Button>/, /onClick> was renamed to onPress/,
    /status="Success"> was changed to "good"/, /<TextField> was changed to <Input>/, /onInput> was renamed to onChange/,
    /<Stack> has no prop "gap", dropped/, /<Stack> has no prop "color", dropped/]) {
    assert.match(w, re);
  }
});

test("few colours: the screen stays calm whatever tones the AI picks (part library rules)", () => {
  const s = start(`<Stack>
  <Badge>new</Badge>
  <Badge status="good">ok</Badge>
  <Callout title="Tip">x</Callout>
  <Text secondary>grey</Text>
  <Text status="bad">late</Text>
  <Button main>Save</Button>
  <Button main>Also main</Button>
  <Button danger>Delete</Button>
  <Progress value={0.5} />
  <Card title="Outer"><Card title="Inner">x</Card></Card>
</Stack>`, { expand: true });
  const tree = s.out.tree;
  assert.equal(tree.p.pad, "none", "the screen lines up with the chat text");
  const pills = findAll(tree, (x) => x.t === "box" && x.p.surface === "pill").map((x) => x.p.status);
  assert.deepEqual(pills, [undefined, "good"], "badges are grey unless they show a status");
  assert.equal(find(tree, (x) => x.t === "box" && x.p.surface === "note").p.status, undefined, "a callout is a calm note");
  const words = findAll(tree, (x) => x.t === "text" && ["grey", "late"].includes(x.c[0]));
  assert.deepEqual(words.map((x) => [x.p.role, x.p.status]), [["secondary", undefined], ["body", "bad"]]);
  const kinds = findAll(tree, (x) => x.t === "button").map((x) => x.p.kind);
  assert.deepEqual(kinds, ["main", "quiet", "danger"], "one main button per screen");
  assert.equal(find(tree, (x) => x.t === "progress").p.status, undefined, "the accent by default");
  const surfaces = findAll(tree, (x) => x.t === "box" && ["card", "sunk"].includes(x.p.surface)).map((x) => x.p.surface);
  assert.deepEqual(surfaces, ["card", "sunk"], "no card inside a card");
  assert.ok(!JSON.stringify(tree).includes("tone"), "no tones reach the drawer");
});

test("every prop reaches the drawer complete: defaults filled in", () => {
  const s = start(`<Stack>\n<Button>Go</Button>\n<Text>Hi</Text>\n</Stack>`);
  assert.deepEqual(find(s.out.tree, (x) => x.t === "Button").p, { main: false, danger: false, disabled: false });
  assert.deepEqual(find(s.out.tree, (x) => x.t === "Text").p, { secondary: false, strong: false, align: "start", strike: false });
});

test("values worked out at run time are checked on the device", () => {
  const s = start(`const [ok, setOk] = useState(false)
const [level, setLevel] = useState(3)
<Stack>
  <Badge status={ok ? "good" : "error"}>a</Badge>
  <Badge status={ok ? "x" : "purple"}>b</Badge>
  <Progress value={level} />
  <Slider value={level * 100} min={0} max={10} />
</Stack>`);
  const [a, b] = findAll(s.out.tree, (x) => x.t === "Badge");
  assert.equal(a.p.status, "bad", "an alias worked out at run time");
  assert.equal((b.p || {}).status, undefined, "a bad value is dropped");
  assert.match(s.out.errors.map((e) => e.message).join(), /Badge status: "purple" is not one of/);
  assert.equal(find(s.out.tree, (x) => x.t === "Progress").p.value, 1);
  assert.equal(find(s.out.tree, (x) => x.t === "Slider").p.value, 10);
});

test("required props: missing ones drop the part", () => {
  const env = compile(`<Stack>\n<Stat value="3" />\n<Text>ok</Text>\n</Stack>`);
  assert.match(warnings(env).join(), /<Stat> needs label; dropped/);
  const s = start(`const [n, setN] = useState(null)\n<Stack>\n<Stat label={n} value="3" />\n<Text>ok</Text>\n</Stack>`);
  assert.equal(findAll(s.out.tree, (x) => x.t === "Stat").length, 0);
  assert.match(s.out.errors[0].message, /Stat needs label/);
});

test("structure: parts only where they belong", () => {
  const env = compile(`<Stack>\n<Cell>loose</Cell>\n<Table>\n<Text>no</Text>\n<TableRow><Cell>yes</Cell></TableRow>\n</Table>\n</Stack>`);
  const w = warnings(env).join("\n");
  assert.match(w, /<Cell> must be inside <TableRow>; dropped/);
  assert.match(w, /<Table> only takes <TableRow>; <Text> dropped/);
});

test("loose text inside a layout part becomes a Text part", () => {
  const s = start(`const [n, setN] = useState(3)\n<Card title="Hi">\nHello there\n{n} items\n</Card>`);
  // JSX drops line breaks between text and {n}, exactly like React.
  const texts = findAll(s.out.tree, (x) => x.t === "Text");
  assert.deepEqual(texts.map((x) => x.c[0]), ["Hello there3 items"]);
  assert.equal(texts[0].p.secondary, false);
  assert.ok(s.env.uses.includes("Text"));
});

test("Select options are made uniform", () => {
  const s = start(`<Select value="b" options={["a", { label: "Bee", value: "b" }, 3, null]} />`);
  assert.deepEqual(s.out.tree.p.options, [
    { label: "a", value: "a" }, { label: "Bee", value: "b" }, { label: "3", value: "3" }
  ]);
});

import { buildPrompt } from "../compiler/prompt.js";
import { tokensCss } from "../compiler/tokens.js";

test("the AI instructions are built from the catalog, and their examples compile cleanly", () => {
  const prompt = buildPrompt(catalog);
  for (const [name, part] of Object.entries(catalog.parts)) assert.equal(prompt.includes(`### <${name}>`), !part.hidden, name);
  assert.doesNotMatch(prompt, /\btone=|\bvariant=/, "old style inputs aren't taught");
  const blocks = [...prompt.matchAll(/```prism\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(blocks.length >= 1);
  for (const b of blocks) assert.deepEqual(compile(b).diagnostics, [], b);
});

test("token CSS has every tone in light and dark", () => {
  const css = tokensCss(tokens);
  for (const tone of TONES) assert.equal(css.split(`--tone-${tone}-solid:`).length - 1, 3, tone);
  assert.match(css, /--card-radius: 14px;/);
  assert.match(css, /--badge-weight: 600;/);
});

// ---------- Checked results, not just "it compiles" ----------

const tokensJson = () => import("../compiler/tokens.js").then((m) => m.resolveTokens(tokens));

test("catalog: a control part borrows its block's props, so there is one copy", () => {
  assert.deepEqual(catalog.parts.Slider.props, catalog.blocks.slider.props);
  assert.equal(catalog.parts.Chart.props.height.hidden, true, "the part can change single fields");
  assert.equal(catalog.blocks.chart.props.height.hidden, undefined, "without changing the block");
  assert.doesNotMatch(JSON.stringify(catalog), /#[0-9a-fA-F]{6}|\d+px|"(tone|color|font\w*)":/, "no colours, pixels or fonts in the catalog");
});

test("runtime value rules, one by one", () => {
  const check = (prop, v) => prism.checkValue(compactProp(catalog, prop), v);
  const space = catalog.blocks.box.props.gap;
  assert.deepEqual(check(space, "sm"), { v: "sm" });
  assert.ok(check(space, 12).err, "spacing is a step name, never pixels");
  assert.deepEqual(check(catalog.parts.Badge.props.status, "Error"), { v: "bad", fixed: true }, "alias in capitals");
  assert.deepEqual(check(catalog.parts.Grid.props.columns, 2.6), { v: 3, fixed: true }, "integer rounding");
  assert.deepEqual(check(catalog.parts.Grid.props.columns, "2"), { v: 2, fixed: true }, "number from text");
  assert.deepEqual(check(catalog.parts.Button.props.disabled, "false"), { v: false, fixed: true }, "bool from text");
  assert.deepEqual(check(catalog.parts.Stat.props.value, 312), { v: "312" }, "number shown as text");
  assert.ok(check(catalog.parts.Select.props.options, "a,b").err, "options must be a list");
  assert.ok(check(catalog.parts.Chart.props.height, 2).err, "a size is a name, not a number");
});

test("Slider value: starts at min, stays in range, max is never below min", () => {
  const s = start(`<Stack>\n<Slider min={5} max={10} />\n<Slider value={50} min={20} max={10} />\n</Stack>`);
  const [a, b] = findAll(s.out.tree, (x) => x.t === "Slider").map((x) => x.p);
  assert.equal(a.value, 5);
  assert.deepEqual([b.min, b.max, b.value], [20, 20, 20]);
});

test("runtime structure rules also hold for parts built in a helper", () => {
  const s = start(`function row(x) { return <Text>{x}</Text> }
function cell() { return <Badge>b</Badge> }
<Stack>
  <Table>{row("not a row")}</Table>
  <Button>{cell()}Go</Button>
  <Divider>{cell()}</Divider>
  <Table>loose text</Table>
</Stack>`);
  const msgs = s.out.errors.map((e) => e.message).join("\n");
  assert.match(msgs, /Table only takes TableRow; Text dropped/);
  assert.match(msgs, /Button only takes text; Badge dropped/);
  const [t1, t2] = findAll(s.out.tree, (x) => x.t === "Table");
  assert.equal(t1.c, undefined);
  assert.equal(t2.c, undefined, "loose text is not turned into a Text inside a Table");
  assert.deepEqual(find(s.out.tree, (x) => x.t === "Button").c, ["Go"]);
  assert.equal(find(s.out.tree, (x) => x.t === "Divider").c, undefined);
});

test("prop aliases only apply when the part has the target prop", () => {
  const env = compile(`<Stack>\n<Card header="Hi"><Text>x</Text></Card>\n<Table><TableRow><Cell header>H</Cell></TableRow></Table>\n<Text heading="no">t</Text>\n</Stack>`);
  const w = warnings(env).join("\n");
  assert.match(w, /<Card header> was renamed to title/);
  assert.doesNotMatch(w, /<Cell header>/);
  assert.match(w, /<Text> has no prop "heading", dropped/);
});

test("compile-time prop and children rules", () => {
  const env = compile(`<Stack>\n<Badge status="good" status="bad">x</Badge>\n<Button onPress="go">a</Button>\n<Divider>text</Divider>\n</Stack>`);
  const w = warnings(env).join("\n");
  assert.match(w, /<Badge> has "status" twice; the second was dropped/);
  assert.match(w, /<Button onPress> must be a function; dropped/);
  assert.match(w, /<Divider> takes no children/);
  const out = JSON.parse(prism.load("rules", JSON.stringify(env), undefined, RAW));
  assert.equal(find(out.tree, (x) => x.t === "Badge").p.status, "good");
  assert.equal(find(out.tree, (x) => x.t === "Button").on, undefined);
});

test("literal words go to the text list, data stays in the code", () => {
  const env = compile(`<Stack>\n<Card title="Weekly report"><Text>Hello</Text></Card>\n<Select value="b" options={["a", "b"]} />\n</Stack>`);
  assert.deepEqual(env.text.sort(), ["Hello", "Weekly report"]);
  assert.doesNotMatch(env.code, /Weekly report|Hello/);
  assert.match(env.code, /value: "b"/);
});

test("the envelope's spec covers every part drawn, including the wrapping Stack", () => {
  const env = compile(`<Title>A</Title>\n<Text>B</Text>`);
  assert.deepEqual(Object.keys(env.spec).sort(), ["Stack", "Text", "Title"]);
  const out = JSON.parse(prism.load("spec", JSON.stringify(env), undefined, RAW));
  assert.deepEqual(out.tree.p, { tight: false, align: "stretch" });
});

test("dashboard example: Select switches data, Callout appears, fallback has the numbers", () => {
  const s = start(example("08-dashboard"));
  const stats = () => findAll(s.out.tree, (x) => x.t === "Stat").map((x) => x.p);
  assert.deepEqual({ label: stats()[1].label, value: stats()[1].value }, { label: "Orders", value: "312" });
  assert.equal(findAll(s.out.tree, (x) => x.t === "Callout").length, 0);
  s.send(find(s.out.tree, (x) => x.t === "Select").on.change, "month");
  assert.equal(stats()[0].value, "$51,900");
  assert.equal(stats()[0].status, "bad");
  const callout = find(s.out.tree, (x) => x.t === "Callout");
  assert.equal(callout.p.status, "warning");
  assert.equal(callout.c[0].t, "Text", "plain text in a Callout became a Text part");
  assert.match(s.env.fallback, /Revenue \*\*\$12,400\*\* \+8%/);
  assert.match(s.env.fallback, /Period: This week/);
  assert.match(s.env.fallback, /Reached \*\*21%\*\*/);
  assert.doesNotMatch(s.env.fallback, /Reached: 21%/, "the percent is written once");
});

test("fallback text for a Callout", () => {
  const env = compile(`<Callout tone="warning" title="Heads up">Trial ends soon.</Callout>`);
  assert.equal(env.fallback, "> **Heads up** Trial ends soon.");
});

test("tokens.json swaps component names for real values", async () => {
  const t = await tokensJson();
  assert.equal(t.component.card.radius, 14);
  assert.equal(t.component.card.pad, 16);
  assert.deepEqual(t.component.card.titleStyle, { size: 18, lineHeight: 24, weight: 600 });
  assert.deepEqual(t.component.button.padX, { sm: 8, md: 12, lg: 16 });
  assert.equal(t.component.badge.weight, 600);
  assert.deepEqual(t.component.stat.valueStyle, { size: 22, lineHeight: 28, weight: 700 });
});

test("the runtime enforces the spec even for an envelope our compiler didn't make", () => {
  const env = compile(`<Divider />`);
  env.code = `P.screen(function (S, T) { return P.el("Divider", "n0", { color: "red" }, ["text", P.el("Divider", "n1", null, null)]); });`;
  const out = JSON.parse(prism.load("handmade", JSON.stringify(env), undefined, RAW));
  assert.deepEqual(out.tree, { t: "Divider", id: "n0" });
});

// ---------- Real AI replies ----------

import { checkAnswer, splitAnswers, appDataByRequest, requestNumber } from "../scripts/eval.mjs";

test("replies written by a real model still compile and draw cleanly", () => {
  for (const f of readdirSync(new URL("./ai-replies/", import.meta.url))) {
    const answers = splitAnswers(readFileSync(new URL(`./ai-replies/${f}`, import.meta.url), "utf8"));
    assert.ok(answers.length > 0, f);
    answers.forEach((a, i) => {
      const r = checkAnswer(a, `${f}#${i + 1}`, appDataByRequest[requestNumber(a, i)]);
      assert.equal(r.status, "clean", `${f} answer ${i + 1}: ${JSON.stringify(r.messages)}`);
    });
  }
});

test("useState start values can use other constants, even more than once", () => {
  const env = compile(`const empty = [false, false]
const base = { done: false }
const n = 2
const [habits, setHabits] = useState([
  { id: 1, days: empty, ...base },
  { id: 2, days: [...empty, true], count: n * 2 }
])
<Text>{habits.length}</Text>`);
  assert.ok(env.ok, JSON.stringify(env.diagnostics));
  assert.deepEqual(env.state.habits, [
    { id: 1, days: [false, false], done: false },
    { id: 2, days: [false, false, true], count: 4 }
  ]);
});

// ---------- Chart ----------

test("Chart: a flat list becomes one series with the chart's tone", () => {
  const s = start(`<Chart data={[4200, 8100, 6500]} labels={["Mon", "Tue", "Wed"]} label="Steps" />`);
  assert.deepEqual(s.out.tree.p, {
    data: [{ name: "", values: [4200, 8100, 6500], tone: "primary" }],
    labels: ["Mon", "Tue", "Wed"], label: "Steps", kind: "bar", height: "md"
  });
  assert.deepEqual(s.env.diagnostics, []);
});

test("Chart: several series get different tones, the chosen one first", () => {
  const s = start(`<Chart kind="line" tone="success" data={[{ name: "2024", values: [1, 2] }, { name: "2025", values: [3, 4] }, [5, 6]]} />`);
  assert.deepEqual(s.out.tree.p.data.map((x) => [x.name, x.tone]), [["2024", "primary"], ["2025", "chart2"], ["", "chart3"]],
    "series 1 is the accent, the rest calm chart colours (never status colours)");
});

test("Chart: data is cleaned up on the device", () => {
  const s = start(`const raw = ["10", 20, "x", null]
<Chart data={raw} labels={[1, "Tue", null]} />`);
  assert.deepEqual(s.out.tree.p.data[0].values, [10, 20, null, null], "numbers from text, gaps for the rest");
  assert.deepEqual(s.out.tree.p.labels, ["1", "Tue", ""]);
  const big = start(`const many = Array.from({ length: 250 }, (_, i) => i)
const lots = [1, 2, 3, 4, 5, 6, 7].map(i => ({ name: "s" + i, values: [i] }))
<Stack>
  <Chart data={many} />
  <Chart data={lots} />
</Stack>`);
  const [a, b] = findAll(big.out.tree, (x) => x.t === "Chart").map((x) => x.p.data);
  assert.equal(a[0].values.length, 200, "200 points at most");
  assert.equal(b.length, 5, "5 series at most");
});

test("Chart: no numbers at all drops the chart, not the screen", () => {
  const s = start(`const [rows, setRows] = useState([])
<Stack>
  <Chart data={rows} />
  <Chart data={["a", "b"]} />
  <Text>still here</Text>
</Stack>`);
  assert.equal(findAll(s.out.tree, (x) => x.t === "Chart").length, 0);
  assert.match(s.out.errors.map((e) => e.message).join("\n"), /Chart data: must be a list of numbers/);
  assert.match(s.out.errors.map((e) => e.message).join("\n"), /Chart data: has no numbers/);
  assert.ok(find(s.out.tree, (x) => x.t === "Text"));
});

test("Chart: AI slips are fixed (BarChart, values=, type=)", () => {
  const s = start(`<BarChart values={[1, 2]} type="column" height="large" />`);
  assert.equal(s.out.tree.t, "Chart");
  assert.deepEqual([s.out.tree.p.kind, s.out.tree.p.height], ["bar", "lg"]);
  const w = warnings(s.env).join("\n");
  for (const re of [/<BarChart> was changed to <Chart>/, /values> was renamed to data/, /type> was renamed to kind/, /kind="column"> was changed to "bar"/]) {
    assert.match(w, re);
  }
});

test("Chart: the fallback text is a small table", () => {
  const env = compile(`<Chart label="Sales" data={[{ name: "A", values: [1, 2] }, { name: "B", values: [3] }]} labels={["Jan", "Feb"]} />`);
  assert.equal(env.fallback, "**Sales**\n| | A | B |\n|---|---|---|\n| Jan | 1 | 3 |\n| Feb | 2 |  |");
});

// ---------- Image ----------

const photos = { images: { headphones: "https://cdn.example.com/a.jpg", case: { url: "https://cdn.example.com/b.jpg", description: "the carry case" } } };

test("Image: a name the server approved is drawn; the envelope carries the approved addresses", () => {
  const s = start(`<Image src="headphones" alt="Black headphones" ratio="1:1" />`, { appData: photos });
  assert.deepEqual(s.out.tree.p, { src: "headphones", alt: "Black headphones", ratio: "square", fit: "cover" });
  assert.deepEqual(s.env.appData, { images: { headphones: "https://cdn.example.com/a.jpg", case: "https://cdn.example.com/b.jpg" } });
  assert.equal(s.env.fallback, "![Black headphones](https://cdn.example.com/a.jpg)");
});

test("Image: a web address or an unknown name is never drawn", () => {
  const env = compile(`<Stack>
<Image src="https://evil.example/x.png" alt="x" />
<Image src="speaker" alt="y" />
<Text>ok</Text>
</Stack>`, { appData: photos });
  assert.ok(env.ok);
  const w = warnings(env).join("\n");
  assert.match(w, /<Image src>: "https:\/\/evil.example\/x.png" is not an image supplied for this reply; dropped/);
  assert.match(w, /<Image src>: "speaker" is not an image supplied for this reply; dropped/);
  assert.equal(env.uses.includes("Image"), false);
});

test("Image: names worked out on the device are checked there too", () => {
  const s = start(`const [pick, setPick] = useState("headphones")
<Stack>
  <Image src={pick} alt="Product" />
  <Button onPress={() => setPick("https://evil.example/x.png")}>Swap</Button>
</Stack>`, { appData: photos });
  assert.equal(find(s.out.tree, (x) => x.t === "Image").p.src, "headphones");
  s.send(find(s.out.tree, (x) => x.t === "Button").on.press);
  assert.equal(find(s.out.tree, (x) => x.t === "Image"), null);
  assert.match(s.out.errors[0].message, /not an image supplied for this reply/);
});

test("Image: without appData nothing can be shown, and alt is required", () => {
  const env = compile(`<Stack>\n<Image src="headphones" alt="x" />\n<Image src="headphones" />\n<Text>ok</Text>\n</Stack>`, { appData: photos });
  assert.match(warnings(env).join(), /<Image> needs alt; dropped/);
  const none = compile(`<Stack>\n<Image src="headphones" alt="x" />\n<Text>ok</Text>\n</Stack>`);
  assert.deepEqual(none.appData, { images: {} });
  assert.match(warnings(none).join(), /"headphones" is not an image supplied/);
});

test("Image: the server only keeps https addresses", () => {
  const env = compile(`<Text>hi</Text>`, { appData: { images: { a: "http://x.example/a.jpg", b: "javascript:alert(1)", c: 5, d: "https://ok.example/d.png" } } });
  assert.deepEqual(env.appData.images, { d: "https://ok.example/d.png" });
  assert.equal(warnings(env).filter((m) => /not an https address/.test(m)).length, 3);
});

test("Image: an envelope our compiler didn't make still can't load other images", () => {
  const env = compile(`<Text>x</Text>`, { appData: photos });
  env.code = `P.screen(function (S, T) { return P.el("Stack", "n0", null, [P.el("Image", "n1", { src: "https://evil.example/x.png", alt: "x" }, null), P.el("Image", "n2", { src: "case", alt: "c" }, null)]); });`;
  env.spec.Image = compile(`<Image src="case" alt="c" />`, { appData: photos }).spec.Image;
  env.spec.Stack = compile(`<Stack />`).spec.Stack;
  const out = JSON.parse(prism.load("handmade-image", JSON.stringify(env), undefined, RAW));
  assert.deepEqual(findAll(out.tree, (x) => x.t === "Image").map((x) => x.p.src), ["case"]);
});

test("the AI instructions list the images for one reply", async () => {
  const { imagesPrompt } = await import("../compiler/prompt.js");
  assert.equal(imagesPrompt({}), "");
  const text = imagesPrompt(photos);
  assert.match(text, /## Images for this reply/);
  assert.match(text, /- `headphones`\n- `case`: the carry case/);
  assert.match(buildPrompt(catalog), /Never type a web address/);
});

test("chart and image tokens", async () => {
  const t = await tokensJson();
  assert.deepEqual(t.component.chart, { height: { sm: 120, md: 180, lg: 240 }, lineWidth: 2, radius: 6, gap: 4, textSize: { size: 13, lineHeight: 18 } });
  assert.deepEqual(t.component.image, { radius: 10, ratio: { square: 1, wide: 1.7778, tall: 0.75 } });
  assert.match(tokensCss(tokens), /--image-ratio-wide: 1\.7778;/);
});

// ---------- Part library (ARCHITECTURE.md section 9) ----------

const texts = (tree) => findAll(tree, (x) => x.t === "text").map((x) => x.c.join(""));

test("library: Quiz is built from blocks and keeps its own state, also across a reload", () => {
  const src = `<Quiz question="What is a token?" options={["A sentence", "A small piece of text"]} answer={1} explain="Models read small pieces." />`;
  const s = start(src, { expand: true });
  assert.equal(s.out.tree.t, "box", "the drawer only sees blocks");
  assert.equal(s.out.tree.p.surface, "card");
  assert.ok(!find(s.out.tree, (x) => /^[A-Z]/.test(x.t)), "no parts left in the tree");
  const answers = () => findAll(s.out.tree, (x) => x.t === "box" && x.p.label && /^[A-Z]: /.test(x.p.label));
  assert.deepEqual(answers().map((a) => a.p.label), ["A: A sentence", "B: A small piece of text"]);
  s.send(answers()[0].on.press);
  assert.ok(texts(s.out.tree).includes("Not quite"));
  assert.deepEqual(answers().map((a) => a.p.status), ["bad", "good"], "the wrong pick is red, the right answer green");
  assert.ok(answers().every((a) => !a.on), "answers lock after a pick");
  assert.ok(texts(s.out.tree).includes("Models read small pieces."));
  // A reload with the saved state (snapshots) shows the same answer.
  const kept = JSON.parse(prism.load("quiz-kept", JSON.stringify(s.env), JSON.stringify(s.out.state)));
  assert.ok(texts(kept.tree).includes("Not quite"), "picked answer kept");
  // A fresh start, picking the right answer.
  const s2 = start(src, { expand: true });
  s2.send(findAll(s2.out.tree, (x) => x.t === "box" && x.p.label === "B: A small piece of text")[0].on.press);
  assert.ok(texts(s2.out.tree).includes("Correct!"));
});

test("library: parts drawn by one line in a .map each keep their own state", () => {
  // The key sits on the Card, not the Quiz: the three quizzes still must not share one answer.
  const src = `const qs = [["Q1", ["a", "b"]], ["Q2", ["c", "d"]], ["Q3", ["e", "f"]]]
<Stack>
  {qs.map(([q, options]) => (
    <Card key={q} title={q}>
      <Quiz question={q} options={options} answer={1} />
    </Card>
  ))}
</Stack>`;
  const s = start(src, { expand: true });
  const answers = () => findAll(s.out.tree, (x) => x.t === "box" && x.p.label && /^[A-Z]: /.test(x.p.label));
  s.send(answers()[2].on.press); // Q2, "c"
  assert.deepEqual(texts(s.out.tree).filter((t) => t === "Not quite" || t === "Correct!"), ["Not quite"], "only Q2 is answered");
  assert.ok(answers().slice(0, 2).every((a) => a.on) && answers().slice(4).every((a) => a.on), "Q1 and Q3 can still be answered");
  s.send(answers()[5].on.press); // Q3, "f"
  assert.deepEqual(texts(s.out.tree).filter((t) => t === "Not quite" || t === "Correct!"), ["Not quite", "Correct!"]);
});

test("library: Quiz onChange tells the AI's code right or wrong, so it can keep a score", () => {
  const src = `const [score, setScore] = useState(0)
const [done, setDone] = useState(0)
const qs = [["Q1", ["a", "b"]], ["Q2", ["c", "d"]]]
<Stack>
  {qs.map(([q, options]) => (
    <Quiz key={q} question={q} options={options} answer={1}
      onChange={(right) => { setDone((n) => n + 1); if (right) setScore((n) => n + 1) }} />
  ))}
  <Text>{done} answered, {score} right</Text>
</Stack>`;
  const s = start(src, { expand: true });
  const answers = () => findAll(s.out.tree, (x) => x.t === "box" && x.p.label && /^[A-Z]: /.test(x.p.label));
  assert.ok(texts(s.out.tree).includes("0 answered, 0 right"));
  s.send(answers()[1].on.press); // Q1, right
  s.send(answers()[2].on.press); // Q2, wrong
  assert.ok(texts(s.out.tree).includes("2 answered, 1 right"), texts(s.out.tree).join(" | "));
});

test("library: one Quiz reused for the next question starts unanswered", () => {
  const src = `const [n, setN] = useState(0)
const qs = [["Q1", ["a", "b"]], ["Q2", ["c", "d"]]]
<Quiz question={qs[n][0]} options={qs[n][1]} answer={1} onChange={() => setN(1)} />`;
  const s = start(src, { expand: true });
  const answers = () => findAll(s.out.tree, (x) => x.t === "box" && x.p.label && /^[A-Z]: /.test(x.p.label));
  s.send(answers()[0].on.press); // Q1 answered, the AI's code moves on to Q2
  assert.ok(texts(s.out.tree).includes("Q2"));
  assert.ok(!texts(s.out.tree).includes("Not quite") && answers().every((a) => a.on), "Q2 is not already answered");
});

test("library: Choice calls the AI's handler, or keeps its own value when there is none", () => {
  const s = start(`const [view, setView] = useState("Week")
<Stack>
  <Choice value={view} options={["Day", "Week", "Month"]} onChange={setView} />
  <Text>{"Showing " + view}</Text>
  <Choice options={["A", "B"]} />
</Stack>`, { expand: true });
  const [first, second] = findAll(s.out.tree, (x) => x.t === "box" && x.p.surface === "sunk");
  const chosen = (box) => findAll(box, (x) => x.t === "button" && x.p.selected).map((b) => b.c.join(""));
  assert.deepEqual(chosen(first), ["Week"]);
  s.send(findAll(first, (x) => x.t === "button")[2].on.press);
  assert.equal(s.out.state.view, "Month", "the AI's setter ran");
  assert.ok(texts(s.out.tree).includes("Showing Month"));
  const own = findAll(s.out.tree, (x) => x.t === "box" && x.p.surface === "sunk")[1];
  assert.deepEqual(chosen(own), ["A"], "starts at the first option");
  s.send(findAll(own, (x) => x.t === "button")[1].on.press);
  assert.deepEqual(chosen(findAll(s.out.tree, (x) => x.t === "box" && x.p.surface === "sunk")[1]), ["B"]);
  assert.deepEqual(chosen(findAll(s.out.tree, (x) => x.t === "box" && x.p.surface === "sunk")[0]), ["Month"], "each Choice has its own state");
});

test("library: Steps numbers its steps and only takes Step; FollowUps ask; Carousel swipes; Field lines up", () => {
  const s = start(`<Stack>
  <Steps>
    <Step title="Split">Text becomes tokens.</Step>
    <Step title="Predict">Guess the next token.</Step>
    <Text>not a step</Text>
  </Steps>
  <Field label="Monthly" value="₹10,624" />
  <Carousel><Card title="Basic">₹199</Card><Card title="Plus">₹399</Card></Carousel>
  <FollowUps items={["How is it trained?", "Limits?"]} />
</Stack>`, { expand: true });
  const t = texts(s.out.tree);
  for (const word of ["1", "Split", "2", "Predict", "Monthly", "₹10,624", "How is it trained?"]) {
    assert.ok(t.includes(word) || findAll(s.out.tree, (x) => x.t === "button").some((b) => b.c.join("") === word), word);
  }
  assert.ok(!t.includes("not a step"), "Steps only takes Step");
  assert.ok(warnings(s.env).some((w) => /only takes <Step>/.test(w)));
  const pager = find(s.out.tree, (x) => x.t === "pager");
  assert.deepEqual(pager.c.map((c) => c.p.surface), ["card", "card"], "cards to swipe");
  const ask = findAll(s.out.tree, (x) => x.t === "button").find((b) => b.c.join("") === "Limits?");
  s.send(ask.on.press);
  assert.deepEqual(s.out.effects, [{ type: "ask", value: "Limits?" }]);
});

test("library: the plain-text backup reads like the parts", () => {
  const env = compile(`<Stack>
  <Steps><Step title="Split">Text becomes tokens.</Step></Steps>
  <Field label="Monthly" value="₹10,624" />
  <Quiz question="What is a token?" options={["A sentence", "A piece of text"]} answer={1} />
</Stack>`);
  assert.match(env.fallback, /\*\*Split\*\*/);
  assert.match(env.fallback, /1\. \*\*Split\*\*/);
  assert.match(env.fallback, /Monthly ₹10,624/);
  assert.match(env.fallback, /A\. A sentence/);
  assert.match(env.fallback, /\*\*What is a token\?\*\*/);
});

test("library: Code copies its text; Reveal opens and closes", () => {
  const s = start(`<Stack>
  <Code language="python" code={"print(1)\\nprint(2)"} />
  <Reveal label="Show hint"><Text>Look at the end.</Text></Reveal>
</Stack>`, { expand: true });
  assert.ok(find(s.out.tree, (x) => x.t === "text" && x.p.role === "code" && x.c.join("") === "print(1)\nprint(2)"), "lines kept");
  s.send(find(s.out.tree, (x) => x.p && x.p.label === "Copy code").on.press);
  assert.deepEqual(s.out.effects, [{ type: "copy", value: "print(1)\nprint(2)" }]);
  assert.ok(texts(s.out.tree).includes("Copied ✓"));
  const collapse = () => find(s.out.tree, (x) => x.t === "collapse");
  assert.equal(collapse().p.open, false);
  s.send(find(s.out.tree, (x) => x.p && x.p.label === "Show hint, closed").on.press);
  assert.equal(collapse().p.open, true);
});

test("library: Options picks one, or several with multiple; details make rows", () => {
  const s = start(`const [one, setOne] = useState("")
const [many, setMany] = useState([])
<Stack>
  <Options value={one} options={["A", "B"]} onChange={setOne} />
  <Options multiple options={[{ label: "Loops", detail: "for, while" }, { label: "Files" }]} onChange={setMany} />
</Stack>`, { expand: true });
  s.send(findAll(s.out.tree, (x) => x.t === "button")[1].on.press);
  assert.equal(s.out.state.one, "B");
  assert.ok(findAll(s.out.tree, (x) => x.t === "button")[1].p.selected);
  s.send(find(s.out.tree, (x) => x.p && x.p.label === "Loops").on.press);
  s.send(find(s.out.tree, (x) => x.p && x.p.label === "Files").on.press);
  assert.deepEqual(s.out.state.many, ["Loops", "Files"]);
  s.send(find(s.out.tree, (x) => x.p && x.p.label === "Loops, selected").on.press);
  assert.deepEqual(s.out.state.many, ["Files"], "a second tap removes it");
});

test("library: Form checks answers itself, then sends them once", () => {
  const s = start(`<Form submit="Book" fields={[{ name: "name", label: "Name", required: true }, { name: "email", label: "Email", kind: "email" }]} />`, { expand: true });
  const button = () => find(s.out.tree, (x) => x.t === "button");
  const inputs = () => findAll(s.out.tree, (x) => x.t === "input");
  s.send(button().on.press);
  assert.ok(texts(s.out.tree).includes("Please fill this in."));
  assert.deepEqual(s.out.effects, [], "nothing sent");
  s.send(inputs()[0].on.change, "Asha");
  s.send(inputs()[1].on.change, "not-an-email");
  s.send(button().on.press);
  assert.ok(texts(s.out.tree).includes("That doesn't look like an email."));
  s.send(inputs()[1].on.change, "asha@example.com");
  s.send(button().on.press);
  assert.deepEqual(s.out.effects, [{ type: "ask", value: "Name: Asha\nEmail: asha@example.com" }], "no onSubmit: sent as the user's message");
  assert.ok(button().p.disabled && inputs().every((i) => i.p.disabled), "locked after sending");
});

test("library: Confirm asks the app only after Allow, then locks; the AI's code can't act alone", () => {
  const s = start(`<Confirm title="Send?" action="send_email" args={{ to: "a@b.co" }} allow="Send"><Field label="To" value="a@b.co" /></Confirm>`, { expand: true });
  assert.deepEqual(s.out.effects, []);
  s.send(findAll(s.out.tree, (x) => x.t === "button").find((b) => b.c.join("") === "Send").on.press);
  assert.deepEqual(s.out.effects, [{ type: "action", value: JSON.stringify({ name: "send_email", args: { to: "a@b.co" } }) }]);
  assert.equal(findAll(s.out.tree, (x) => x.t === "button").length, 0, "no buttons after a tap");
  assert.ok(texts(s.out.tree).includes("Allowed. The app is doing it."));
  const sneaky = start(`<Button onPress={() => P.action("send_email")}>Go</Button>`, { expand: true });
  try { sneaky.send(find(sneaky.out.tree, (x) => x.t === "button").on.press); } catch { /* P.action is not a function */ }
  assert.ok(!(sneaky.out.effects || []).some((e) => e.type === "action"), "the AI's own code has no P.action");
});

test("library: Plan shows each step's state and folds when everything is finished; Sources open https only", () => {
  const s = start(`<Stack>
  <Plan items={[{ title: "Search", state: "done" }, { title: "Compare", state: "running" }, { title: "Hold", state: "waiting" }]} />
  <Plan items={[{ title: "A", state: "done" }, { title: "B", state: "skipped" }]} />
  <Sources items={[{ title: "Docs", url: "https://example.com/a" }, { title: "Bad", url: "javascript:alert(1)" }]} />
</Stack>`, { expand: true });
  assert.ok(texts(s.out.tree).includes("Working on it…"));
  assert.ok(find(s.out.tree, (x) => x.p && x.p.label === "Done, 2 steps"), "a finished plan folds");
  const docs = find(s.out.tree, (x) => x.p && x.p.label === "Source 1, Docs");
  s.send(docs.on.press);
  assert.deepEqual(s.out.effects, [{ type: "open", value: "https://example.com/a" }]);
  assert.ok(!find(s.out.tree, (x) => x.p && x.p.label === "Source 2, Bad").on, "not a web page: not tappable");
});

test("library: Flow lays out levels by itself; a link back up becomes a note, not a line", () => {
  const s = start(`<Flow nodes={[{ title: "Log in" }, { title: "Check" }, { title: "Home" }, { title: "Error" }]}
  links={[{ from: "Log in", to: "Check" }, { from: "Check", to: "Home", label: "right" }, { from: "Check", to: "Error", label: "wrong" },
    { from: "Error", to: "Log in", label: "try again" }, { from: "Nowhere", to: "Home" }]} />`, { expand: true });
  const rows = s.out.tree.c.filter((r) => r.c && r.c.some((b) => b.p && b.p.surface === "sunk"));
  const titles = rows.map((r) => r.c.map((b) => b.c[0].c.join("")));
  assert.deepEqual(titles, [["Log in"], ["Check"], ["Home", "Error"]], "Home and Error share a level");
  const t = texts(s.out.tree);
  assert.ok(t.includes("\u21A9\uFE0E Log in · try again"), "the retry is a note on Error");
  assert.ok(t.includes("right") && t.includes("wrong"), "arrow labels");
});

test("library: Flow without links is a chain, each via labelling its arrow", () => {
  const s = start(`<Flow nodes={[{ title: "Code" }, { title: "Tree", via: "builds" }, { title: "Pixels", via: "paints" }]} />`, { expand: true });
  const boxes = findAll(s.out.tree, (x) => x.p && x.p.surface === "sunk").map((b) => b.c[0].c.join(""));
  assert.deepEqual(boxes, ["Code", "Tree", "Pixels"]);
  const t = texts(s.out.tree);
  assert.ok(t.includes("builds") && t.includes("paints"));
});

test("packs: an app turns on only some packs; the prompt skips the rest and the compiler drops them", async () => {
  const { buildPrompt } = await import("../compiler/prompt.js");
  const { withPacks } = await import("../compiler/index.js");
  const all = buildPrompt(catalog);
  const teachOnly = buildPrompt(catalog, { packs: ["teach"] });
  for (const part of ["Flow", "Code", "Reveal", "Options", "Plan", "Confirm"]) assert.ok(all.includes(`### <${part}>`), part);
  assert.ok(teachOnly.includes("### <Flow>") && teachOnly.includes("### <Steps>"), "the chosen pack and the always-on parts");
  for (const part of ["Options", "Form", "Plan", "Confirm", "Sources"]) assert.ok(!teachOnly.includes(`### <${part}>`), part);
  assert.ok(teachOnly.length < all.length);
  const env = compile(`<Stack><Text>Hi</Text><Confirm title="Send?" action="send" /></Stack>`, { packs: ["teach"] });
  assert.ok(env.ok, "the rest still shows");
  assert.ok(env.diagnostics.some((d) => /<Confirm> is in the "act" pack/.test(d.message)));
  assert.ok(!env.uses.includes("Confirm"));
  assert.ok(compile(`<Confirm title="Send?" action="send" />`, { packs: ["act"] }).diagnostics.length === 0);
  assert.equal(withPacks(catalog), catalog, "no packs given: everything on");
  assert.throws(() => withPacks(catalog, ["nope"]), /Unknown pack "nope"/);
});

test("versions: an app on an older library is never taught or sent newer parts", async () => {
  const { buildPrompt } = await import("../compiler/prompt.js");
  const old = buildPrompt(catalog, { library: "1.4.0" });
  assert.ok(!old.includes("### <Flow>") && !old.includes("### <Confirm>"), "parts since 1.6.0 left out");
  assert.ok(old.includes("### <Steps>") && old.includes("### <Quiz>"), "older parts stay");
  const env = compile(`<Stack><Text>Hi</Text><Flow nodes={[{ title: "A" }, { title: "B" }]} /></Stack>`, { library: "1.4.0" });
  assert.ok(env.ok && env.diagnostics.some((d) => /<Flow> needs part library 1\.6\.0, but this app has 1\.4\.0/.test(d.message)));
  assert.deepEqual(env.needs, { library: "1.0.0" }, "what is left needs only an old library");
  assert.deepEqual(compile(`<Flow nodes={[{ title: "A" }, { title: "B" }]} />`).needs, { library: "1.6.0" });
});

test("versions: a device shows the fallback for a screen that needs a newer library", () => {
  const env = compile(`<Text>Hi</Text>`);
  env.needs = { library: "9.0.0" };
  const out = JSON.parse(prism.load("too-new", JSON.stringify(env)));
  assert.equal(out.tree, null);
  assert.match(out.errors[0].message, /Needs part library 9\.0\.0; this device has 1\.7\.1/);
  delete env.needs; // older envelopes have no needs: still drawn
  assert.ok(JSON.parse(prism.load("no-needs", JSON.stringify(env))).tree);
});

test("versions: a library that needs newer blocks doesn't load on an older drawer", async () => {
  const { readFileSync } = await import("node:fs");
  const code = readFileSync(new URL("../library/prism-library.js", import.meta.url), "utf8");
  const oldDevice = { prismBlocksVersion: 1 };
  new Function("globalThis", code)(oldDevice);
  assert.equal(oldDevice.prismLibrary, undefined, "blocks 1 can't draw library 1.7.1");
  const newDevice = { prismBlocksVersion: 2 };
  new Function("globalThis", code)(newDevice);
  assert.equal(newDevice.prismLibrary.version, "1.7.1");
  assert.equal(prism.blocksVersion(), "2");
});

test("versions: the server rule picks the library an app will draw with", async () => {
  const { libraryFor, canUseServerLibrary, versions } = await import("../compiler/versions.js");
  assert.deepEqual(versions(), { format: 1, blocks: 2, library: "1.7.1" });
  assert.equal(libraryFor({ blocks: 2, library: "1.4.0" }), "1.7.1", "it can load ours");
  assert.equal(libraryFor({ blocks: 1, library: "1.4.0" }), "1.4.0", "its drawer is too old for ours");
  assert.equal(libraryFor({ blocks: 3, library: "1.8.0" }), "1.8.0", "an app newer than the server keeps its own");
  assert.equal(libraryFor(undefined), undefined, "no app info: newest");
  assert.ok(!canUseServerLibrary(undefined), "no blocks number counts as 1");
});

test("library: a newer library from the server replaces the built-in one; an older one is ignored", () => {
  const builtIn = globalThis.prismLibrary;
  try {
    const newer = `globalThis.prismLibrary = { version: "9.0.0", blocks: 1, parts: Object.assign({}, globalThis.prismLibrary.parts, {
      Field: function (p, kids, ui) { return ui.h("text", { role: "label" }, [p.label + " = " + p.value]); } }) };`;
    assert.equal(prism.setLibrary(newer), "9.0.0");
    assert.equal(prism.libraryVersion(), "9.0.0");
    const s = start(`<Field label="A" value="1" />`, { expand: true });
    assert.deepEqual(texts(s.out.tree), ["A = 1"], "drawn by the new library, no app update");
    assert.match(prism.setLibrary("globalThis.prismLibrary = 1 + "), /^error/, "broken code is refused");
    assert.equal(prism.libraryVersion(), "9.0.0", "and the working library stays");
  } finally {
    globalThis.prismLibrary = builtIn;
  }
  assert.equal(prism.libraryVersion(), globalThis.prismLibrary.version);
});

// Real Haiku reply (workout tips): <br /> between lines used to be dropped, running the lines together.
test("<br /> inside text becomes a line break", () => {
  const s = start(`<Callout title="Tips">• Start light.<br />• Rest well.<br/>• Sleep.</Callout>`);
  assert.equal(find(s.out.tree, (x) => x.t === "Text").c.join(""), "• Start light.\n• Rest well.\n• Sleep.");
  assert.ok(!warnings(s.env).some((w) => /<br>/.test(w)));
});


// ---------- Streaming: partial screens (compiler/partial.js) ----------

test("streaming: open tags and brackets are closed so a half-written screen compiles", async () => {
  const { closeOpen, partialSources, partialEnvelope } = await import("../compiler/partial.js");
  assert.equal(closeOpen(`<Card title="BMI">\n  <Slider label="W" />`), "\n</Card>");
  assert.equal(closeOpen(`<Stack>\n  {tasks.map(t => (\n    <Row key={t.id}>\n      <Text>{t.name}</Text>`), "\n</Row>))}</Stack>");
  assert.equal(closeOpen(`<Card title="a > b {">`), "\n</Card>", "strings and braces inside props are skipped");
  assert.equal(closeOpen(`<Quiz question="What"\n  options={["a",`), null, "an opening tag that isn't finished can't be closed");
  assert.deepEqual(partialSources(`const [n, setN] = useState(0)\n<Card title="x">`), [], "no complete screen line yet");

  // A real block, fed one character at a time: every partial that compiles is a valid screen,
  // and the screens only grow.
  const full = example("12-chat-parts");
  let last = 0, shown = 0;
  for (let i = 0; i <= full.length; i += 7) {
    const env = partialEnvelope(full.slice(0, i), compile);
    if (!env) continue;
    const out = JSON.parse(prism.load(`partial${i}`, JSON.stringify(env)));
    assert.ok(out.tree, `partial at ${i} draws`);
    const size = JSON.stringify(out.tree).length;
    assert.ok(size >= last * 0.9, `screens grow (at ${i})`);
    last = size;
    shown++;
  }
  assert.ok(shown > 20, `many partial screens (${shown})`);
});

test("library: Compare shows options field by field; two side by side, more as cards to swipe", () => {
  const plans = `[{ name: "Basic", price: "₹199", data: "5 GB" }, { name: "Plus", price: "₹399", data: "20 GB" }, { name: "Max", price: 649, data: "Unlimited", bad: { x: 1 } }]`;
  const two = start(`<Compare items={${plans}.slice(0, 2)} fields={["price", { label: "Data", value: "data" }]} />`, { expand: true });
  assert.equal(two.out.tree.p.dir, "row");
  assert.deepEqual(texts(two.out.tree), ["Basic", "Price", "₹199", "Data", "5 GB", "Plus", "Price", "₹399", "Data", "20 GB"]);
  assert.equal(findAll(two.out.tree, (x) => x.t === "button").length, 0, "nothing to pick without onChange");
  const s = start(`const [plan, setPlan] = useState("Plus")
<Compare items={${plans}} fields={["price"]} value={plan} onChange={setPlan} />`, { expand: true });
  assert.equal(s.out.tree.t, "pager", "three options: cards to swipe");
  assert.ok(texts(s.out.tree).includes("649"), "numbers shown as text");
  const buttons = () => findAll(s.out.tree, (x) => x.t === "button");
  assert.deepEqual(buttons().map((b) => b.c[0]), ["Choose", "Chosen", "Choose"]);
  s.send(buttons()[2].on.press);
  assert.equal(s.out.state.plan, "Max", "the AI's setter ran");
  assert.deepEqual(buttons().map((b) => b.c[0]), ["Choose", "Choose", "Chosen"]);
  assert.ok(buttons().every((b) => b.p.kind !== "main"), "no extra main button");
});

test("tokens: W3C Design Tokens file for design tools", async () => {
  const { dtcgTokens } = await import("../compiler/tokens.js");
  const t = dtcgTokens(tokens);
  const leaves = [];
  (function walk(node, path) {
    if (node && typeof node === "object" && "$value" in node) return leaves.push([path, node]);
    for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) walk(v, path + "." + k);
  })(t, "");
  assert.ok(leaves.length > 100);
  for (const [path, leaf] of leaves) assert.ok(["color", "dimension", "fontWeight", "typography"].includes(leaf.$type), path);
  assert.equal(t.color.light.tone.primary.solid.$value, tokens.color.light.tone.primary.solid);
  assert.equal(t.space.md.$value, "12px");
  assert.equal(t.font.title.md.$value.fontSize, "18px");
});


// ---------- Tool call (any model, no API keys in Prism) ----------

import { prismTool, toolPrompt, handleToolCall, partialToolCode, TOOL_NAME } from "../compiler/tool.js";
import { partialEnvelope } from "../compiler/partial.js";

test("tool: one definition in the shape of each API", () => {
  assert.equal(prismTool("anthropic").name, TOOL_NAME);
  assert.deepEqual(prismTool("anthropic").input_schema.required, ["code"]);
  assert.equal(prismTool("openai").type, "function");
  assert.equal(prismTool("openai").function.parameters.additionalProperties, false, "OpenAI strict mode needs this");
  assert.ok(prismTool("mcp").inputSchema);
  assert.throws(() => prismTool("gemini-ish"), /Unknown tool format/);
});

test("tool: the prompt teaches the tool, not ```prism blocks", () => {
  const p = toolPrompt();
  assert.match(p, /show_screen/);
  assert.doesNotMatch(p, /```prism/);
  const examples = [...p.split("## Named values")[0].matchAll(/```jsx\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.equal(examples.length, 2);
  for (const b of examples) assert.deepEqual(compile(b).diagnostics, [], "the example screens compile cleanly");
});

test("tool: a call becomes an envelope, and the model hears what happened", () => {
  const good = handleToolCall({ code: `const [n, setN] = useState(0)\n<Button onPress={() => setN(n + 1)}>{n}</Button>` });
  assert.ok(good.envelope.ok);
  assert.equal(good.result, "Shown to the user.");

  const fixed = handleToolCall(JSON.stringify({ code: `<Button onClick={() => 1}>Go</Button>` }));
  assert.ok(fixed.envelope.ok, "OpenAI sends the arguments as JSON text");
  assert.match(fixed.result, /^Shown to the user\. The app fixed 1 small problem/);
  assert.match(fixed.result, /onClick> was renamed to onPress/);

  const bad = handleToolCall({ code: `<Text>{fetch("x")}</Text>` });
  assert.equal(bad.envelope.ok, false);
  assert.match(bad.result, /^Not shown\. Fix these and call show_screen again:\n- Unknown name "fetch" \(line 1\)/);

  assert.equal(handleToolCall({}).envelope, null);
  assert.match(handleToolCall("not json").result, /needs \{ "code"/);
});

test("tool: a call that is still streaming already gives a partial screen", () => {
  assert.equal(partialToolCode('{"co'), null);
  const sofar = '{"code": "const [n, setN] = useState(0)\\n<Card title=\\"Count\\">\\n  <Stat label=\\"N\\" value={n} />\\n  <Text>Tap';
  assert.equal(partialToolCode(sofar), 'const [n, setN] = useState(0)\n<Card title="Count">\n  <Stat label="N" value={n} />\n  <Text>Tap');
  assert.equal(partialToolCode('{"code": "a\\'), "a", "an escape cut in half waits for the rest");
  assert.equal(partialToolCode('{"code": "\\u00e9\\t"}'), "é\t");
  const env = partialEnvelope(partialToolCode(sofar), compile);
  assert.ok(env && env.ok, "the half-written card compiles");
  assert.deepEqual(env.uses, ["Card", "Stat"]);
});

test("a React habit: `return (...)` at the top is read as the screen", () => {
  const s = start(`const [done, setDone] = useState(false)
const label = done ? "Done" : "Not yet"

return done ? (
  <Card title="All set"><Text>{label}</Text></Card>
) : (
  <Card title="Task">
    <Button onPress={() => setDone(true)}>Finish</Button>
  </Card>
)`);
  assert.ok(s.env.ok, JSON.stringify(s.env.diagnostics));
  assert.match(warnings(s.env).join(), /needs no `return`/);
  assert.equal(s.out.tree.p.title, "Task");
  s.send(find(s.out.tree, (x) => x.t === "Button").on.press);
  assert.equal(s.out.tree.p.title, "All set");
  assert.ok(!compile(`function f() {\nreturn 1\n}\n<Text>{f()}</Text>`).diagnostics.length, "a return inside a helper is not the habit");
});
