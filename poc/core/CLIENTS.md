# How a Prism client works

> **Status:** sections 3 and 4 describe the new design system (`../../DESIGN-SYSTEM.md`). The web and Valdi drawers still follow the old rules; updating them is the next build step (`../../ARCHITECTURE.md` section 8).

There are two drawers: **React** (web and Electron) and **Valdi** (the mobile SDK, used by every mobile app framework through thin wrappers). Each drawer does the same three things:

1. **Load** `prism-runtime.js` into a JavaScript engine.
2. **Bridge**: call `prism.load` / `prism.event` with strings, get a JSON string back.
3. **Draw** the screen tree with native views, using the rules below.

The runtime, the compiler and the examples live in `poc/core`. Run `npm run build` there to compile the examples into `core/dist/`. Clients take the files from there:

| Client | How it gets the files |
|---|---|
| Web / Electron | imports from `core/` directly |
| Mobile client (Valdi: iOS and Android) | `poc/sdk`. `scripts/embed-core.sh` copies the runtime, part library and tokens into its Valdi modules |

Files: `prism-runtime.js`, `examples.json` (`[{ id, title, source, envelope }]`), `tokens.json` / `tokens.css` (design tokens). The part rules come inside each envelope (`spec`).

---

## 1. The bridge

The runtime puts one object on the global scope: `prism`. All inputs and outputs are **strings**, so any engine that can "run a JS string and return a string" works.

```js
prism.load(instanceId, envelopeJson, savedStateJson?)  // -> outputJson
prism.event(instanceId, handlerId, valueJson?)         // -> outputJson
prism.unload(instanceId)                               // -> "true"
```

To call it from native code, build a JS string with every argument JSON-encoded (that makes it a safe JS string literal):

```
prism.load(<JSON string of instanceId>, <JSON string of envelopeJson>)
prism.event(<JSON string of instanceId>, <JSON string of handlerId>, <JSON string of valueJson>)
```

- `instanceId`: unique per widget on screen (for example `"03-tasks#1"`).
- `valueJson`: the new value, JSON-encoded: `true`, `42`, `"hello"`. Leave it out for button presses.
- If `envelope.ok` is false, don't call the runtime. Show `envelope.fallback` as muted text.
- `envelope.appData.images` (`{ name: "https://..." }`) are the only images this block may show. Keep them with the
  widget: an `Image` in the tree carries only the name. Load nothing that isn't in this list, and only `https`.

**Output:**

```json
{ "tree": { ... } | null, "state": { ... }, "effects": [ { "type": "toast", "value": "Saved" } ], "errors": [ { "node": "n4", "message": "..." } ] }
```

- `tree`: draw it. If `null`, show `envelope.fallback`.
- `effects`: `toast` → show a toast/snackbar · `open` → open the URL · `copy` → copy to clipboard · `ask` → POC only: toast "Would ask AI: …".
- `errors`: log them only. Broken parts are already removed from the tree.

---

## 2. The screen tree

```json
{ "t": "Row", "id": "n3", "k": 2, "p": { "gap": "sm" }, "c": [ ...nodes or strings ], "on": { "change": "h0#1" } }
```

| Key | Meaning |
|---|---|
| `t` | Part name from the catalog. Unknown name → draw nothing. |
| `id` | Node id. Not unique inside lists: use `id` + `k` as the identity. |
| `k` | List key (optional). |
| `p` | Props. Complete and valid: the runtime checks each one against the catalog and fills in every default, so a drawer never guesses. Optional props with no default (like `title`, `label`, `icon`) may be absent. |
| `c` | Children (optional): nodes, or plain strings for text parts. |
| `on` | Events (optional): event name → handler id. Send the handler id back with `prism.event`. |

After every `prism.event`, redraw from the new tree. Version 1 always sends the whole tree.

---

## 3. Design tokens

Take them from `dist/tokens.json` (plain numbers and colours, for Swift, Kotlin or TypeScript) or `dist/tokens.css` (CSS variables for the web). Both are generated from `tokens.json` by `npm run build`; never type them by hand. Follow the system light/dark mode.

| Group | Values |
|---|---|
| `space` | none 0, xs 4, sm 8, md 12, lg 16, xl 24, xxl 32 |
| `radius` | none 0, sm 6, md 10, lg 14, full 999 |
| `font.text` (size/line) | sm 13/18, md 15/21, lg 17/24 |
| `font.title` (size/line, weight) | sm 15/20 600, md 18/24 600, lg 22/28 700, xl 32/38 700 |
| `font.weight` | regular 400, medium 500, semibold 600, bold 700 |
| `control.height` | sm 32, md 40, lg 48 |
| `icon.size` | sm 16, md 20, lg 24 |
| `component` | ready-made values per part, for example `card.radius` 14, `card.pad` 16, `button.padX.md` 12, `badge.radius` 999 |

**Colours** (each in `light` and `dark`):

- Surfaces and text: `background`, `surface`, `surfaceMuted`, `border`, `borderStrong`, `text`, `textMuted`
- Each tone (`neutral`, `primary`, `success`, `warning`, `danger`, `info`) has four:

| Role | Use it for |
|---|---|
| `solid` | Filled backgrounds: solid button, solid badge, progress bar, control tint |
| `onSolid` | Text and icons on `solid` |
| `soft` | Tinted backgrounds: soft badge, Callout |
| `text` | Text and icons in that tone, on the page or on `soft` |

Blocks carry a `status` (good, warning, bad), never a colour. Draw good with the `success` tone, warning with `warning`, bad with `danger`. Everything else uses `text`, `textMuted` and the `primary` (accent) tone.

---

## 4. How to draw each block

**Rule: write once where possible, use the platform's own control where users expect its feel.**

The AI writes parts (`Card`, `Quiz`…); the part library (`library/prism-library.js`) turns every part
into the 15 **basic blocks** below before the drawer sees them. So a drawer only draws blocks. Every
block is drawn with **native views**. How each control is made:

| Control | Mobile (Valdi) | Why |
|---|---|---|
| `button`, `checkbox`, `select`, `progress` | **Written once** from Valdi's own elements (`<view>` + `<label>` + tap), styled with tokens | Same look on iOS, Android and web (our design system); one piece of code |
| `input` | Valdi's built-in `<textfield>` / `<textview>` | Already the platform's own text field on both, from one piece of code |
| `switch`, `slider` | **The platform's own control** (`UISwitch`, `UISlider` / `MaterialSwitch`, Material `Slider`), embedded with `<custom-view>` | Users expect the platform's exact feel; a re-drawn copy feels off |

On the web, every control is the browser's own element, styled with tokens.

This table lives only here. `catalog.json` (`blocks`) describes what each block is (name, props, children), not how a platform draws it.

**The platform's own controls** (mobile: through `<custom-view>`, or Valdi's built-in text field):

| Control | iOS | Android | Web |
|---|---|---|---|
| `Switch` | `UISwitch`, onTintColor primary `solid` | `MaterialSwitch` | `<input type="checkbox" role="switch">` |
| `Slider` | `UISlider`, minimumTrackTintColor primary `solid` | Material `Slider` | `<input type="range">` |
| `Input` | Valdi `<textfield>` (`<textview>` when `multiline`) | same | `<input>` / `<textarea>` |

**Icons:** none for now. The `Icon` part was removed until an icon set is chosen (DESIGN-SYSTEM.md).

### Every block

The widget sits in a vertical scroll area with 16 padding on the `background` colour. Props arrive
complete (defaults filled in, values checked), so a drawer reads them directly.

| Block | Draw as | Rules |
|---|---|---|
| `box` | A column, or a row when `dir="row"` | `gap`, `pad` from `space`; `align`, `justify`, `wrap`; `grow` takes the free space in its row. `surface`: `none` (layout only), `card` (`surface` background, 1px `border`, `card.radius`), `sunk` (`surfaceMuted`), `note` (soft tint: the status tone's `soft`, else `surfaceMuted`; `callout.radius`), `pill` (`badge.radius`, soft tint the same way). `role` and `label` are for screen readers; `onPress` makes the whole box tappable. |
| `text` | Text that wraps | `role`: `title` (`card.titleStyle`), `body` (text md), `secondary` (text sm, `textMuted`), `number` (`stat.valueStyle`), `label` (text sm, semibold). `strong` = semibold. `status` colours the words. `align`, `strike`; `lines` cuts off after that many lines. Sizes follow the phone's text size setting. |
| `button` | Drawn from views: `control.height`, `button.radius` | `kind`: `main` (accent fill, `onSolid` text: the one main action), `quiet` (outline, accent text), `danger` (outline, danger text), `plain` (text only). `selected` shows it as chosen; `full` = full width; `disabled`. Tap → `on.press`. |
| `progress` | A bar drawn from views: track `surfaceMuted`, fill the accent (or the status tone) | `value` 0 to 1, `progress` tokens. |
| `pager` | Swipe sideways | `peek`: card-width pages with the next one showing at the edge; otherwise full-width pages that snap. `gap` between pages. |
| `collapse` | Its children, only when `open` | |
| `divider` | 1px line | `border` colour, full width |
| `spacer` | Flexible empty space | Grows to push neighbours apart |
| `chart` | Drawn once from views and paths (no platform chart library), `chart` tokens | `data` arrives as `[{ name, values, tone }]`: every series already has its `tone` (accent, then `chart2`–`chart5`); draw it in that tone's `solid`. A `null` value is a gap. Scale from `min(0, lowest)` to `max(0, highest)`, with a 1px `border` line at zero and the highest value above the plot in text sm `textMuted`. `bar`: one box per value, `chart.gap` between groups. `line`: a `chart.lineWidth` line per series; `area`: the same plus the area to the zero line at about 18% opacity. `labels` along the bottom; a legend only for several series. Accessibility label: `label` plus every value. |
| `image` | The platform's own image view | Look `src` up in `envelope.appData.images`; a name not there, or a failed load, shows the box with `alt` instead. Full width, `image.ratio[ratio]`, `image.radius`, `surfaceMuted` while loading. `fit`: cover or contain. |
| `checkbox` | A box drawn from views (filled accent + check when ticked) + `label` | `disabled`. Tap → `on.change` with `!value`. |
| `switch` | **Platform switch**, `label` left, switch right | `disabled`. Change → `on.change` with the new bool. |
| `input` | **Platform text field** | `label` above, `placeholder`, `kind` picks the keyboard (`number` sends a number, or `null` when empty), `multiline`, `disabled`. Every edit → `on.change`; return → `on.submit`. Keep the typed text locally while editing so the cursor doesn't jump. |
| `slider` | **Platform slider** | `min`, `max`, `step`, `label` above, `disabled`. `value` is already kept between min and max. Change → `on.change`. |
| `select` | A field drawn from views that opens the platform's own menu | `options` arrive as `[{ label, value }]`. Show `placeholder` while `value` matches none. Change → `on.change` with the chosen `value`. |

A name that is not a block should not arrive. If one does, draw a small outlined box with its name, so the mistake is visible.

## 5. What each POC app shows

1. **Gallery**: list of the examples in `examples.json` (by `title`).
2. **Example screen**: the drawn widget. A toggle to show the `source` (what the "AI" wrote) under it. A "Reset" action that loads it again.
3. Light and dark mode follow the system.

The examples are written to test everything: `01-hello` (layout, text, callout), `02-counter` (state and buttons), `03-tasks` (lists, checkbox, input), `04-settings` (switch, slider), `05-table` (table), `06-broken` (dropped and crashing parts, endless-loop button), `07-effects` (toast, copy, open, ask), `08-dashboard` (stat, select, callout, progress), `09-charts`, `10-product` (image), `11-blocks` (every block, written directly), `12-chat-parts` (steps, quiz, choice, compare, follow-ups).

For more real-world screens, the AI test replies in `test/ai-replies/` are good to check a drawer against.
