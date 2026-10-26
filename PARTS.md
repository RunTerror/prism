# Prism parts: the chat library, version 2 (plan)

**What this is:** the list of ready-made parts the AI may use in an assistant chat that teaches and can act (agentic), with what each part looks like and does. It builds on `DESIGN-SYSTEM.md` (the colour, text and spacing rules), and those rules still apply. Every part here is built from basic blocks in the part library (`core/library/prism-library.js`) and described for the AI in `core/catalog.json`.

Status: **plan, 2026-10-22.** Nothing new is built yet. Section 6 gives the build order.

```
 AI writes a part                  Part library (on the phone)            Drawer (native)
 ────────────────                  ───────────────────────────            ───────────────
 <Confirm title="Send email?"  ──▶  turns it into basic blocks:     ──▶   real iOS / Android /
   action="send_email">             box, text, button…                    web views, in the
   <Field label="To" … />           + its rules (one main button,         app's colours and font
 </Confirm>                          locked after a tap)
```

---

## 1. What we took from OpenUI, and what we do differently

OpenUI (`thesysdev/openui`, `packages/react-ui/src/genui-lib/openuiChatLibrary.tsx`) is the closest project to ours. Its chat library has about 90 parts.

**Copied:**

1. **Each part = name + inputs + one-line description + example**, and the AI's instructions are generated from that list. We already do this (`catalog.json`).
2. **"When to use" notes per group.** OpenUI adds short rules next to each group (for example "use FollowUpBlock at the end of a response"). We add a `use` line to each part.
3. **The form checks the answers itself.** The AI only says "required" or "email". The part shows the error message, so the AI never writes error text.
4. **Sources on the reply.** The answer lists its sources once, and the text points to them as [1], [2].
5. **Tapping a list item or a follow-up sends text back to the AI as the user's message.** Our `FollowUps` already does this.
6. **Every slide in a carousel has the same shape.** This is a rule in the instructions.

**Done differently:**

1. **Far fewer parts.** Every part name costs prompt tokens and is one more chance for the AI to choose badly. OpenUI has 5 families of cards, 10 chart types and 4 kinds of pick-from-a-list. We have about 25 parts.
2. **Meaning, not variants.** OpenUI's `Callout` takes `variant: info | warning | error | success | neutral`. Ours takes `status` only for a real state. Everything else is grey.
3. **Native drawing.** OpenUI is React only. We draw the same parts with real native controls on each platform.

---

## 2. The full list

✅ built · 🆕 new in this plan · ⏸ later

| Job | Parts |
|---|---|
| **Explain** | ✅ `Title` `Text` `Callout` `Steps`/`Step` `Flow` `Code` `Reveal` `Image` `Chart` · ⏸ `Term` |
| **Show facts** | ✅ `Field` `Stat` `Compare` `Badge` `Card` |
| **Ask the user** | ✅ `Options` `Form` `Choice` `Input` `Slider` `Switch` `Select` `Button` |
| **Check understanding** | ✅ `Quiz` `Progress` · ⏸ `Flashcard` |
| **Act (agentic)** | ✅ `Plan` `Confirm` `Sources` · ⏸ `Activity` |
| **Keep talking** | ✅ `FollowUps` `Carousel` |

**Which to use for choosing:** this rule goes in the AI's instructions.
- `Choice`: switch between views (like tabs). 2–5 short words.
- `Options`: the user answers a question by picking one or more.
- `Select`: a long list (6 or more).

---

## 3. Who makes each part

Most parts are written by the AI. A few should come from **what really happened**, so the AI can't make them up.

| Part | Who fills it |
|---|---|
| `Plan` while the agent works | **the server**, from the agent's real tool calls (step started, done, failed). The AI may write a `Plan` only to show a plan *before* acting. |
| `Sources` | **the AI writes it**, but only from links its tools returned. Later, the server will drop any link that no tool returned. |
| `Confirm` | **the AI asks**; **the app** decides what "Allow" does. The AI can only name actions the app has listed. |
| everything else | the AI |

---

## 4. Every part is described the same way

Every new part has these 8 things, in this order:

1. **For:** one line
2. **AI writes:** an example
3. **Inputs:** each one, with type
4. **Looks:** which blocks it uses, in the `DESIGN-SYSTEM.md` roles
5. **The user can:** taps, and what each tap sends
6. **While streaming:** what shows when only half of it has arrived
7. **Screen reader:** what is read out
8. **Use / don't use:** the line that goes into the AI's instructions

---

## 5. The new parts

### 5.1 `Code`

1. **For:** a piece of code, a command or a formula to copy.
2. **AI writes:**
   ```
   <Code language="python">for i in range(3):
       print(i)</Code>
   ```
3. **Inputs:** `language` (text, optional, shown as a small label). The code is the text inside.
4. **Looks:** a `surfaceMuted` box with code-font text. Long lines **scroll sideways** and don't wrap, because wrapped code is hard to read. Top row: the language in `secondary` text on the left, a quiet **Copy** button on the right. No syntax colours for now (see section 7).
5. **The user can:** tap Copy. The part sends a `copy` effect, the app puts the text on the clipboard, and the button says "Copied" for 2 seconds.
6. **While streaming:** lines appear as they are written. Copy is hidden until the block is complete.
7. **Screen reader:** "Code, python", then the text. The button reads "Copy code".
8. **Use / don't use:** use for code, terminal commands and exact text to copy. Not for normal sentences, and not for numbers (use `Field` or `Stat`).

**New in the blocks:** a `mono` text style, sideways scroll on `box`, and a `copy` effect in the apps.

### 5.2 `Reveal`

1. **For:** something hidden until the user asks: a hint, the answer to an exercise, "more details".
2. **AI writes:**
   ```
   <Reveal label="Show hint">
     <Text>Start from the last item and work backwards.</Text>
   </Reveal>
   ```
3. **Inputs:** `label` (text, required: what the closed row says). Parts inside.
4. **Looks:** a plain row with the label and a small arrow. When opened, the parts show below it. No card around it. Uses the `collapse` block, which already exists.
5. **The user can:** tap to open or close. The part remembers this in its own saved state.
6. **While streaming:** the row shows as soon as the label arrives. Inside parts stream in behind it, closed.
7. **Screen reader:** "Show hint, collapsed, button".
8. **Use / don't use:** use for hints, answers to try first, and long side details. Don't hide the main answer.

### 5.3 `Options`

1. **For:** the user answers by picking one or more options. It replaces OpenUI's Chips, OptionCards, RadioGroup and CheckBoxGroup.
2. **AI writes:**
   ```
   <Options value={level} options={["New to it", "Some practice", "Expert"]} onChange={setLevel} />
   <Options multiple value={topics} options={[{label:"Loops", detail:"for, while"}, {label:"Functions", detail:"def, return"}]} onChange={setTopics} />
   ```
3. **Inputs:** `options` (a list of text, or of `{label, detail}`), `value`, `multiple` (yes or no), `onChange`.
4. **Looks:** the part picks the look from the content, not the AI:
   - **short labels, no details:** pills that wrap onto new lines. A picked pill uses `accentSoft` with accent text.
   - **with details:** full-width rows with the label and a `secondary` detail line, and a tick or circle on the right.
5. **The user can:** tap to pick. One-pick mode swaps the pick; `multiple` adds or removes. Sends `change`.
6. **While streaming:** options appear one by one. Taps work only once the list is complete.
7. **Screen reader:** each option is "Loops, for while, checkbox, not checked" or "radio button".
8. **Use / don't use:** use to ask the user something with fixed answers. For switching views use `Choice`. For 6 or more options use `Select`.

### 5.4 `Form`

1. **For:** collecting a few answers together and sending them in one go (booking, sign-up, settings for a task).
2. **AI writes:**
   ```
   <Form submit="Book table" onSubmit={book}>
     <Input name="name" label="Name" required />
     <Input name="email" label="Email" kind="email" required />
     <Slider name="people" label="People" min={1} max={8} value={2} />
   </Form>
   ```
3. **Inputs:** `submit` (the button text), `onSubmit`. The controls inside get `name`, plus checks: `required`, `kind` (`text`, `email`, `number`, `phone`, `url`), `min`/`max`, and `lines` for a long answer (replaces OpenUI's TextArea).
4. **Looks:** the controls stacked with the normal rhythm, then one `main` button at the bottom. No card inside a card.
5. **The user can:** fill it in and tap submit. If a check fails, the part shows a short error under that field in `bad` text and moves focus there. If all checks pass, it sends `submit` with `{name: value…}`. If there is no `onSubmit`, it sends the answers to the AI as the user's message. After a send, the form locks and the button says "Sent".
6. **While streaming:** fields appear as they arrive. Submit stays disabled until the whole form has arrived.
7. **Screen reader:** each field reads its label and "required". Errors are read out when they appear.
8. **Use / don't use:** use for 2–6 answers that belong together. For one question, a single control or `Options` is enough. Never put a Form inside a Form. Never write error text: the form does it.

### 5.5 `Sources`

1. **For:** showing where facts came from.
2. **AI writes:**
   ```
   <Text>Python was first released in 1991 [1].</Text>
   <Sources items={[{title:"History of Python", site:"python.org", url:"https://…"}]} />
   ```
3. **Inputs:** `items`: a list of `{title, site, url}`.
4. **Looks:** a small `secondary` heading "Sources", then one row per source: its number, the title (one line), and the site in `secondary` text. Always the last part of the reply.
5. **The user can:** tap a row. It sends an `open` effect with the URL, and the app opens it in its in-app browser.
6. **While streaming:** rows appear one by one.
7. **Screen reader:** "Source 1, History of Python, python.org, link".
8. **Use / don't use:** use when the answer relies on things the agent looked up. Only use links that a tool returned, never made-up ones.

**Later:** draw `[1]` inside `Text` as a small tappable number. For now it stays plain text.

### 5.6 `Plan`

1. **For:** the agent's steps and how far each one has got.
2. **AI writes** (only for a plan *before* acting; while the agent works, the server sends the same part):
   ```
   <Plan items={[
     {title:"Find flights to Goa", state:"done"},
     {title:"Compare prices", state:"running"},
     {title:"Hold the cheapest seat", state:"waiting"}
   ]} />
   ```
3. **Inputs:** `items`: a list of `{title, state, detail?}`. `state` is one of `waiting`, `running`, `done`, `failed` or `skipped`.
4. **Looks:** a list with a small mark per row: empty circle (waiting), spinner (running), tick (done), cross in `bad` (failed), dash (skipped). The running row is `strong`, and done rows are `secondary`. When everything is done, the list folds into one line, "Done · 3 steps", which opens on tap.
5. **The user can:** tap the folded line to open it. Nothing else.
6. **While streaming:** rows appear one by one. State changes come as updates to the same part, so the list doesn't jump.
7. **Screen reader:** "Step 2 of 3, Compare prices, in progress".
8. **Use / don't use:** use to show a plan with 3 or more steps before acting. Don't use it for teaching steps: that's `Steps`.

**New in the blocks:** a small spinner (the `progress` block without a value).

### 5.7 `Confirm`

1. **For:** asking before the agent does something real (sends, books, buys, deletes).
2. **AI writes:**
   ```
   <Confirm title="Send this email to Priya?" action="send_email" args={{to:"priya@…", subject:"Notes"}}>
     <Field label="To" value="priya@…" />
     <Field label="Subject" value="Notes" />
   </Confirm>
   ```
3. **Inputs:** `title`, `action` (the name of an action **the app has listed**), `args` (what the action needs), `danger` (yes or no: for deleting, paying, anything you can't undo), and `allow` (button text, default "Allow"). Detail parts go inside.
4. **Looks:** a card with the title, the details, and two buttons: **Allow** (`main`, or `danger` when `danger` is set) and **Cancel** (quiet).
5. **The user can:** tap Allow, which sends the `action` effect with `args` to the app, and the app does it. Tap Cancel, which tells the AI "cancelled". After either tap the card **locks** and shows the outcome in place: "Sent ✓", "Cancelled", or "Failed: reason" in `bad`. A second tap can't happen.
6. **While streaming:** the buttons stay disabled until the whole card has arrived, so nobody allows half an action.
7. **Screen reader:** the title, then the details, then "Allow, button".
8. **Use / don't use:** use before **any** action that changes something outside the chat. If the app hasn't listed the action, the card shows "Not available in this app" and has no Allow button.

**Needs:** "app actions" from `ROADMAP.md` phase 1: the app lists its actions, and the SDK passes the tap to the app and the result back to the card.

---

## 5.8 Built 2026-10-23: explaining how things work, and a design pass

**`Flow` / `Node`:** "this happens → then this → then this". Boxes top to bottom, joined by arrows. An arrow can carry a short label (`via`, e.g. "compiles to").
~~`Layers` / `Layer`~~: removed the same day (see 5.10).

The rule: **the AI never draws.** It gives the boxes and the words; the part always lays them out the same way, neatly, on a phone. Limits: `Flow` 2–7 boxes. `Diagram` (boxes that branch and join) was added later the same day (5.11).

Design pass on the existing parts:
- `Row` lays itself out from what is inside: columns (`Stat`, `Field`) share the width and line up at the top; otherwise text takes the free space, so a `Badge` or `Button` after it sits at the end.
- `Steps`: the number sits in a circle, and a line joins the steps.
- `Quiz`: answers are rows with A, B, C; after a pick, the right one turns green ✓, a wrong pick red ✗, and the answer locks.
- `Choice`: the chosen option is a soft accent, not a solid button. `Field` values are regular weight. `Progress` shows its percent. Badges have proper side padding.
- `Card` takes an optional `image` (from the reply's approved images), so a `Carousel` works with or without pictures.
- Two small additions to the basic blocks: text role `count` (a number or letter in a circle) and `divider vertical`.

## 5.9 Built 2026-10-23: the seven planned parts

`Code`, `Reveal`, `Options`, `Form`, `Sources`, `Plan` and `Confirm` are built as described above, with example screens on the web Components page and tests. Differences from the plan:
- `Code` takes the code as a `code` input (`"line 1\nline 2"`), not as text inside the tag: JSX squashes the line breaks of text inside a tag.
- `Form` takes its fields as data (`fields={[{ name, label, kind, required }]}`) and draws the inputs itself, so it can check and lock them.
- `Plan` folds when every step is done or skipped.
- `Confirm`: only parts can ask the app to act (`ui.action`); the AI's own code has no `P.action`. The app's list of actions and the result coming back to the card are not built yet: the card says "Allowed. The app is doing it." and the web page shows a toast.
- Phones: `Code` keeps its lines and scrolls sideways; iOS uses Menlo, Android still the app's font (not tried there yet). Checked on the iPhone 17 simulator, 2026-10-23.

## 5.10 Decided 2026-10-23: Code only inside parts; no Layers

- **`Code` is only for code inside another part** (a `Reveal` answer, an exercise `Card`, a `Confirm` that runs a command). In a normal answer the AI writes code in markdown (```), which the chat already shows well. Two ways to show the same thing would make answers look different each time; markdown can't go inside a screen, so that is the one place `Code` is needed.
- **`Layers` is removed.** It was a list of stacked boxes that a markdown list or `Card` + `Field` already covers, useful for one kind of question, and every part costs prompt tokens and is one more choice to get wrong. `Flow` covers the common "how does X work?". If it is missed, it comes back as a mode of `Flow` (boxes without arrows), not as its own part.

## 5.11 Built 2026-10-23: Diagram

`Diagram` is for answers that branch: the AI gives `nodes` (first to last) and `links` (`from`, `to`, `label`), and the part does all the layout:
- a box sits one level below the lowest box that links to it; up to 3 boxes side by side, the same height;
- arrows with their labels join neighbouring levels ("↓ right", "↓ wrong"); when boxes join into one, each gets its own arrow;
- a link back up (a retry) or one that skips a level becomes a small note on its box ("↩ You log in · try again"), never a line across the picture;
- 2 to 8 boxes; links to unknown boxes are dropped.

`Flow` stays for straight chains (shorter to write); `Diagram` is for splits, joins and loops.

## 5.12 Decided 2026-10-23: Flow and Diagram are one part

`Diagram` and `Node` are gone; `Flow` does both, to save prompt tokens and one choice for the AI:
- `<Flow nodes={[...]} />` without `links`: the boxes join in the order given, and a box's `via` labels the arrow into it. As short as the old `<Node>` children.
- add `links` only when it branches, joins or loops back; the layout rules of 5.11 apply.

## 5.13 Built 2026-10-23: part packs

The optional parts are grouped into **packs** (catalog.json `"packs"`) that an app turns on:

| Pack | Parts | Tokens added to the AI's instructions |
|---|---|---|
| (always on) | everything else | ~3,850 |
| `teach` | Flow, Code, Reveal | +450 |
| `ask` | Options, Form | +370 |
| `act` | Plan, Confirm, Sources | +530 |
| all three (the default) | | ~5,200 |

`buildPrompt(catalog, { packs: ["teach", "ask"] })` leaves the other packs out of the instructions, and `compile(source, { packs })` drops their parts with a clear warning ("<Confirm> is in the "act" pack, which this app hasn't turned on"). So an app without real actions can't show a `Confirm` even if the model writes one. No `packs` = every pack on. The dev server reads `PRISM_PACKS=teach,ask`.

## 6. Build order (POC)

Each part is done when it has: a catalog entry with a `use` line, the library function, one example screen, and it looks right on web and on the iPhone.

| # | Part | Why this order | New blocks or app work |
|---|---|---|---|
| 1 | `Reveal` | smallest; the block already exists | none |
| 2 | `Code` | teaching needs it most | `mono` text, sideways scroll, `copy` effect |
| 3 | `Options` | asking is the core of a helpful chat | none |
| 4 | `Form` | builds on Options and the controls | field errors, focus |
| 5 | `Sources` | trust | `open` effect |
| 6 | `Plan` | agentic, display only | spinner |
| 7 | `Confirm` | agentic, needs app actions | app actions (roadmap phase 1) |

---

## 7. Clipped for now

| From OpenUI | Why not now | Covered by |
|---|---|---|
| 5 card families (Snippet, Overview, Context, Composite, Visual) | too many look-alike choices | `Card`, `Stat`, `Field`, `Carousel` |
| Radar, radial, scatter, stacked charts | rare in a chat | bar, line, pie in `Chart` |
| Tabs, Accordion, SectionBlock | three names for "show some, hide some" | `Choice`, `Reveal` |
| Chips, OptionCards, RadioGroup, CheckBoxGroup, SwitchGroup | four names for "pick" | `Options` |
| TextArea | | `Input lines={4}` |
| EditableTable, ImageGallery, Modal, DatePicker | not needed for the POC | later |
| Icons (IconText, IconButton) | no icon set chosen yet | text and marks |
| Syntax colours in `Code` | needs a colour set that works with every brand | plain code font |

**Later, for teaching:** `Flashcard` (tap to flip), `Term` (tap a word to see its meaning), maths formulas.
**Later, for agents:** a "what I'm doing" activity line (searching, reading 3 pages), and file and attachment cards.
