# Prism design system

**Made for generative UI in chat.** The AI decides *what* to show; the design system decides *how it looks*; the host app gives the brand. A Prism screen should look like part of the conversation, not a poster.

Decided 2026-10-21. It replaces the earlier general-purpose system (six tones and free spacing on every part). Section 11 says what is built and what isn't yet. The source of truth is two files: `core/catalog.json` (what the AI may write) and `core/tokens.json` (how it looks: sizes, corners, fonts, colours; the AI never sees it). This file explains them. Goes with `FORMAT.md` (the message format) and `ARCHITECTURE.md`.

```
 AI writes meaning only            Design system decides the look        Host app gives the brand
 ──────────────────────            ──────────────────────────────        ────────────────────────
 <Steps> <Stat> <Button main>  ──▶  spacing, sizes, which colour,   ──▶   accent colour, font,
 status="bad", secondary            one main action, no nesting           text size, light / dark
                                                                                    │
                                                                                    ▼
                                                                    native screen on iOS, Android,
                                                                    web and desktop, in the app's style
```

---

## 1. Why a design system just for this

General design systems (Material, shadcn) are made for people building whole apps: many colours, sizes and variants, because designers need the freedom. Generative UI is different:

1. **The AI is the designer, and every free choice is a chance to choose badly.** Our first screens mixed indigo sliders, green badges, sky-blue boxes and purple tags because every part offered six tones.
2. **The screen is a guest in someone else's chat.** It must sit quietly next to the messages, in the app's own font and colour.
3. **Every option costs tokens.** Style props (`size="sm" tone="muted" weight="semibold"`) were about 9% of screen code.

So the rule is: **fewer choices for the AI, better defaults in the system, bigger parts that already look right.**

---

## 2. Rules

1. **Meaning, never looks.** The AI says what something *is* (`status="bad"`, `secondary`, `main`), never a colour, size or pixel value.
2. **Greys first.** Almost everything is grey on the chat's own background. Colour is rare, so it means something.
3. **One accent, from the app.** Used for the one main action and for controls (slider, switch, progress). Nothing else.
4. **Status colours only for status.** Good, warning and bad are for real states ("healthy", "low stock", "over budget"), in small doses: text, a dot, a thin bar. Never big filled areas.
5. **One main action per screen.** Every other button is quiet. Danger only for destructive actions.
6. **One surface, no nesting.** A screen is a column of cards or plain rows. No card inside a card.
7. **The app's own font and text size**, including the user's accessibility text size.
8. **Spacing is automatic.** It follows the structure; the AI never picks a number.
9. **Forgiving input, strict output.** Old or wrong style props are accepted and ignored with a warning. What reaches the device is always valid and calm.

---

## 3. Colours

The whole palette, taken from the Prism brand (`brand/README.md`): ink, off-white glass, azure, mint, peach and coral. **The AI can't pick any of these directly**; parts pick them from the meaning.

| Role | Light (default) | Dark (default) | Used for |
|---|---|---|---|
| `background` | the chat's own | the chat's own | behind everything (transparent widget) |
| `surface` | `#FFFFFF` | `#111114` | cards |
| `surfaceMuted` | `#F2F1F0` | `#1A1A1F` | quiet buttons, input fields, notes |
| `border` | `#E6E4E2` | `#24242A` | card edges, dividers, table lines |
| `text` | `#18181B` | `#F4F4F5` | normal text |
| `textSecondary` | `#6B6966` | `#A8A6A5` | labels, hints, secondary lines |
| `accent` | **from the app** (default: brand azure `#3A76F0`) | from the app (default `#4C8DFF`) | main button, slider, switch, progress, selected choice, links |
| `onAccent` | worked out | worked out | text on the accent |
| `accentSoft` | worked out | worked out | selected-but-quiet backgrounds |
| `good` / `warning` / `bad` | mint `#0F7650` / peach `#A8501F` / coral `#C8372C` | `#5CE3A8` / `#FFC2A1` / `#FF7A70` | status text, dots, thin bars |
| `goodSoft` / `warningSoft` / `badSoft` | very light tints | very dark tints | a status note's background |
| `chart1`–`chart5` | accent + aqua, peach, stone, soft azure (from the logo) | the same, tuned for dark | chart lines and bars only |

**Three colours in, a full set out.** The app gives at most three: `accent` (its main colour), and optionally `background` and `text` (if its chat isn't on plain white or black). Everything else in the table is worked out from those. The app gives one accent at least. The SDK works out `onAccent` and `accentSoft` for light and dark, and checks that text on them is readable (WCAG AA, contrast 4.5:1). If the app's colour is too light to read, the SDK darkens it for text and keeps it for fills.

Example: `Prism.start(theme: .init(accent: .orange))` makes every main button, slider and switch orange, with readable white or dark text on it.

---

## 4. Text

Four roles. Sizes follow the app's body text size (and the user's accessibility setting), so Prism text matches the chat around it.

| Role | Looks | AI writes |
|---|---|---|
| **title** | body + 3, semibold | `<Title>` or a Card's `title` |
| **body** | the app's body size | `<Text>` |
| **secondary** | body − 2, `textSecondary` | `<Text secondary>` |
| **number** | about 2× body, bold, digits all the same width | `<Stat value>` |

Plus two small extras, both meaning, not looks: `<Text strong>` for emphasis, and `<Text status="bad">` for a status word.

Font: the app's own (SF on iOS, Roboto or the app's font on Android, `system-ui` or the site's font on the web).

---

## 5. Space and shape

- **Rhythm is automatic:** 16 between cards, 12 between parts inside a card, 8 between a label and its value. A `Stack` or `Row` may say `tight` (half the space) when items belong closely together; nothing else.
- **Width:** a screen fills the chat column (about 360 points on a phone) and lines up with the chat text: the outermost layout has no padding.
- **Corners:** one corner style from the app (`rounded` by default; `square` and `pill` possible), applied to cards, buttons and fields consistently.

---

## 6. Controls

Controls use each platform's own look (native slider, switch, menu), coloured with the accent.

| Button | When | Looks |
|---|---|---|
| `main` | the one action the screen is about | accent fill |
| (default) | everything else | quiet: `surfaceMuted` fill, accent text |
| `danger` | deleting, cancelling, losing something | quiet, `bad` text |

If the AI marks several buttons `main`, only the first one stays main.

---

## 7. Parts

**Next version (plan, 2026-10-22):** `PARTS.md` lists the chat library v2: new parts `Code`, `Reveal`, `Options`, `Form`, `Sources`, `Plan`, `Confirm`, and what we clipped from OpenUI.

Two kinds: **basic parts** for anything, and **chat parts**: bigger parts for what chat screens do most often, with good design built in. Chat parts are shorter to write (fewer tokens) and can't be styled badly.

Like OpenUI's two libraries (a general one and a smaller chat one), the AI is given **the chat parts first** in its instructions, and the basic parts as the fallback for anything else.

### Chat parts (new)

| Part | What it's for | Example |
|---|---|---|
| `Steps` / `Step` | a numbered process, a lesson's stages | `<Steps><Step title="Tokenize">Text becomes pieces…</Step><Step title="Embed">…</Step></Steps>` |
| `Choice` | pick one of 2–5 options (a segmented control); the right part for tabs | `<Choice value={plan} options={["Basic","Plus","Max"]} onChange={setPlan} />` |
| `Field` | a label with a value, on one line | `<Field label="Monthly payment" value={"₹" + emi} />` |
| `Compare` | compare 2–3 options on a phone; stacks into readable rows instead of a squashed table | `<Compare items={plans} fields={["price","data"]} pick={setPlan} />` |
| `Quiz` | one question with feedback | `<Quiz question="What is a token?" options={[...]} answer={1} explain="A token is…" />` |
| `FollowUps` | 2–3 suggested next questions; tapping one asks it | `<FollowUps items={["How is it trained?","What are its limits?"]} />` |

### Basic parts (kept, with fewer props)

| Group | Parts | What the AI can still set |
|---|---|---|
| Layout | `Stack`, `Row`, `Grid`, `Card`, `Divider`, `Spacer` | `tight`; Row `align`/`justify`/`wrap`; Grid `columns`; Card `title`/`subtitle` |
| Content | `Title`, `Text`, `Badge`, `Callout`, `Stat`, `Progress`, `Table`/`TableRow`/`Cell`, `Chart`, `Image` | `secondary`, `strong`, `status`, `align`, `lines`; Stat `label`/`value`/`change`; Chart and Image as today |
| Controls | `Button`, `Checkbox`, `Switch`, `Input`, `Slider`, `Select` | `main` / `danger` on Button; labels, values, limits, events |

**Removed:** `tone`, `variant`, `size`, `weight`, `gap` and `pad` (cut 2026-10-21, before the first release). The compiler drops them with a warning, so an AI habit like `tone="danger"` just draws grey.

**Hidden from the AI** (they still draw, so older replies keep working, but the prompt doesn't list them): `Grid`, `Spacer`, `Table`/`TableRow`/`Cell` (Compare and Field cover chat needs), `Checkbox` (Switch does the same job), and the layout knobs `align`/`justify`. `Image` is listed only on replies where the server supplies images. This took the prompt from about 4,060 to 3,150 tokens with the same answer quality (two runs of the 20 eval requests).

`Icon` was removed (2026-10-21) with its name list: it drew nothing until an icon set is chosen. It comes back with that set.

The catalog has no colours, pixels or fonts at all (a test checks this). Controls that are the same as a basic block (`Slider`, `Input`, `Select`, `Switch`, `Checkbox`, `Chart`, `Image`) borrow the block's props with `"sameAs"`, so there is one copy. Chart height is the default size; the AI doesn't pick it.

Later candidates (OpenUI has them; we add them when real answers need them): `DatePicker`, `Radio` (pick one, with descriptions), `Accordion` (show/hide details).

---

## 8. What the runtime makes sure of

Whatever the AI writes, on every platform:

- the outermost layout has no padding (the screen lines up with the chat text);
- only the first `main` button is main;
- no card inside a card (an inner card is drawn as a plain group);
- colours only through the rules above.

These rules live in the shared runtime (`prism-runtime.js`), so web, iOS and Android behave the same.

---

## 9. Tokens: one source, every platform

```
base tokens          core: greys, status colours, chart palette, rhythm, type ratios
     ▼               (one file, W3C Design Tokens JSON, so standard tools can read it)
platform layer       small overrides: font, control height (44 pt iOS, 48 dp Android, 36 px web),
     ▼               default accent
brand layer          the host app, at runtime: accent, font, corner style
     ▼
mode                 light / dark (later: high contrast)
     ▼
resolved theme on the device ──▶ drawer
```

- **Generated from the one source:** CSS variables (web, desktop), a TypeScript object (Valdi drawer), Swift and Kotlin constants (the SDKs' own chat screens).
- **Brand at runtime:** the app passes its theme when it starts Prism; nothing needs rebuilding.
- **Screens never carry colours.** The same envelope looks right in a bank's blue app and a shop's orange app.
- **Versioned with the catalog,** so an older app never meets a colour role or part it doesn't know.

API sketch (the same three inputs everywhere; anything more is "full colours", section 9b level 2):

```swift
Prism.start(theme: .init(accent: .orange, font: .custom("Inter"), corners: .rounded))
```
```kotlin
Prism.start(context, PrismTheme(accent = Color(0xFFFF6A00), corners = Corners.Rounded))
```
```css
:root { --prism-accent: #ff6a00; --prism-font: Inter, system-ui; }
```

---

## 9b. Customising: what app developers can change

The defaults are calm on purpose, and app developers can turn them up. Customising happens **in the app (and its server)**, never in what the AI writes, so one screen package still works in every theme.

| Level | What they change | Example |
|---|---|---|
| **1. Brand** | accent, font, corner style, density | `Prism.start(theme: .init(accent: .orange, font: .custom("Inter")))` |
| **2. Full colours** | any colour role in section 3 (greys, surfaces, status, chart), light and dark | `theme.colors.surface = …` |
| **3. Parts and rules** | turn parts off, relax a rule, add their own instructions for the AI | no `Chart`; allow two `main` buttons; "prices are always in ₹" |
| **4. Their own parts** | add parts drawn by **their own native views**, described once so the AI can use them | `<ProductCard id="sku_42" />` drawn by their SwiftUI / Compose / React view |
| **5. Re-skin a basic part** | replace how one of our parts is drawn | their own Button instead of ours (later) |

What stays fixed, whatever they change:
- **The AI writes meaning only.** No colours or sizes in screen packages.
- **Safety:** the AI's code stays in the sandbox; actions go through the app.
- **Readability:** custom colours still get the contrast check (a warning in development, an automatic fix in release).

Level 4 needs two things: the part's description (name, props, one example) goes into the AI's instructions on their server, and their app registers a native view for it. The Valdi drawer can already host native views (our sliders and switches are native), so their views plug in the same way.

---

## 10. How it's built and kept correct

**One file, `catalog.json`,** says which parts exist, what each prop means and what values are allowed. Everything else is generated from it or checked against it:

```
                         catalog.json
        ┌──────────────┬──────┴───────┬──────────────────┐
        ▼              ▼              ▼                  ▼
   AI instructions  Compiler       Runtime            Tokens
   (prompt.md)      fixes and      checks values,     (css, json, ts,
                    checks         fills defaults,    swift, kotlin)
                    literal        enforces section 8
                    values
```

`npm run build` in `core` writes `dist/prompt.md` and the token files. Devices get the part rules inside each envelope (`spec`).

**A part in the catalog:**

```json
"Badge": {
  "group": "content",
  "description": "A small rounded label for a short status or count.",
  "children": "text",
  "props": { "status": { "type": "status", "description": "Only for a real state: good, warning or bad." } },
  "example": "<Badge status=\"good\">Paid</Badge>"
}
```

Keys: `group`, `description` (goes into the prompt), `children` (`none`, `text`, `parts`, or `only` some parts), `parents`, and per prop: `type`, `default`, `required`, `min`/`max`, `between`. `example` is shown to the AI.

**What happens to a prop:** the compiler (server) fixes names and literal values (`<button color="error">` becomes `<Button danger>`, with warnings); the runtime (device) checks values worked out while running, fills in every default and applies section 8. A part that breaks a rule is dropped alone.

**Tests** in `core/test` check the catalog itself (every alias, parent and default is valid; every colour role exists in light and dark), and that every example compiles with zero warnings. Real AI replies are kept as regression tests (`test/ai-replies/`).

**How we'll know it's better:** on the fixed set of prompts (`core/eval`), before and after:
- tokens per screen (today about 400);
- screens that draw with no dropped parts;
- "looks right": greys plus at most one accent and real status colours, one main action.

---

## 10b. What we learned from others (2026-10-21)

- **ChatGPT** lets its AI write raw colours and pixel sizes on low-level boxes. That suits its own app, where widgets can be loud; it costs many tokens and doesn't fit a guest in someone else's app. We do the opposite.
- **OpenUI** (`@openuidev/react-ui`) matches our choices: a separate component set for chat answers (`openuiChatLibrary`: Card, follow-ups, lists, sections, steps, callouts), the AI never styles anything, and the theme comes from a few colours (`createTheme({ primary, background, foreground })`) with built-in light and dark. Web only. We follow the same idea, natively on phones, with a smaller set.

---

## 11. Status

| Piece | Status |
|---|---|
| Basic blocks (box, text, button, pager, collapse…) drawn on web, iOS and Android | ✅ built (step 1) |
| Part library: every part built from blocks, chat parts (`Steps`, `Step`, `Choice`, `Field`, `Quiz`, `FollowUps`, `Carousel`), loadable from the server | ✅ built (step 2) |
| Meaning-only inputs (`main`, `danger`, `secondary`, `strong`, `status`, `tight`); old style inputs removed | ✅ built |
| Calm rules in the library: one main button, grey unless a real status, no card in a card, no tones reach the drawer | ✅ built |
| AI instructions: chat parts first, three example screens, only the value types in use | ✅ built |
| Brand: one accent (plus optional background and text) → primary colours for light and dark with contrast checks; `Prism.theme` on iOS and Android, picker on web | ✅ built |
| `Compare` part (2 side by side, 3–4 to swipe, optional choosing) | ✅ built |
| The app's font: font names per weight in the brand (`PrismTheme.Font`), else the system font | ✅ built |
| Text size follows the phone's accessibility setting | ✅ (every font is written as `"system 15 body 30"`: grows like body text, up to 2×; Android scales on its own) |
| Corner style from the app: rounded, square, pill | ✅ built |
| Tokens in the W3C Design Tokens format (`dist/prism.tokens.json`) for design tools | ✅ generated (the source of truth is `tokens.json`) |
| Chart colours: series 1 the accent, series 2–5 calm chart colours (never status colours) | ✅ built |
| Icons | ⏸ removed until an icon set is chosen |
