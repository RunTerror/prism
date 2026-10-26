# Prism roadmap

What to build next, in order, so real apps can use Prism. Decided 2026-10-20:

- **Who it's for:** mobile teams that have (or are adding) an AI assistant in their app: banking, shopping, travel, health, learning. Their assistant answers with a real native screen instead of only text.
- **Open source** (Apache 2.0 planned; Valdi, which we build on, is MIT).
- **Model-agnostic:** works with OpenAI, Claude or Gemini through their normal APIs.
- The learning chat (our demo's Chat tab) is the **showcase**, not the product.

```
 Their backend                                  Their app
 ─────────────                                  ─────────
 their AI (any model)                           Prism SDK (iOS / Android)
   + @prism/server  ──── stream of events ───▶    draws the screen natively
     prompt, compiler,    text / block / done     sandbox, snapshots
     model adapters                               app actions + app data   ◀── the app approves
                                                  their brand colour
```

Legend: ✅ done · 🟡 started · 🔴 not started

---

## Release 0.1 (open preview): the minimum, first

Ship early so people can try it, then add the phases below on top (0.2, 0.3...). "0.x" means early:
things may still change. Minimum = what someone outside needs to run it:

1. **Works with any AI, no API keys in Prism:** Prism is a tool (`show_screen`) or a ```prism block
   that your own server gives to your own model. `poc/core/compiler/tool.js` has the tool in the
   Claude, OpenAI and MCP shapes, and turns each call into an envelope. Decided 2026-10-22: Prism is a
   customisable SDK, not an AI service; a hosted model of our own can come later. ✅
2. **Installable packages:** prepared, not published. `poc/sdk/scripts/package-release.sh` makes the
   iOS zip + SwiftPM manifest and an Android Maven repository; `poc/core` packs for npm. Left: the
   package names, a GitHub repo, and uploading. 🟡
3. **Demo app runs from the repo:** clone, build, run. Replay mode needs no AI; live mode needs a
   model behind the dev server (today the Claude Code CLI). 🟡
4. **README, 15-minute quick start, LICENSE** (Apache 2.0 + Valdi's MIT notice). ✅
5. **Cleanup:** archive, test screenshots and machine paths out of the repo. Left: the old files are
   still in git history, so publish from a fresh history. 🟡
6. **Honest "not done yet" list** in the README. ✅

Next releases: 0.2 = app actions + app data (items 1-2 below) + the app's own parts drawn by its
native views (DESIGN-SYSTEM.md, "Customising", level 4), 0.3 = brand look + versions that stay
compatible (items 4-5), then what users ask for most.

---

## Phase 1: make it useful for a real app (do first)

Without these, Prism is a nice demo but can't do a real job inside someone's app.

**1. App actions** 🔴
Screens can ask the app to do something, and the app decides. Today a screen can only toast, open a link, copy or ask.
Example: the AI writes `<Button onPress={() => P.action("add_to_cart", { id: 42 })}>Add to cart</Button>`; the app gets `onAction("add_to_cart", {id: 42})`, shows its own confirm and adds the item. The app tells the server which actions exist, so the AI only uses real ones.

**2. App data in** 🟡 (`appData` exists for images only)
The app passes its own data; the AI's screen uses it without the data passing through the AI's text.
Example: "Show my last 5 orders" → the app sends the orders; the screen draws `appData.orders` as a list.

**3. Server helpers** 🟡 (the tool and its handler are done, `poc/core/compiler/tool.js`; model calls stay in the app's own server)
An npm package a company adds to its own backend: builds the prompt, calls the model through its API, splits the stream, compiles blocks, sends events.
Example: `prism.stream({ model: openai("gpt-…"), messages })` → the same `text / block_start / block_progress / block / done` events our demo already uses.

**4. Versions that stay compatible** ✅ (2026-10-23, `VERSIONS.md`)
Three numbers (blocks, library, format). The app sends `{ blocks, library }`; the server only sends a library its drawer can draw, and the AI only uses parts that library has. Every screen says which library it needs; an older device shows the plain text instead.
Example: `Flow` arrives in library 1.6.0 → an app on 1.4.0 is never taught `Flow`, so it never breaks.

**5. Brand look** ✅ (`Prism.theme`: accent, corners, fonts; web `brandVars`)
The app sets its accent colour (and later font) once; every screen uses it.
Example: `Prism.start(theme: .init(accent: .orange))`.

**6. Reliability check** 🟡 (`core/eval` + server reply logs exist)
A fixed set of real prompts run on cheap models; track how many screens draw cleanly, and fix the AI habits that fail (like today's fixes: `if` at the top, own components, `<Text>` in `<Text>`).
Example: "95% of 100 prompts draw with no dropped parts" as a number we watch on every change.

## Phase 2: make it shippable

**7. Packages** 🟡 (the builds exist: xcframework, aar)
iOS through Swift Package Manager, Android through Maven Central, server through npm; tagged releases.

**8. Prism Chat** 🟡 (the demo's Chat tab)
The optional ready-made chat screen: message list, streaming text, preview card, follow-up buttons, snapshots. Packaged for iOS, then Android.

**9. Android chat** 🔴
The same Chat tab in the Android demo app (the emulator reaches the dev server at `10.0.2.2`).

**10. Accessibility** 🔴
Screen readers must read and press every part. Known gap: buttons drawn from Valdi views aren't seen as buttons by VoiceOver.

**11. Docs, quick start, Prism Playground** 🔴
"Add Prism to your app in 15 minutes", an API reference, and **Prism Playground**: a website to type a
prompt and see the AI's screen, and to set the theme (colours of cards, buttons and other parts, font,
corners, light and dark) by eye, with real example screens as the preview. It edits the same theme file
the apps use; the result is "copy this file". Limited, safe settings only, each with a readability
check. Needs the web drawer up to date first, so the preview matches the phones.

**12. Open-source launch prep** 🔴
`LICENSE` (Apache 2.0) + Valdi's MIT notice, a README for outsiders, CONTRIBUTING, CI that runs the tests; clean out local-only things (`poc/server/logs`, `poc/_archive`, old screenshots).

## Phase 3: polish (after real users)

**13. Better parts** 🔴 a segmented control (the AI keeps using buttons as tabs), phone-friendly tables, bold words inside text, icons, Liquid Glass on iOS.

**14. Faster first frame** 🔴 the server sends the first screen with the envelope, so even a brand-new screen appears instantly.

**15. Smaller SDK** 🔴 Android: drop unused fonts, split the Compose wrapper. iOS: look at what Valdi can leave out.

**16. More hosts** 🟡 Flutter plugin done (`poc/sdk/flutter`); still to do: the web drawer updated to the new catalog, React Native wrapper.

---

## How we'll know it works

With 3–5 partner apps:
- **It works:** the share of answers whose screen draws without errors (from the server logs).
- **It's useful:** users tap and use the screens, compared with plain-text answers.
