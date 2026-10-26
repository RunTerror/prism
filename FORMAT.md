# Prism format: one JavaScript format for every platform

First draft. It goes with `ARCHITECTURE.md`. Working code: `poc/core` (compiler, runtime, examples). How clients draw: `poc/core/CLIENTS.md`.

**Built in the POC so far:** everything below except `P.query` / `P.run` / async handlers and `tools`. The web and Valdi clients don't draw the newest parts yet; that is the next build step (`ARCHITECTURE.md` section 8).

**In one line:** the AI writes JSX. Our server turns it into plain JavaScript. The **same runtime file** runs that JavaScript on every platform and hands back a plain screen tree. Each platform only has to draw that tree.

```
AI writes            Server sends              Every device runs          Device draws
```prism block  -->  envelope (plain JS)  -->  prism-runtime.js     -->  screen tree --> native views
 (layer 1)            (layer 2)                 (same file everywhere)     (layer 3)
                                                      ^                         |
                                                      +---- taps (layer 4) -----+
```

Why this works on all platforms: every platform can run plain JavaScript (browser, JavaScriptCore, QuickJS, Hermes, Flutter's JS packages). We keep the JavaScript plain, keep the device-specific part tiny, and make the device do only one job: draw a tree.

| Platform | Runs the JS in | Draws with |
|---|---|---|
| Web | A Web Worker (no page access) | React |
| Electron | Same Web Worker, in a locked window | Same React drawer |
| iOS | JavaScriptCore (or Valdi's engine) | Valdi native views |
| Android | QuickJS (or Valdi's engine) | Valdi native views |
| Flutter (iOS / Android) | Valdi's engine, same as above | Valdi views, embedded in Flutter as native views |

---

## Layer 1: what the AI writes

A normal Markdown reply with a ` ```prism ` block inside it.

````markdown
Here's your task tracker:

```prism
const [tasks, setTasks] = useState([
  { id: 1, title: "Design", done: true },
  { id: 2, title: "Build", done: false }
])
const [draft, setDraft] = useState("")
const doneCount = tasks.filter(t => t.done).length

<Card title="Tasks">
  <Text tone="muted">{doneCount} of {tasks.length} done</Text>

  {tasks.map(t => (
    <Row key={t.id} gap="sm">
      <Checkbox value={t.done} onChange={v => setTasks(tasks.map(x => x.id === t.id ? { ...x, done: v } : x))} />
      <Text strike={t.done}>{t.title}</Text>
    </Row>
  ))}

  {tasks.length === 0 && <Text tone="muted">Nothing yet</Text>}

  <Row gap="sm">
    <Input value={draft} onChange={setDraft} placeholder="New task" />
    <Button disabled={!draft.trim()} onPress={() => {
      setTasks([...tasks, { id: tasks.length + 1, title: draft.trim(), done: false }])
      setDraft("")
    }}>Add</Button>
  </Row>
</Card>
```
````

### The rules, in order

1. **Top part: setup lines.** Only three kinds:
   - `const [name, setName] = useState(value)`: a value the screen remembers, written exactly like React. The start value must be plain data (numbers, text, true/false, lists, objects), so it can be saved and sent to any platform. Each `useState` must be its own line at the top, never inside a function, loop or `if`.
   - `const name = ...` (or `let`): a value worked out again on every draw, from state.
   - `function name(...) { ... }`: a small helper.
2. **Bottom part: one screen.** One JSX tree, starting on a line that begins with `<` (no indent). Everything from there on is the screen, so setup lines don't need semicolons. If the AI writes several parts side by side, the server wraps them in a `<Stack>`.
3. **Only catalog parts.** Tags start with a capital letter and must be in our catalog (see below). Unknown tags are dropped, and the server reports them.
4. **Lists and conditions use normal JavaScript:** `.map(...)` for lists, `&&` or `a ? b : c` for show/hide. There's no special `{#each}` / `{#if}` syntax. AIs already write normal JSX well, so they make fewer mistakes.
5. **Changing state goes through the setter, like React:** `setCount(count + 1)`, `setCount(c => c + 1)`, `setTasks([...tasks, item])`. Writing `count = 5` or `count++` is refused. Changing a list in place (`tasks.push(...)`) still works, but the server reports a warning. Like React, `count` keeps the value from the current draw until the screen draws again. We copy React here because AIs already write it well, and ChatGPT uses the same style.
6. **Events:** `onPress={() => ...}` for taps and `onChange={v => ...}` for inputs. `v` is always the new value, so a setter can be passed straight in: `onChange={setDraft}`. The server fixes two React habits and reports a warning: `onClick` becomes `onPress`, and `e.target.value` becomes `e`.
7. **Only `useState` for now.** Other React hooks (`useEffect`, `useMemo`, `useRef`...) are refused.
8. **Styling uses names, not raw values:** `tone="muted"`, `gap="md"`, `size="lg"`. This keeps light/dark mode and every platform looking the same. Raw colours or pixels are not allowed in version 1.
9. **Not allowed** (the server removes it and reports it): `import`, `class`, `eval`, `new Function`, `window`, `document`, `fetch`, `setTimeout`, `localStorage`, `async`/`await` outside `P` calls, `while (true)`-style loops with no end.
10. **Talking to the outside world goes only through `P`:**
   - `P.query("weather", { city })`: load data from one of our tools (returns a promise)
   - `P.run("save_note", { text })`: do an action with one of our tools
   - `P.ask("Make it blue")`: send a message to the AI as if the user typed it
   - `P.open(url)`: open a link the server approved
   - `P.copy(text)`, `P.toast("Saved")`

   Example: `onPress={async () => setWeather(await P.query("weather", { city }))}`

---

## Layer 2: what the server sends (the envelope)

The server checks the block, then turns it into **plain JavaScript with no JSX**. This JavaScript runs on every engine we listed: modern syntax (arrows, `const`, spread) is fine, but no modules and no browser objects.

```json
{
  "v": 1,
  "id": "msg_123/block_0",
  "ok": true,
  "code": "<the compiled JavaScript below, as one string>",
  "text": ["Tasks", " of ", " done", "Nothing yet", "New task", "Add"],
  "state": {
    "tasks": [{ "id": 1, "title": "Design", "done": true }, { "id": 2, "title": "Build", "done": false }],
    "draft": ""
  },
  "uses": ["Card", "Text", "Row", "Checkbox", "Input", "Button"],
  "tools": [],
  "appData": { "images": {} },
  "fallback": "Here's your task tracker:\n- [x] Design\n- [ ] Build",
  "diagnostics": []
}
```

| Field | What it is |
|---|---|
| `v` | Format version. Devices refuse versions they don't know and show `fallback`. |
| `id` | Which message and which block. Used to save state. |
| `ok` | `false` if the block was refused. Then `code` is empty and devices show `fallback`. |
| `code` | The compiled screen, as plain JavaScript. |
| `text` | All fixed words, kept out of the code (`T[0]`, `T[1]`...). Safer, and easy to translate later. |
| `state` | Starting values of every `useState` line. |
| `uses` | Catalog parts needed. If the device lacks one, it shows `fallback`. |
| `spec` | The catalog rules for each part in `uses` (allowed values, aliases, defaults, ranges). The runtime checks every prop with it. |
| `tools` | Which `P.query` / `P.run` tools the screen may call. Anything else is refused. |
| `appData` | What the server approved for this block. `images`: `{ name: "https://..." }`. An `<Image src="name">` can only show these; devices load nothing else. |
| `fallback` | Plain Markdown version, for old apps and errors. |
| `diagnostics` | What the server fixed or dropped, so we can improve the AI instructions. |

### The compiled code

The task tracker from layer 1 becomes (shortened for reading: the real output also adds `P.tick()` inside every function). To see the real thing, run `node scripts/compile.mjs <file>` in `poc/core`. The compiler's steps are marked `STEP 0` to `STEP 7` in `poc/core/compiler/index.js`.

```js
P.screen(function (S, T) {
  const tasks = S.tasks;
  const setTasks = function (v) { S.tasks = typeof v === "function" ? v(S.tasks) : v; };
  const draft = S.draft;
  const setDraft = function (v) { S.draft = typeof v === "function" ? v(S.draft) : v; };
  const doneCount = tasks.filter(t => (P.tick(), t.done)).length;

  return P.el("Card", "n0", { title: T[0] }, [
    P.safe("n1", () => P.el("Text", "n1", { tone: "muted" },
      [doneCount, T[1], tasks.length, T[2]])),

    P.safe("n2", () => tasks.map(t => (P.tick(),
      P.el("Row", "n2", { key: t.id, gap: "sm" }, [
        P.el("Checkbox", "n3", { value: t.done,
          onChange: P.on("h0", v => setTasks(tasks.map(x => x.id === t.id ? { ...x, done: v } : x))) }),
        P.el("Text", "n4", { strike: t.done }, [t.title])
      ])))),

    P.safe("n5", () => tasks.length === 0 && P.el("Text", "n5", { tone: "muted" }, [T[3]])),

    P.el("Row", "n6", { gap: "sm" }, [
      P.el("Input", "n7", { value: draft, placeholder: T[4], onChange: P.on("h1", setDraft) }),
      P.el("Button", "n8", {
        disabled: !draft.trim(),
        onPress: P.on("h2", () => {
          setTasks([...tasks, { id: tasks.length + 1, title: draft.trim(), done: false }]);
          setDraft("");
        })
      }, [T[5]])
    ])
  ]);
});
```

What the server changed, and why:

| Change | Why |
|---|---|
| JSX → `P.el(type, nodeId, props, children)` | Engines don't understand JSX. `P.el` is plain JavaScript. |
| `useState` line → `const tasks = S.tasks` + a `setTasks` function | All state lives in `S`, so the runtime can save it. `tasks` is read once per draw, so handlers see the same value React would. `setTasks` writes into `S`; the runtime draws again after every event. |
| Words → `T[n]` | Same as ChatGPT's constants. |
| Each part wrapped in `P.safe(...)` | If one part crashes, only that part disappears. |
| Each handler wrapped in `P.on("h2", ...)` | Gives every handler a fixed name. The device sends back "h2 was tapped", never code. |
| `P.tick()` inside loops and functions | Counts steps. Too many steps stops the run. This works on every engine, so we don't depend on engine-specific time limits. |
| `nodeId` (`"n0"`, `"n1"`...) | Stable names for parts, so later we can send only what changed. |

---

## Layer 3: what the runtime gives the drawer (the screen tree)

Plain JSON. No code, no functions. This is the **only** thing a drawer has to understand.

Shortened below: in the real tree every part also carries all its other props, filled in from the catalog's defaults (for example every `Text` has `size`, `tone`, `weight`, `align` and `strike`).

```json
{ "t": "Card", "id": "n0", "p": { "title": "Tasks" }, "c": [
  { "t": "Text", "id": "n1", "p": { "tone": "muted" }, "c": ["1 of 2 done"] },
  { "t": "Row", "id": "n2", "k": 1, "p": { "gap": "sm" }, "c": [
    { "t": "Checkbox", "id": "n3", "p": { "value": true }, "on": { "change": "h0" } },
    { "t": "Text", "id": "n4", "p": { "strike": true }, "c": ["Design"] }
  ]},
  { "t": "Row", "id": "n2", "k": 2, "p": { "gap": "sm" }, "c": [
    { "t": "Checkbox", "id": "n3", "p": { "value": false }, "on": { "change": "h0#1" } },
    { "t": "Text", "id": "n4", "p": { "strike": false }, "c": ["Build"] }
  ]},
  { "t": "Row", "id": "n6", "p": { "gap": "sm" }, "c": [
    { "t": "Input", "id": "n7", "p": { "value": "", "placeholder": "New task" }, "on": { "change": "h1" } },
    { "t": "Button", "id": "n8", "p": { "disabled": true }, "c": ["Add"], "on": { "press": "h2" } }
  ]}
]}
```

| Key | Meaning |
|---|---|
| `t` | Catalog part name |
| `id` | Node name from the compiler |
| `k` | Key, for items in a list |
| `p` | Props. Only plain values, always complete and valid: the runtime checks each one against the envelope's `spec` and fills in every default. |
| `c` | Children: other nodes, or plain text. Loose text inside a layout part arrives as a `Text` node. |
| `on` | Event name → handler name. The same handler inside a list is numbered in drawing order (`h0`, `h0#1`, `h0#2`), so the runtime knows which task was ticked. |

Numbers and words are already joined into text (`"1 of 2 done"`), so drawers never do maths or formatting.

---

## Layer 4: messages between device and runtime

The runtime is one JavaScript file, `prism-runtime.js`, **identical on every platform**. Each platform writes a small "bridge" (around 100 lines) that moves these messages back and forth.

**Device → runtime**

| Call | When |
|---|---|
| `prism.load(envelope, savedState?)` | Show a block. Uses saved state if we have it. |
| `prism.event("h0#1", true)` | User did something. Second value is the new value, if any. |
| `prism.env({ theme: "dark", width: 390, platform: "ios" })` | Theme, screen size or platform changed. |
| `prism.reply(callId, result)` | Answer to a `P.query` / `P.run` the runtime asked for. |

**Runtime → device**

| Message | What the device does |
|---|---|
| `draw(tree)` | Draw this screen tree. Version 1 sends the whole tree; later, only changes. |
| `call(callId, "query", "weather", args)` | Ask our server's tool, then `prism.reply`. |
| `save(state)` | Store the state with the chat message. |
| `ask(text)` / `open(url)` / `copy(text)` / `toast(text)` | Do it natively. |
| `error(nodeId, message)` | Log it. The part is already hidden. |

That's the whole contract. **A new platform only needs:** a JS engine, this bridge, and a drawer for the catalog.

---

## The catalog

The parts, their props and the allowed values are in `poc/core/catalog.json`; the design tokens are in `poc/core/tokens.json`. **`DESIGN-SYSTEM.md` explains it.** The full list for the AI is generated into `poc/core/dist/prompt.md`.

| Group | Parts |
|---|---|
| Layout | `Stack`, `Row`, `Grid`, `Card`, `Divider`, `Spacer` |
| Content | `Title`, `Text`, `Badge`, `Callout`, `Stat`, `Progress`, `Table`, `TableRow`, `Cell` |
| Controls | `Button`, `Checkbox`, `Switch`, `Input`, `Slider`, `Select` |

The envelope also carries a `spec`: the catalog rules for each part used. The runtime uses it to check every prop and fill in the defaults, so the screen tree a drawer gets is always complete and valid.

---

## Open questions

1. **Valdi and a second engine.** On phones, do we run the AI code inside Valdi's own JS engine (in a separate locked context), or in a second engine next to it? We need to test what Valdi allows.
2. **Raw colours.** ChatGPT lets the AI use hex colours. We say no for version 1: `tone` plus the `info` tone cover it for now.
3. **Valdi inside Flutter.** Test scrolling speed with many widgets in a chat, auto height, and keyboard/gestures. Only if this fails do we build a separate Flutter-widget drawer.
4. **Drawing while streaming.** Setup lines come first, so the server could start early. We'll leave this until after the POC.
