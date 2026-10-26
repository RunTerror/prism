import Foundation
import UIKit
import PrismSDK

/// Entry point of the Prism SDK.
public enum Prism {
    private static let lock = NSLock()
    private static var manager: SCValdiRuntimeManager?

    /// Creates the shared runtime (one per app). Safe to call many times; the views call it
    /// themselves, so calling it early (for example at app launch) only warms things up.
    public static func start() {
        _ = runtimeManager
    }

    /// A newer part library from your server: the code of `core/dist/prism-library.js` (our
    /// dev server serves it at `GET /library`). The SDK carries a copy; when this one is newer it
    /// is used instead, so new parts and design fixes reach users without an app update.
    /// Widgets made after you set it use it. Older or broken code is ignored.
    public static var library: String? {
        get { lock.lock(); defer { lock.unlock() }; return libraryCode }
        set { lock.lock(); libraryCode = newValue; lock.unlock() }
    }
    private static var libraryCode: String?

    /// Your brand (DESIGN-SYSTEM.md section 3). Every main button, slider, switch, progress bar,
    /// selected choice and link uses its accent; Prism works out the lighter and darker shades for
    /// light and dark mode and keeps text readable. Widgets on screen redraw when it changes.
    public static var theme: PrismTheme? {
        get { lock.lock(); defer { lock.unlock() }; return themeValue }
        set {
            lock.lock(); themeValue = newValue; lock.unlock()
            NotificationCenter.default.post(name: themeDidChange, object: nil)
        }
    }
    private static var themeValue: PrismTheme?
    static let themeDidChange = Notification.Name("PrismThemeDidChange")

    static var runtimeManager: SCValdiRuntimeManager {
        lock.lock()
        defer { lock.unlock() }
        if let manager { return manager }
        let made = SCValdiRuntimeManager()
        manager = made
        return made
    }

    static var runtime: SCValdiRuntimeProtocol {
        guard let runtime = runtimeManager.mainRuntime else {
            fatalError("Prism: Valdi main runtime is not available")
        }
        return runtime
    }
}

/// Everything needed to bring a widget back instantly: its state, its last drawn screen and its
/// height. The widget sends one through `onSnapshot` (after the first draw, after every tap or
/// change, and when its height changes). Give it back as `snapshot` when the widget is made again
/// (a lazy list scrolled back, the chat reopened later): the saved screen is drawn on the very
/// first frame at the saved height, and the widget carries on from the saved state.
///
/// Store it as is (it is `Codable`). A snapshot only applies to the same block (envelope); for any
/// other block it is ignored.
public struct PrismSnapshot: Codable, Hashable {
    /// The widget's height when the snapshot was taken (points).
    public let height: CGFloat
    /// The snapshot itself. Opaque: store and give back unchanged.
    public let json: String

    /// Reads a snapshot sent by the widget. nil if it is not one.
    public init?(json: String) {
        guard let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              obj["v"] as? Int == 1 else { return nil }
        self.json = json
        self.height = CGFloat((obj["height"] as? NSNumber)?.doubleValue ?? 0)
    }
}

/// The app's brand: one accent colour, and optionally the chat's own background and text colours.
/// `...Dark` values are for dark mode; when missing, Prism works them out from the light ones.
public struct PrismTheme: Equatable {
    /// The corner style of cards, buttons and fields.
    public enum Corners: String { case rounded, square, pill }

    /// Your font's names per weight (as UIFont knows them, e.g. "Inter-SemiBold"). Missing
    /// weights use the closest given one, or the system font. Text still follows Dynamic Type.
    public struct Font: Equatable {
        public var regular: String?
        public var medium: String?
        public var semibold: String?
        public var bold: String?
        public init(regular: String? = nil, medium: String? = nil, semibold: String? = nil, bold: String? = nil) {
            self.regular = regular; self.medium = medium; self.semibold = semibold; self.bold = bold
        }
    }

    public var accent: UIColor
    public var corners: Corners = .rounded
    public var font: Font? = nil
    public var accentDark: UIColor?
    public var background: UIColor?
    public var backgroundDark: UIColor?
    public var text: UIColor?
    public var textDark: UIColor?

    public init(accent: UIColor, accentDark: UIColor? = nil, background: UIColor? = nil,
                backgroundDark: UIColor? = nil, text: UIColor? = nil, textDark: UIColor? = nil,
                corners: Corners = .rounded, font: Font? = nil) {
        self.accent = accent
        self.corners = corners
        self.font = font
        self.accentDark = accentDark
        self.background = background
        self.backgroundDark = backgroundDark
        self.text = text
        self.textDark = textDark
    }

    /// What the widget reads (prism_theme Brand), with colours as "#RRGGBB".
    var json: String {
        var obj: [String: Any] = ["accent": Self.hex(accent), "corners": corners.rawValue]
        if let font {
            var f: [String: String] = [:]
            f["regular"] = font.regular; f["medium"] = font.medium; f["semibold"] = font.semibold; f["bold"] = font.bold
            obj["font"] = f
        }
        if let c = accentDark { obj["accentDark"] = Self.hex(c) }
        if let c = background { obj["background"] = Self.hex(c) }
        if let c = backgroundDark { obj["backgroundDark"] = Self.hex(c) }
        if let c = text { obj["text"] = Self.hex(c) }
        if let c = textDark { obj["textDark"] = Self.hex(c) }
        let data = (try? JSONSerialization.data(withJSONObject: obj, options: .sortedKeys)) ?? Data()
        return String(decoding: data, as: UTF8.self)
    }

    static func hex(_ color: UIColor) -> String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.resolvedColor(with: UITraitCollection(userInterfaceStyle: .light)).getRed(&r, green: &g, blue: &b, alpha: &a)
        let v = { (x: CGFloat) in Int((max(0, min(1, x)) * 255).rounded()) }
        return String(format: "#%02X%02X%02X", v(r), v(g), v(b))
    }
}

/// Something the widget asks the host to do. The widget does nothing by itself.
public enum PrismEffect: Equatable {
    /// Show a short message (toast / snackbar).
    case toast(String)
    /// Open a URL.
    case open(URL)
    /// Copy text to the clipboard.
    case copy(String)
    /// Ask the AI a follow-up question (POC: show it as a toast).
    case ask(String)
    /// The user tapped Allow on a `<Confirm>`: run one of the app's own actions, like
    /// `send_email` with `["to": "priya@example.com"]`. Only a Confirm can send this, never the AI's code.
    case action(name: String, args: [String: AnyHashable])
    /// Anything else (also `open` with a value that is not a URL).
    case other(type: String, value: String)

    /// Maps the raw `(type, value)` pair sent by the widget.
    public init(type: String, value: String) {
        switch type {
        case "toast": self = .toast(value)
        case "copy": self = .copy(value)
        case "ask": self = .ask(value)
        case "action":
            // value: {"name": "send_email", "args": {"to": "..."}}
            if let data = value.data(using: .utf8),
               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let name = obj["name"] as? String, !name.isEmpty {
                let raw = obj["args"] as? [String: Any] ?? [:]
                self = .action(name: name, args: raw.compactMapValues { $0 as? AnyHashable })
            } else {
                self = .other(type: type, value: value)
            }
        case "open":
            if let url = URL(string: value), url.scheme != nil {
                self = .open(url)
            } else {
                self = .other(type: type, value: value)
            }
        default: self = .other(type: type, value: value)
        }
    }

    /// The effect type as sent by the widget ("toast", "open", ...).
    public var type: String {
        switch self {
        case .toast: return "toast"
        case .open: return "open"
        case .copy: return "copy"
        case .ask: return "ask"
        case .action: return "action"
        case .other(let type, _): return type
        }
    }

    /// The effect value as sent by the widget.
    public var value: String {
        switch self {
        case .toast(let v), .copy(let v), .ask(let v): return v
        case .open(let url): return url.absoluteString
        case .action(let name, let args):
            let obj: [String: Any] = ["name": name, "args": args]
            let data = (try? JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys])) ?? Data()
            return String(data: data, encoding: .utf8) ?? ""
        case .other(_, let v): return v
        }
    }
}
