<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/prism-logo-dark.svg">
    <img src="brand/prism-logo-light.svg" alt="Prism" width="360">
  </picture>
</h1>

**Prism lets the AI in your app answer with small working screens, not just text, and they look like the rest of your app on iPhone, Android and the web.**

Someone asks your app's assistant: *"Split a ₹2,400 dinner between 3 people, I'll tip 10%."* Instead of a paragraph of maths, the answer contains a little calculator with sliders they can move. On an iPhone it's built from real iPhone controls, on Android from real Android controls, on the web from normal web page elements. It uses your app's colours, follows light and dark mode, and respects the phone's text size.

**See every part live:** [the design library](https://runterror.github.io/prism/#/components). Change the colour, the corners, and light or dark, and every part follows.

> **Status: 0.1, an early preview.** It works from end to end, but things may still change. Read [Not done yet](#not-done-yet) before you build on it.

| iPhone: an answer arrives, then its screen is used | Android: the chat parts, made of real Android controls |
|---|---|
| <img src="docs/media/ios-chat.gif" width="300" alt="iPhone chat: a saved answer appears word by word, a tip calculator shows up and its slider is moved, then a plan comparison arrives"> | <img src="docs/media/android-parts.gif" width="300" alt="Android: numbered steps, a quiz answered correctly, a plan picker switching price, and plan cards swiped"> |

## How it works

```
 Your server                                Prism                                  Your app
 ───────────                                ─────                                  ────────
 Your AI (Claude, GPT, Gemini, …)
 decides to show a screen and
 writes a few lines of code   ───────────▶  checks the code, fixes small
                                            mistakes, refuses anything unsafe,
                                            packs it into one JSON message ────▶  Prism's SDK runs it in a safe,
                                                                                  closed box and draws it with
                                                                                  the platform's own controls
```

1. **You give your AI one extra tool**, called `show_screen`, plus a page of instructions that teach it the parts it can use.
2. **When a screen would help, the AI calls that tool.** It writes a short piece of code, like the example below.
3. **Prism checks that code on your server.** It fixes small slips, refuses anything unsafe, and returns one small JSON message for the app (in the code it's called an *envelope*).
4. **Your app shows it.** Prism's SDK, a library you add to your app, runs the code in a closed box and draws the screen with the platform's own controls.

Three things worth knowing:
- **Prism never talks to an AI itself and needs no API key.** You keep using your own AI and account; Prism is a tool you hand to it.
- **The AI says what things *mean*, never how they look.** It writes "a main button" or "a good result", not "blue" or "16 pixels". Your app's colours, fonts and corner style decide the look.
- **The AI's code can't do harm.** It runs closed off: no internet, no access to the phone, endless loops get stopped, and if one part breaks, only that part disappears.

This is what the AI writes (it looks like React, a common way to describe screens on the web):

```jsx
const [bill, setBill] = useState(2400)
const [people, setPeople] = useState(3)
const each = Math.round(bill * 1.1 / people)

<Card title="Split the bill">
  <Slider label="Bill (₹)" value={bill} min={100} max={10000} step={100} onChange={setBill} />
  <Slider label="People" value={people} min={1} max={10} onChange={setPeople} />
  <Stat label="Each person pays" value={"₹" + each} />
</Card>
```

The first three lines are the screen's data. The part in `< >` is the screen: a card with two sliders and the result. When someone moves a slider, the number updates straight away, on the phone, without asking the AI again.

## Install

Version 0.1.0.

| For | How |
|---|---|
| Your server (Node 18 or newer) | `npm install prism-genui` |
| iPhone app (Swift Package Manager) | `.package(url: "https://github.com/RunTerror/prism", from: "0.1.0")`, product `Prism` |
| Android app (Gradle) | `implementation("io.github.runterror:prism-android:0.1.0")` (from Maven Central) |

## Quick start

### 1. Try it on your computer (2 minutes, no AI needed)

Needs Node 18 or newer.

```sh
cd core
npm install
npm test            # runs the 90 tests
npm run build       # makes the files apps and servers use (in core/dist)
```

Then open the design library, every part live, in your browser:

```sh
cd ../web && npm install && npm run dev
```

### 2. Connect your AI (on your server)

Add Prism's instructions and its tool to your AI request, then hand each `show_screen` call to Prism. With Anthropic's library:

```js
import Anthropic from "@anthropic-ai/sdk";
import { prismTool, toolPrompt, handleToolCall } from "prism-genui/tool";

const client = new Anthropic();
const reply = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 4000,
  system: "You are a helpful assistant.\n\n" + toolPrompt(),   // your instructions + Prism's
  tools: [prismTool("anthropic")],                             // the show_screen tool
  messages,
});

for (const block of reply.content) {
  if (block.type !== "tool_use" || block.name !== "show_screen") continue;
  const { envelope, result } = handleToolCall(block.input, { id: block.id });
  if (envelope?.ok) sendToApp(envelope);   // send it to the app however you already send messages
  // Give `result` back to the AI: it says "Shown to the user." or what to fix.
}
```

- **OpenAI and similar:** use `prismTool("openai")`, and pass `tool_call.function.arguments` to `handleToolCall` as it is.
- **MCP** (a common way to plug tools into AI apps): use `prismTool("mcp")`. `core/scripts/mcp-server.mjs` is a small working example.
- **Show the screen while the AI is still writing it:** `partialToolCode()` and `partialEnvelope()` (in `prism-genui/partial`) turn the unfinished code into a screen that already works and fills in as the AI writes.
- **Your AI can't use tools?** Put `dist/prompt.md` in its instructions instead. It then writes the screen inside its normal answer, in a ```` ```prism ```` block, and `compileMessage(answer)` separates the text from the screens.
- **Only teach the parts you need:** `buildPrompt(catalog, { packs: ["teach", "ask"] })` keeps the instructions shorter (see the parts list below).

### 3. Show it in your app

**iPhone** (SwiftUI; `PrismWidgetView` if you use UIKit):

```swift
import Prism

PrismWidget(envelopeJSON: envelope, instanceId: "msg_1/block_0",
            onEffect: { effect in /* show a message, open a link, copy text, or ask the AI */ })
```

**Android** (Jetpack Compose; `PrismWidgetView` if you use Views):

```kotlin
PrismWidget(envelopeJson = envelope, instanceId = "msg_1/block_0",
            onEffect = { effect -> /* show a message, open a link, copy text, or ask the AI */ })
```

**Web:** the React version is in `web`.

- **Size:** the screen takes the full width it's given and grows to the height it needs.
- **Remembering changes:** if someone moves a slider and scrolls away, or reopens the chat later, the screen can come back exactly as they left it. Save the `onSnapshot` value and pass it back as `snapshot`. Details in [`sdk/README.md`](sdk/README.md).
- **Your look:** set `Prism.theme` once with your main colour, corner style (rounded, square or pill) and fonts. Every screen follows it.

### 4. Run the demo apps

The iPhone and Android demo apps show every example screen and a chat. The chat has two modes:

- **Replay** plays real AI answers saved earlier. No AI or account needed.
- **Claude** sends your message to a live AI. Right now this goes through the Claude Code app on the developer's own Mac (`node server/server.mjs`), so it only works where Claude Code is installed and signed in.

Building the phone SDK yourself takes about 25 minutes the first time and needs extra tools (Valdi, the framework it's built on). See [`sdk/README.md`](sdk/README.md), or use the ready-made packages from Install.

## What the AI can use

32 parts, chosen for answers in a chat. Parts in the last three rows come in optional **packs**: turn on only the ones your app needs.

| Group | Parts | For |
|---|---|---|
| Chat | `Steps` `Step` `Choice` `Field` `Quiz` `FollowUps` `Compare` `Carousel` | steps, quick picks, facts, quizzes, next questions, comparing options |
| Layout | `Stack` `Row` `Card` `Divider` | arranging parts |
| Content | `Title` `Text` `Badge` `Callout` `Stat` `Progress` `Chart` | words, numbers, notes and charts |
| Controls | `Button` `Switch` `Input` `Slider` `Select` | the platform's own buttons, switches, text fields, sliders and menus |
| `teach` pack | `Flow` `Code` `Reveal` | "how does it work" diagrams, code to copy, hidden hints and answers |
| `ask` pack | `Options` `Form` | asking the user to pick, or to fill in a few fields |
| `act` pack | `Plan` `Confirm` `Sources` | an AI that does tasks: its plan, "Allow or Cancel?" before acting, and where facts came from |

Every part with every setting is listed in [`core/catalog.json`](core/catalog.json), and you can try them all in the [design library](https://runterror.github.io/prism/#/components). Why the list is kept short: [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

**How well AI uses it:** we gave Claude Haiku 30 test requests (`core/eval`), from calculators to "book a table" and "delete my old backups", twice. All 60 answers worked without any fixes. Other AI models haven't been measured yet.

## Not done yet

An honest list of what's missing or rough in 0.1:

**Installing**
- **Building the phone SDK yourself is slow:** about 25 minutes, plus extra tools.
- **The demo chat's live mode needs Claude Code** on the developer's computer. Your own app uses the tool call above instead.

**What screens can do**
- **Screens can ask the app for only a few things:** show a message, open a link, copy text, send a chat message, or run an action after the user taps "Allow". The app can't yet tell the AI which actions it offers, and the result doesn't come back to the screen.
- **Screens can't read the app's own data** (like a user's orders), apart from pictures your server approves.
- **No timers or internet calls inside screens**, on purpose, for safety. A countdown timer isn't possible yet.
- **No icons yet.** They'll come with a chosen icon set.
- **Apps can't add their own custom parts yet.**

**Quality**
- **Accessibility:** text follows the phone's text size, but screen readers aren't fully tested yet. Some buttons aren't announced as buttons on iPhone.
- **Only measured with Claude Haiku.** Other AI models should work through the tool, but how well is unknown.
- **Version check is new.** An older app is only sent parts it knows how to draw (see [`VERSIONS.md`](VERSIONS.md)). So far it's been tried with the demo apps only.

**Platforms and size**
- **Works on:** iPhone with iOS 15+, Android 7+, and the web (React). Flutter has an early plugin. React Native isn't started.
- **Adds to your app's size:** about 5 MB on iPhone and 7 MB on Android.

**Demo apps**
- **The Android demo has no chat tab yet** (the iPhone one does), and its screens are checked by hand, not by automatic tests.

The plan is in [`ROADMAP.md`](ROADMAP.md).

## What's in this repository

| Folder | What it is |
|---|---|
| `core` | The heart of Prism: the list of parts, the code checker, the code that runs screens, the parts' design, helpers for servers, tests |
| `sdk` | The phone SDK: iPhone and Android packages, the Flutter plugin, the demo apps |
| `web` | The web version and the design library |
| `electron` | The web app as a desktop app |
| `server` | A small chat server for trying the demo apps |
| `brand` | The Prism logo, app icon and colours |
| `ios`, `android`, `flutter`, `expo` | Early sample apps (the main demo apps are in `sdk/demos`) |
| `ARCHITECTURE.md`, `FORMAT.md`, `DESIGN-SYSTEM.md`, `PARTS.md`, `VERSIONS.md` | How it's built, the message format, the design rules, the parts, and how versions stay compatible |

## License

Apache 2.0, see [LICENSE](LICENSE). The phone packages include [Valdi](https://github.com/Snapchat/Valdi) by Snap Inc. (MIT licence), see [NOTICE](NOTICE).
