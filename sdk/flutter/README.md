# prism_flutter

Prism for Flutter. Shows Prism screens inside a Flutter app.

Flutter does not draw the screen. Each `PrismWidget` is the **same native view** the Swift and
Kotlin wrappers give native apps (drawn by Valdi), placed inside the Flutter tree as a
"platform view". So Flutter apps get the same native look as native apps.

```
Flutter app
  PrismWidget (Dart)          lib/src/prism_widget.dart
     │  platform view "dev.prism/widget" + one channel per widget
     ▼
  iOS:     PrismWidgetView (UIKit)        from ../ios (Swift package Prism)
  Android: PrismWidgetView (Android View) from ../android (:prism)
     ▼
  Valdi drawer (dist/ios/PrismSDK.xcframework, dist/android/prism_sdk.aar)
```

## Use it

```dart
import 'package:prism_flutter/prism_flutter.dart';

PrismWidget(
  envelopeJson: envelope,          // the envelope from the server, as a JSON string
  instanceId: 'msg_1/block_0',     // unique per widget on screen
  snapshot: saved,                 // optional: from onSnapshot, brings it back instantly
  onEffect: (effect) => switch (effect) {
    PrismToast(:final text) => showMessage(text),
    PrismOpen(:final url) => openUrl(url),
    PrismCopy(:final text) => copy(text),
    PrismAsk(:final text) => sendToChat(text),
    PrismOtherEffect() => null,
  },
  onSnapshot: (s) => saved = s,    // save it with the message
)
```

- Fills the width it gets; its height follows the content (no `SizedBox` needed).
- Light/dark follows the app's `Theme` (or pass `brightness:`).
- Works in `ListView`: up/down drags scroll the list; taps and sideways drags (sliders) go to the widget.
- `Prism.start()` in `main` is optional: it starts the native side early.

## Add it to an app

Build the SDK first (`../scripts/build-sdk.sh`), then:

1. **pubspec.yaml**
   ```yaml
   dependencies:
     prism_flutter:
       path: <path to>/sdk/flutter
   ```
2. **android/settings.gradle.kts**: add the Compose plugin and the Prism Android wrapper
   ```kotlin
   plugins {
       // ... Flutter's plugins ...
       id("org.jetbrains.kotlin.plugin.compose") version "<your Kotlin version>" apply false
   }
   apply(from = "<path to>/sdk/android/prism-include.gradle")
   ```
3. **android/app/build.gradle.kts**: minSdk 24 or more, and
   ```kotlin
   packaging { jniLibs { useLegacyPackaging = true } }   // Valdi loads libprism_sdk.so itself
   ```
4. **iOS**: nothing. iOS 15 or more. Uses Swift Package Manager (Flutter's default); the plugin finds
   the Prism Swift package by path. CocoaPods is not supported.

The demo app `../demos/flutter` is set up this way.

## How it works (for people changing it)

| Dart (`lib/src`) | iOS (`ios/prism_flutter`) | Android (`android/src`) |
|---|---|---|
| `PrismWidget` makes a platform view with the envelope, id, snapshot, light/dark | `PrismPlatformView` makes a `PrismWidgetView` | `PrismPlatformView` makes a `PrismWidgetView` |
| listens on `dev.prism/widget_<id>`: `height`, `effect`, `snapshot` | sends them from the view's callbacks | same (height turned from px into dp) |
| sends `setEnvelope`, `setColorScheme` when the widget changes | updates the view | updates the view |

Two details:
- Flutter gives a platform view an exact size, starting near 0. On Android the Prism view must
  measure its own content, so it sits in a container that lets it take its natural height (and
  clips it). iOS's `PrismWidgetView` already does this inside itself.
- Android uses hybrid composition (`initExpensiveAndroidView`): the real view is in the window, so
  text fields and the keyboard work like in a native app.

## Test

```sh
flutter test           # Dart: effects and snapshots
```

Real-device checks are done with the demo app (see `../demos/flutter/README.md`).

## Not done yet

- Not tried: lots of widgets in one long list (scroll speed), keyboard covering a field low on the screen.
- iOS taps were not checked by a test (no tap tool here); Android taps, typing, effects and dark mode were.
- Accessibility: same gaps as the native SDK.
- Not published on pub.dev; used by path.
