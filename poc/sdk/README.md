# Prism mobile client (Valdi)

The Prism mobile SDK: draws Prism screens with native views on iOS and Android, from one TypeScript
codebase (Valdi). Built from zero in 10 steps (below).

## Use it in an app

**iOS** (SwiftUI or UIKit): add the Swift package at `ios/` (it wraps `dist/ios/PrismSDK.xcframework`).

```swift
import Prism

PrismWidget(envelopeJSON: envelope, instanceId: "msg_1/block_0",
            snapshot: saved,                             // from onSnapshot: comes back instantly
            onEffect: { effect in /* toast, open, copy, ask */ },
            onSnapshot: { snap in /* save it with the message */ })
// UIKit: PrismWidgetView(envelopeJSON:instanceId:snapshot:) - sizes itself to its content.
```

**Android** (Compose or Views): apply `android/prism-include.gradle` in `settings.gradle(.kts)`, then
depend on `project(":prism")` (it wraps `dist/android/prism_sdk.aar`).

```kotlin
PrismWidget(envelopeJson = envelope, instanceId = "msg_1/block_0",
            snapshot = saved, onEffect = { effect -> }, onSnapshot = { snap -> })
// Views: dev.prism.android.PrismWidgetView
```

**Flutter**: add the plugin at `flutter/` (it shows the same native views). Setup in `flutter/README.md`.

```dart
PrismWidget(envelopeJson: envelope, instanceId: 'msg_1/block_0',
            snapshot: saved, onEffect: (effect) {}, onSnapshot: (s) => saved = s)
```

The widget fills the width it's given, sizes its height to its content, follows light/dark, and
runs the AI's code in its own sandbox (a separate JavaScript context).

**Snapshots (lazy lists, reopened chats).** The widget sends `onSnapshot` with everything needed to
bring it back: its state, its last drawn screen and its height. The app decides what to do with it:

| App | Result |
|---|---|
| `VStack` / `Column` | nothing to do: widgets never go away |
| `LazyVStack` / `LazyColumn` / table views, snapshots kept in memory | a widget scrolled back appears instantly, at the right height, as the user left it |
| snapshots saved with the messages | a chat reopened days later shows every screen instantly |
| no snapshots | still works: the widget loads again from the envelope |

A snapshot only applies to the block (envelope) it came from; for any other block it is ignored.

## Build the SDK

```sh
scripts/build-sdk.sh        # -> dist/ios/PrismSDK.xcframework (37 MB), dist/android/prism_sdk.aar (19 MB)
```

About 25 minutes from scratch, a few minutes after small changes. The iOS framework's symbol names are
stripped (`scripts/strip-ios.sh`, run by `build-sdk.sh`): release apps don't need them.

## App size

What the SDK adds to an app, measured on minimal apps built twice: without and with one widget.
Re-measure after changes: `size-check/measure.sh` (iOS), `size-check/android/measure.sh` (Android).

| | iOS (Release, arm64 iPhone) | Android (release APK, arm64, R8 on) |
|---|---|---|
| **Download** | **+5.0 MB** (zipped app) | **+6.9 MB** (APK) |
| **Installed** | **+11.7 MB** | **+17.8 MB** (APK + the native library unpacked on install) |

iOS before stripping symbol names: +16.8 MB installed, +5.7 MB download.

**The JavaScript engine is not the size.** The exported SDK uses Apple's built-in **JavaScriptCore** on
iOS (nothing shipped: the iOS framework is byte-for-byte the same whatever `--valdi_js_engine` says) and
a bundled **QuickJS** on Android (small). The `hermes` setting in `.bazelrc` only affects Valdi app
builds, and we export a library, not an app. So switching engines is not a way to save size.

Where the size goes:

| Part | iOS | Android (download / installed) |
|---|---|---|
| Valdi runtime + native layout and drawing (+ QuickJS on Android) | ~11 MB | 4.8 MB / 10.9 MB |
| Java/Kotlin code (Valdi + wrapper) | – | 0.9 MB / 2.5 MB |
| Fonts Valdi bundles that we don't use (Montserrat, Roboto Mono) | – | ~0.5 MB / ~1.1 MB |
| Our Prism code (`prism_*.valdimodule`) | ~100 KB | ~100 KB |

Paid once per app, however many widgets it shows; new parts and screens add kilobytes, not megabytes.

Notes and next savings:
- `dist/ios/PrismSDK.xcframework` (37 MB) is bigger than what apps get: two-thirds of it is the
  simulator slice, which never ships.
- Android: the unused Valdi fonts could likely be excluded (~0.5 MB download).
- Android: the wrapper forces Jetpack Compose on apps that only use Views (its Compose API pulls it
  in). Split it into a core library + a Compose add-on.
- Android's native library is already stripped by its build.

## Layout

```
ios/                       Swift package `Prism`: PrismWidget (SwiftUI), PrismWidgetView (UIKit)
android/                   Kotlin library `:prism`: PrismWidget (Compose), PrismWidgetView (Views)
flutter/                   Flutter plugin `prism_flutter`: PrismWidget (Dart) showing the native view above
dist/                      the built SDK (from scripts/build-sdk.sh)
size-check/                measures what the SDK adds to an app (measure.sh for iOS, android/measure.sh)
demos/ios, demos/android   THE demo app (one per platform): a normal native app on the exported SDK,
                           like a customer's. iOS: gallery and Chat tabs + UI tests
demos/flutter              Flutter demo app on prism_flutter (gallery + lazy feed)
uitests-android/           test_host.py: real taps on the Android demo app (adb + uiautomator)
```

```
MODULE.bazel, .bazelrc     workspace settings (Valdi version, build flags)
BUILD.bazel                what to build: the SDK library (prism_sdk)
modules/
  prism_core/              the shared runtime + typed API (prismLoad / prismEvent / prismUnload)
  prism_theme/             design tokens (colours light + dark, spacing, type) + helpers
  prism_renderer/          draws the screen tree with Valdi views, one case per part
  prism_widgets/           controls: Button, Checkbox (written once); Input (Valdi textfield);
                           Slider, Switch, Select (native UIKit, ios/)
  prism_sandbox/           runs the runtime + AI code in a Valdi Worker (own JS context), async messages
  prism_sdk/               PrismWidget: loads an envelope, keeps the tree, sends taps back
scripts/build-sdk.sh       build the SDK into dist/ (all platforms, or just ios / android)
scripts/embed-core.sh      copy the runtime and tokens from poc/core in (build-sdk.sh runs it)
```

## Run and test

There is one demo app per platform, a normal native app on the exported SDK. To try a change to the
SDK, rebuild it (one platform is enough), then run the demo:

```sh
scripts/build-sdk.sh release ios      # or: android, or nothing for both (about 4-5 min per platform)

cd demos/ios && xcodegen generate && xcodebuild test -project PrismHostDemo.xcodeproj -scheme PrismHostDemo \
  -destination 'platform=iOS Simulator,name=iPhone 17'
cd demos/android && ./gradlew :app:installDebug && python3 ../../uitests-android/test_host.py
```

The iOS demo's Chat tab needs the dev server (`node server/server.mjs` in `poc/`); its tests skip
themselves when the server is off. JS errors show in the iPhone log under `com.snap.valdi`:

```sh
xcrun simctl spawn booted log show --last 1m --predicate 'process == "PrismHostDemo"' | grep -A8 com.snap.valdi
```


## Module names

| Module | Job |
|---|---|
| `prism_core` | The shared runtime: load an envelope, send events, get the screen tree |
| `prism_sandbox` | Runs the AI's code in its own locked JS context |
| `prism_renderer` | Turns each basic block of the tree into Valdi views (charts in `PrismChart.tsx`) |
| `prism_widgets` | The platform's own controls (UISwitch, MaterialSwitch…) |
| `prism_theme` | Design tokens, generated from `core/dist/tokens.json`, plus the app's brand |
| `prism_icon_assets` | Icons (later: which icon set is still open) |
| `prism_text` | Formatted text and math (later) |

Plus `prism_sdk` (the public entry point host apps use).

## Valdi lessons so far

- A component's root must be `<view>` or `<layout>` (not `<scroll>`), or the screen stays black.
- On a label, `lineHeightAbsolute` (points) makes Valdi measure the text too short and cut the last line.
  Use `lineHeight` (a multiplier); `prism_theme` turns our point tokens into the right multiplier.
- `flexShrink` in a column squeezes height (text gets cut to one line). Only shrink sideways, inside a Row.
- Valdi's accessibility props (`accessibilityCategory`, `accessibilityNavigation`) did not reach iOS in our
  test: buttons drawn from Valdi views show up as plain containers. Native controls (UISlider, UISwitch,
  UIButton) are real accessibility elements for free. **Follow-up:** check with VoiceOver on / Accessibility Inspector.
  Until then, UI tests tap a button's visible text.
- Installing a new build over the old app can keep running the old Valdi modules: uninstall first.
- `valdi_module(name = "x")` creates hidden targets like `x_ios`: don't give your own native library
  that name (we use `x_uikit`).
- Valdi disposes JS callbacks given to native code when the component that created them goes away.
  Shared things (the sandbox worker) must be created inside `withGlobalNativeRefs(...)`.
- iOS 27 apps must use scenes. A Valdi-built app needs a small scene delegate (the archived Valdi demo
  has one); our demo apps are normal SwiftUI apps, so they have scenes already.

## Later (scoped out for now)

- **Icons.** `<Icon>` draws nothing for now, and Callouts have no tone icon. Which icon set to use on
  iOS and Android (SF Symbols / Material Symbols / one bundled set for both) is still open.
  When decided, it becomes the `prism_icon_assets` module.

- **Liquid Glass in the renderer.** iOS 26+ draws glass only on its own controls. The native `UIButton`
  can do it (`glass` / `glassProminent` in `PRSNativeButton`, shown on the archived Valdi demo's Buttons page), but the
  renderer's Button is written once from Valdi views, so AI screens don't get glass yet. Decide when the
  SDK is integrated into a native iOS app: keep ours everywhere, or use the native glass button on iOS.

## Steps

| Step | What | Status |
|---|---|---|
| 0 | Setup: archive the old SDK, fresh workspace (`valdi bootstrap`), check tools, module names, this plan | Done |
| 1 | "Hello" app on the iPhone (+ the iOS 27 scene fix) | Done |
| 2 | `prism_core`: load the shared runtime, run one example | Done |
| 3 | `prism_theme`: tokens generated from `tokens.json` | Done |
| 4 | `prism_renderer`: Stack, Row, Card, Title, Text, Divider, Spacer | Done |
| 5 | `prism_widgets` (Button) + `prism_sdk` (PrismWidget): taps change state and redraw | Done |
| 6 | Grid, Badge, Callout, Stat, Progress, Table + native Slider and Switch | Done |
| 7 | Checkbox (written once), Input (Valdi `<textfield>`), Select (native UIMenu): every catalog part drawn | Done |
| 8 | `prism_sandbox`: AI code runs in a Valdi Worker (own JS context and thread); UI test checks isolation | Done |
| 9 | Android: same TypeScript, Material Slider/Switch/menu in Kotlin; tap tests in `uitests-android/` | Done |
| 10 | `prism_sdk` exported (xcframework + aar), Swift/Kotlin wrappers, native host apps tested on both | Done |
| 11 | `Chart` (views + `<shape>` paths, same code on both) and `Image` (only addresses from `envelope.appData`); examples Charts and Product | Done; in the exported SDK (`dist/`). Not yet in the demo apps' UI tests |
| 12 | One demo app per platform: the native app on the exported SDK. The Valdi-workspace demo is archived; `build-sdk.sh` can build one platform | Done |
| 13 | Flutter plugin `prism_flutter` (platform views over the Swift/Kotlin wrappers) + Flutter demo app | Done; checked on iOS simulator and Android emulator |
