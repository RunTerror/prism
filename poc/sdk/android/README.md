# Prism for Android (Compose + Views)

Kotlin library `:prism` (package `dev.prism.android`) that wraps the Valdi drawer
`poc/sdk/dist/android/prism_sdk.aar` for Jetpack Compose and classic Views.

## Quick start: Compose

```kotlin
// build.gradle.kts: implementation(project(":prism"))   (see "Use from another build")
PrismWidget(
    envelopeJson = envelope, instanceId = "chat-42#1",
    snapshot = saved[id], onSnapshot = { saved[id] = it },   // comes back instantly in a LazyColumn
    onEffect = { if (it is PrismEffect.Toast) Toast.makeText(ctx, it.text, LENGTH_SHORT).show() },
)  // full width, content height, follows isSystemInDarkTheme()
```

## Quick start: Views

```xml
<dev.prism.android.PrismWidgetView android:id="@+id/widget"
    android:layout_width="match_parent" android:layout_height="wrap_content" />
```
```kotlin
val w = findViewById<PrismWidgetView>(R.id.widget)
w.onEffect = { effect -> /* toast / open / copy / ask */ }
w.onSnapshot = { snap -> saved = snap }          // store snap.json to keep it across launches
w.setEnvelope(envelopeJson, instanceId = "chat-42#1", snapshot = saved)
```

`Prism.library = code` loads a newer part library from your server (the `code` from `GET /library`).
The SDK carries a copy; a newer one is used instead, so new parts and design fixes show without an app update.

Optional: call `Prism.start(context)` in `Application.onCreate()` to load the native library
and the JS runtime up front (otherwise the first widget does it).

## Public API

```kotlin
object Prism { fun start(context: Context) }

sealed class PrismEffect {
    data class Toast(val text: String); data class Open(val url: String)
    data class Copy(val text: String);  data class Ask(val text: String)
    data class Other(val type: String, val value: String)
}

class PrismWidgetView(context: Context, attrs: AttributeSet? = null) : FrameLayout {
    fun setEnvelope(envelopeJson: String, instanceId: String, snapshot: PrismSnapshot? = null)
    var onEffect: ((PrismEffect) -> Unit)?
    var onSnapshot: ((PrismSnapshot) -> Unit)?
    var onHeightChange: ((Int /* px */) -> Unit)?
    fun destroy()   // optional: frees the widget now (it is also done automatically)
}

@Composable fun PrismWidget(envelopeJson: String, instanceId: String, modifier: Modifier = Modifier,
    snapshot: PrismSnapshot? = null, onEffect: (PrismEffect) -> Unit = {}, onSnapshot: (PrismSnapshot) -> Unit = {})

class PrismSnapshot {   // state + last screen + height; store `json`, read back with from()
    val json: String; val heightDp: Double
    companion object { fun from(json: String): PrismSnapshot? }
}
```

Behaviour:
- `setEnvelope` with the same envelope + id does nothing; a new envelope or id reloads.
  `snapshot` is read only when the widget loads: its saved screen is drawn on the first frame at
  its saved height, and the widget carries on from its saved state. Keep the last `onSnapshot`
  per block in a LazyColumn / RecyclerView and scrolled-back widgets appear instantly.
- Height: `wrap_content` (or Compose with no height) = the widget's content height; it
  re-measures when the content grows or shrinks. A fixed/`match_parent` height is respected.
- Dark mode: the view reads `Configuration.uiMode` and updates on configuration changes
  (also when the activity handles `uiMode` itself — the widget redraws and keeps its state).
  The Compose function passes `isSystemInDarkTheme()`. Valdi 0.2.0 does not detect it itself.
- Callbacks always run on the main thread.
- Lifetime: the Valdi view is destroyed when the view leaves for good (removed from its
  parent, or its `ViewTreeLifecycleOwner` is destroyed); in Compose when it leaves the
  composition. If the view is attached again it is rebuilt with the last state.
- The widget has a transparent background and no padding: the host draws the page
  (`background` token, 16dp padding — see `poc/core/CLIENTS.md`).

## How the aar is consumed

AGP refuses `implementation(files("prism_sdk.aar"))` inside a library that itself builds an aar.
So there are two projects:

- `:prism-valdi` (`valdi-aar/build.gradle.kts`): no plugins, just a `default` configuration
  whose artifact is `../../dist/android/prism_sdk.aar`. Gradle resolves a project dependency
  on it through that configuration and AGP treats the file like any other aar.
  Nothing is copied; rebuild the aar with `poc/sdk/scripts/build-sdk.sh`.
- `:prism` depends on it with `api(project(":prism-valdi"))`, and adds what the aar needs but
  does not bundle: appcompat 1.7.1, dynamicanimation 1.1.0, lifecycle-process 2.9.4, and
  Material Components 1.12.0 (`com.google.android.material:material`) — the widget's controls
  are the real Material 3 controls (MaterialButton, MaterialCheckBox, MaterialSwitch, outlined
  TextInputLayout, Slider, LinearProgressIndicator). Any app theme works: each control wraps
  its own context in `Theme.Material3.Light/Dark.NoActionBar`, picked from the widget's colour scheme.

The app must still extract native libs on install:

```kotlin
android { packaging { jniLibs { useLegacyPackaging = true } } }
```

## Use from another build (demo app, Flutter plugin, React Native module)

In that build's `settings.gradle(.kts)` apply the include script; it adds both projects with
the right paths:

```kotlin
apply(from = "<path>/poc/sdk/android/prism-include.gradle")     // settings.gradle.kts
// apply from: '<path>/poc/sdk/android/prism-include.gradle'     // settings.gradle (Groovy)
```

It is the same as:

```kotlin
include(":prism");       project(":prism").projectDir       = file("<path>/poc/sdk/android/prism")
include(":prism-valdi"); project(":prism-valdi").projectDir = file("<path>/poc/sdk/android/valdi-aar")
```

Then `implementation(project(":prism"))`. Requirements on the including build: the
`com.android.library` plugin (tested with AGP 9.4.1, which has Kotlin built in) and
`org.jetbrains.kotlin.plugin.compose` (2.4.21) must be on its plugin classpath (declare them
`apply false` in the root `build.gradle(.kts)`), repositories `google()` + `mavenCentral()`.
With AGP 8 you would also need `org.jetbrains.kotlin.android` applied to `:prism` (not tested).
The project names `:prism` and `:prism-valdi` are fixed (`:prism` refers to `:prism-valdi`).

## Build

```sh
cd poc/sdk/android && ./gradlew :prism:assembleDebug          # library only
cd poc/sdk/demos/android && ./gradlew :app:installDebug       # demo app (dev.prism.hostdemo)
```

Needs JDK 17: point `JAVA_HOME` at it. `local.properties` (not in git) has `sdk.dir`, the Android SDK path.
Demo: `poc/sdk/demos/android` — Compose gallery of the examples, and a Views screen with two
`PrismWidgetView`s in a `ScrollView`. Screenshots in `poc/sdk/demos/android/screenshots/`.
