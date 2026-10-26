# Versions

Three numbers keep old apps working while the parts on the server get newer. Each has one job.

```
  App (SDK)                               Server                                  AI
  ─────────                               ──────                                  ──
  blocks 2         ── GET /library?blocks=2 ──▶  library 1.6.0 needs blocks 2:
  library 1.4.0                                  ✓ sends it (an app with blocks 1 gets nothing)
  (built in)
                   ── POST /chat  app: { blocks: 2, library: "1.4.0" } ──▶
                                                 this app will draw with 1.6.0
                                                 ── teaches only parts in 1.6.0 ──▶  writes a screen
                   ◀── envelope  needs: { library: "1.6.0" } ──  compiler drops parts newer than 1.6.0
  library ≥ 1.6.0? draw it
  older?           show the plain-text backup instead
```

| Number | Says | Lives in | Goes up when | Now |
|---|---|---|---|---|
| **Blocks** | which basic blocks the drawer can draw | the SDK (`PrismVersions.blocks`) and `catalog.json` `"blocksVersion"` | a block, or a block input, is added | `2` |
| **Library** | which parts exist and how they look | `prism-library.js` `version` (server, plus a copy in the SDK) | a part is added or redesigned | `1.6.0` |
| **Format** | the shape of a message (envelope) | `v` in every envelope | the message shape changes | `1` |

`core/dist/versions.json` has all three after `npm run build`; the SDK build turns it into `PrismVersions` for Swift, Kotlin and Dart.

---

## The rules

**1. A library says which blocks it needs, and only loads on a drawer that has them.**
Library 1.6.0 says `blocks: 2` (it uses the number circle and the vertical line). On an app whose drawer is blocks 1, it doesn't load, and the copy inside that app's SDK stays.
Example: `GET /library?blocks=1` → `{ "version": null, "needsBlocks": 2 }`; `GET /library?blocks=2` → library 1.6.0.

**2. An app tells the server what it draws, with every chat request.**
```swift
body["app"] = PrismVersions.app   // ["blocks": 2, "library": "1.6.0"]
```
The server works out the library the app will draw with: the server's own if the app's drawer can draw it, else the app's built-in one (`libraryFor` in `core/compiler/versions.js`).
Example: `{ blocks: 2, library: "1.4.0" }` → 1.6.0. `{ blocks: 1, library: "1.4.0" }` → 1.4.0.

**3. The AI only learns, and the compiler only keeps, parts that library has.**
Each part newer than the first library says when it came: `"since": "1.6.0"` in `catalog.json`.
```js
buildPrompt(catalog, { library: "1.4.0" })   // no Flow, Code, Options, Form, Plan, Confirm, Sources
compile(source, { library: "1.4.0" })         // a <Flow> is dropped: "needs part library 1.6.0, but this app has 1.4.0"
```

**4. Every screen says which library it needs; an older device shows the plain text instead.**
The compiler writes `needs: { library }` into the envelope: the newest `since` of the parts it uses. A device with an older library shows the envelope's `fallback` text, never a half-drawn screen.
Example: a screen with only `Card` and `Text` needs 1.0.0 and draws everywhere; one with `Flow` needs 1.6.0.

---

## When you change something

| You… | Then |
|---|---|
| add a block, or a block input (like `divider vertical`) | blocks +1 in `catalog.json` `"blocksVersion"`; the library that uses it sets `blocks` to the new number; draw it in every drawer (web, Valdi) |
| add a part | library minor +1 (`1.6.0` → `1.7.0`); give the part `"since": "1.7.0"` in `catalog.json` |
| redesign a part, same inputs | library minor +1; no `since` change (old screens still draw) |
| fix a bug in a part | library patch +1 (`1.6.0` → `1.6.1`) |
| change the envelope's shape in a way old SDKs can't read | format +1; avoid it: add optional fields instead (like `needs`) |

The build stops if the library needs more blocks than the catalog has.

Missing numbers are treated as the oldest: no `?blocks=` means blocks 1, no `needs` means any library, no `app` in a chat request means "up to date" (the dev server's choice; a real server should ask its apps to send it).
