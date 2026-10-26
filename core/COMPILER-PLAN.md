# Compiler plan: fixes and next parts

What the compiler does about AI mistakes (done and still to do), and how new parts like `Chart` and `Image` were added.

- Compiler: `compiler/index.js` (read it by its `STEP 0` to `STEP 7` headers)
- Format: `../FORMAT.md` · Design system: `../DESIGN-SYSTEM.md`

---

## 1. How the compiler handles AI mistakes

From cheapest to most expensive:

```
1. Prevent      the AI instructions (dist/prompt.md) are generated from catalog.json      done
2. Auto-fix     the compiler fixes common slips and reports a warning                    done
3. Hide         a part that crashes while drawing disappears alone (P.safe)              done
4. Backup       a refused block shows plain text instead                                 basic
5. Retry        send the exact errors back to the AI                                     to do
```

Two kinds of problems:

| Kind | Examples | What happens |
|---|---|---|
| **Error**: whole block refused | broken syntax, `fetch`, `window`, `count = 5`, `useEffect`, a start value that isn't plain data | `ok: false`; the app shows the backup text |
| **Warning**: fixed, or one piece dropped | `<VStack>`, `onClick`, `tone="error"`, `gap={4}`, an unknown part, an icon with no name | the block still works |

---

## 2. Done

### Prevent: AI instructions from the catalog
`compiler/prompt.js` builds `dist/prompt.md` from `catalog.json`: the rules, a worked example, the value lists, and every part with its props and example. Tests check that every example in it compiles with zero warnings.

### Auto-fix (STEP 3 and STEP 5)

| AI wrote | Becomes | Where |
|---|---|---|
| `<VStack>`, `<Heading>`, `<Alert>`… | `<Stack>`, `<Title>`, `<Callout>`… | `partAliases` in the catalog |
| `<button>` (lowercase) | `<Button>` | compiler |
| `color=`, `onClick=`, `padding=`… | `tone=`, `onPress=`, `pad=`… | `propAliases` in the catalog |
| `tone="error"`, `size="Large"` | `"danger"`, `"lg"` | aliases on each value list |
| `gap={4}` | `"lg"` (nearest step) | `fromNumber` on `space` |
| `columns={9}` | `4` | `min` / `max` on the prop |
| `e.target.value`, `e.preventDefault()` | `e`, removed | STEP 3 |
| `items.push(x)` | still works, with a warning | STEP 4 |

Values worked out on the device get the same fixes from the runtime's `checkValue`, so `tone={ok ? "success" : "error"}` works too.

### useState start values
`startValue()` works out start values that use other constants, lists, objects and spreads. It was found by the AI test: Babel alone gave up on `done: empty` when `empty` was used twice.

### Hide what breaks
Every part is wrapped in `P.safe`; a crash hides only that part. Endless loops stop after 200,000 steps (`P.tick`).

### Measure (the AI test)
`eval/` holds 20 requests and the replies from each run. `node scripts/eval.mjs eval/runs/*.md` counts clean, warnings, refused and runtime errors, and lists the most common problems. First result on Claude Haiku 5.5: 40 of 40 clean. Clean runs are copied to `test/ai-replies/`, so they stay covered by the tests.

---

## 3. Still to do

- [ ] **Protect setup lines too.** Today a crash in a setup line (`const first = items[0].name` with an empty list) hides the whole widget. Wrap each one like ChatGPT's `__dilSafe(() => ..., fallback)`: a setup line becomes `undefined`, a condition `false`, a list `[]`.
- [ ] **A better backup for refused blocks.** Today it is only "This part of the answer could not be shown." Show the block's words instead (titles, labels, list items), taken from the parts of the tree that did parse.
- [ ] **Retry with the AI.** When a block is refused, send the exact errors back ("Line 4: unknown name `fetch`. Fix only this.") at most once or twice, then fall back. Needs the chat loop first.
- [ ] **A `fixed` level for diagnostics.** Today a fix and a dropped piece are both `warning`. Splitting them makes the AI test clearer.
- [ ] **Run the AI test on every prompt change**, and on a second model (Claude Sonnet 5.5) to compare.

---

## 4. `Chart` and `Image` (done 2026-10-20)

The AI test asked for both (request 17: a steps chart; request 18: a product photo). Before, the model worked around them with progress bars and a placeholder.

### How any new part is added

1. Add it to `catalog.json`: description, group, children, props (with defaults, ranges, required), example.
2. If it needs a new kind of value, teach the runtime's `checkValue` that kind (and add it to `compactProp`).
3. Run the tests. They check the catalog, the example, and the generated prompt.
4. Add a request to `eval/requests.md`, run the AI test, copy a clean run into `test/ai-replies/`.
5. Draw it in each drawer (web, then Valdi), and add it to `CLIENTS.md` section 4.

### Chart

```jsx
<Chart kind="bar" data={[4200, 8100, 6500]} labels={["Mon", "Tue", "Wed"]} label="Steps per day" />
```

| Prop | Type | Notes |
|---|---|---|
| `kind` | `bar` / `line` / `area` | default `bar` |
| `data` | **type `series`**: a list of numbers, or `{ name, values }` lists for several series | required |
| `labels` | **type `textList`**: list of text | one per value |
| `tone` | tone | colour of the first series; the others get the next tones |
| `height` | size | sm / md / lg → `component.chart.height` |
| `label` | text | what the chart shows, for screen readers |

- [x] `series` in `checkValue`: numbers only (numbers written as text are fixed, anything else is a gap), at most 5 series and 200 points. A flat list becomes one series. No numbers at all → the chart is dropped.
- [x] The runtime gives each series its own tone (`calm()`), so drawers only read `series.tone`. `info` is left out: it is the same grey as `neutral`.
- [x] Catalog entry, example, aliases (`<BarChart>`, `values=`, `type=`), tokens under `component.chart`.
- [x] Fallback text: a small table of labels and values.
- [x] Drawers: web (boxes for bars, SVG for lines) and Valdi (`prism_renderer/src/PrismChart.tsx`).
- **Decision:** on phones the chart is drawn once from Valdi views and `<shape>` paths, the same code on iOS and Android. Not Swift Charts: Android has no platform chart library, and one drawer is easier to keep right. The AI only ever writes `<Chart>`, so this can change later without touching prompts or old replies. Screen readers hear the label and every value.

### Image

The model never types an image address: it could point anywhere, or be made up. The **server** supplies approved images, and the model only names them.

```jsx
<Image src="headphones" alt="Black over-ear headphones" ratio="square" />
```

```
tool or search result  -->  server: compile(source, { appData: { images: { headphones: "https://cdn.../a.jpg" } } })
AI instructions        -->  imagesPrompt(appData) adds "Images for this reply" with the names
compiler               -->  only https addresses kept; src must be a known name, else the Image is dropped with a warning
runtime                -->  checks names worked out on the device the same way (envelope.appData)
drawer                 -->  loads only addresses from envelope.appData; the tree carries only the name
```

| Prop | Type | Notes |
|---|---|---|
| `src` | **type `asset`**: a name from `appData.images` | required |
| `alt` | text | required: read out by screen readers, shown while it can't load, and used in the fallback text |
| `ratio` | `square` / `wide` / `tall` | default `wide` → `component.image.ratio` |
| `fit` | `cover` / `contain` | default `cover` |

- [x] Envelope field `appData`, filled by the server and passed to the compiler (`compile(source, { appData })`, `compileMessage(..., { appData })`).
- [x] `asset` in `checkValue` (with the images as a second input), on the server and on the device.
- [x] The AI instructions: a rule in `dist/prompt.md`, plus `imagesPrompt(appData)` for each reply.
- [x] Drawers load with the platform's own loader and show a neutral box with `alt` while loading or on failure.
- [x] Fallback text: `![alt](address)`.
- [ ] `Link` with the same idea for addresses (`appData.links`). There is no `Link` part yet.
- [ ] Android: check the photo actually loads on the emulator (the first test run was disturbed by another session using the same emulator).
