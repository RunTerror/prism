# Prism for iOS (Swift package)

Draws a Prism widget (an "envelope" JSON from the Prism server) with native views, in SwiftUI
or UIKit. Wraps `../dist/ios/PrismSDK.xcframework` (build it first with
`sdk/scripts/build-sdk.sh`); no Valdi types leak out. iOS 15+.

After rebuilding the SDK, Xcode may keep using its old copy. Delete `PrismSDK.framework` and the
app from your build products folder (or Product → Clean Build Folder) before building the app.

Add it as a local package (`.package(path: "sdk/ios")`, product `Prism`). Optionally call
`Prism.start()` at launch to warm up the runtime (the views do it themselves).

`Prism.library = code` loads a newer part library from your server (the `code` from `GET /library`).
The SDK carries a copy; a newer one is used instead, so new parts and design fixes show without an app update.

## SwiftUI

```swift
import Prism

PrismWidget(envelopeJSON: json, instanceId: "tasks#1",
            snapshot: saved[id],                       // from onSnapshot, or nil
            onEffect: { effect in handle(effect) },     // .toast / .open / .copy / .ask / .other
            onSnapshot: { saved[id] = $0 })             // sizes itself; follows light/dark
```

## UIKit

```swift
import Prism

let widget = PrismWidgetView(envelopeJSON: json, instanceId: "tasks#1")
widget.onEffect = { effect in handle(effect) }
widget.onSnapshot = { saved[id] = $0 }       // pass it back to init(...snapshot:) later
stackView.addArrangedSubview(widget)   // height comes from intrinsicContentSize
```

## API

```swift
public enum Prism { public static func start() }
public enum PrismEffect { case toast(String), open(URL), copy(String), ask(String), other(type: String, value: String) }

public final class PrismWidgetView: UIView {
    public init(envelopeJSON: String, instanceId: String, snapshot: PrismSnapshot? = nil)
    public var envelopeJSON: String              // change -> reload
    public var instanceId: String                // change -> reload (unique per widget on screen)
    public var snapshot: PrismSnapshot?          // read when the widget (re)loads
    public var colorScheme: UIUserInterfaceStyle? // nil = follow the trait collection
    public var onEffect: ((PrismEffect) -> Void)?
    public var onSnapshot: ((PrismSnapshot) -> Void)?
    public var onHeightChange: ((CGFloat) -> Void)?
    public private(set) var contentHeight: CGFloat
    // intrinsicContentSize = (noIntrinsicMetric, contentHeight)
}

public struct PrismWidget: View {
    public init(envelopeJSON: String, instanceId: String, snapshot: PrismSnapshot? = nil,
                onEffect: ((PrismEffect) -> Void)? = nil, onSnapshot: ((PrismSnapshot) -> Void)? = nil)
}

public struct PrismSnapshot: Codable, Hashable {   // state + last screen + height; store as is
    public let height: CGFloat
    public let json: String
    public init?(json: String)
}
```

Notes:
- In a `LazyVStack`, `List` or table view, keep the last snapshot per block and pass it back: a
  widget that scrolls away and back appears instantly (saved screen on the first frame, at the
  saved height), with the user's values. Save snapshots with your messages and a reopened chat is
  instant too.
- The widget is transparent with no padding; put it on your own background (token `background`:
  `#F4F4F7` light / `#0F0F12` dark) with 16 pt padding.
- Callbacks arrive on the main thread. Effects are the host's job.
- Property changes are applied together on the next main-loop turn, so set several in a row.
- One shared runtime per app; all widgets share it.

## Test

```sh
xcodebuild test -scheme Prism -destination 'platform=iOS Simulator,name=iPhone 17'
```

Demo app with UI tests: `sdk/demos/ios`.
