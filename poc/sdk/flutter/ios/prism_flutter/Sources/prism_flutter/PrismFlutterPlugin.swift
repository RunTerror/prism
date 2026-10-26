import Flutter
import Prism
import UIKit

/// Registers the `dev.prism/widget` platform view and the `dev.prism/sdk` channel.
public final class PrismFlutterPlugin: NSObject, FlutterPlugin {
    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "dev.prism/sdk", binaryMessenger: registrar.messenger())
        registrar.addMethodCallDelegate(PrismFlutterPlugin(), channel: channel)
        registrar.register(PrismViewFactory(messenger: registrar.messenger()), withId: "dev.prism/widget")
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "start":
            Prism.start()
            result(nil)
        default:
            result(FlutterMethodNotImplemented)
        }
    }
}

final class PrismViewFactory: NSObject, FlutterPlatformViewFactory {
    private let messenger: FlutterBinaryMessenger

    init(messenger: FlutterBinaryMessenger) {
        self.messenger = messenger
    }

    func createArgsCodec() -> FlutterMessageCodec & NSObjectProtocol {
        FlutterStandardMessageCodec.sharedInstance()
    }

    func create(withFrame frame: CGRect, viewIdentifier viewId: Int64, arguments args: Any?) -> FlutterPlatformView {
        PrismPlatformView(viewId: viewId, args: args as? [String: Any] ?? [:], messenger: messenger)
    }
}

/// One `PrismWidget` on the Dart side = one `PrismWidgetView` here, talking over its own channel.
final class PrismPlatformView: NSObject, FlutterPlatformView {
    private let widget: PrismWidgetView
    private let channel: FlutterMethodChannel

    init(viewId: Int64, args: [String: Any], messenger: FlutterBinaryMessenger) {
        let snapshot = (args["snapshotJson"] as? String).flatMap(PrismSnapshot.init(json:))
        widget = PrismWidgetView(envelopeJSON: args["envelopeJson"] as? String ?? "",
                                 instanceId: args["instanceId"] as? String ?? "",
                                 snapshot: snapshot)
        widget.colorScheme = Self.style(args["colorScheme"] as? String)
        channel = FlutterMethodChannel(name: "dev.prism/widget_\(viewId)", binaryMessenger: messenger)
        super.init()

        let channel = self.channel
        widget.onHeightChange = { h in channel.invokeMethod("height", arguments: Double(h)) }
        widget.onEffect = { e in channel.invokeMethod("effect", arguments: ["type": e.type, "value": e.value]) }
        widget.onSnapshot = { s in channel.invokeMethod("snapshot", arguments: s.json) }
        channel.setMethodCallHandler { [weak self] call, result in
            self?.handle(call, result: result)
        }
    }

    func view() -> UIView { widget }

    private func handle(_ call: FlutterMethodCall, result: FlutterResult) {
        switch call.method {
        case "setEnvelope":
            let args = call.arguments as? [String: Any] ?? [:]
            // Snapshot first so the reload picks it up.
            widget.snapshot = (args["snapshotJson"] as? String).flatMap(PrismSnapshot.init(json:))
            widget.envelopeJSON = args["envelopeJson"] as? String ?? ""
            widget.instanceId = args["instanceId"] as? String ?? ""
            widget.colorScheme = Self.style(args["colorScheme"] as? String)
            result(nil)
        case "setColorScheme":
            widget.colorScheme = Self.style(call.arguments as? String)
            result(nil)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    deinit {
        channel.setMethodCallHandler(nil)
        widget.onHeightChange = nil
        widget.onEffect = nil
        widget.onSnapshot = nil
    }

    private static func style(_ scheme: String?) -> UIUserInterfaceStyle? {
        switch scheme {
        case "dark": return .dark
        case "light": return .light
        default: return nil
        }
    }
}
