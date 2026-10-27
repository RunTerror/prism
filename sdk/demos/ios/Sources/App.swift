import SwiftUI
import Prism

@main
struct PrismHostDemoApp: App {
    init() {
        Prism.start()
        Prism.theme = DemoBrand.coral.theme // the demo app's brand: coral, like the website
        // The newest part library from the dev server, so new parts show without an app update.
        // Until it arrives (or if the server is off) the copy inside the SDK is used.
        Task {
            // ?blocks= : the server only sends a library this app's drawer can draw (VERSIONS.md).
            var url = URLComponents(url: chatServer.appendingPathComponent("library"), resolvingAgainstBaseURL: false)!
            url.queryItems = [URLQueryItem(name: "blocks", value: String(PrismVersions.blocks))]
            guard let (data, _) = try? await URLSession.shared.data(from: url.url!),
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let code = obj["code"] as? String else { return }
            Prism.library = code
        }
    }

    /// `-tab chat` on launch opens the Chat tab first.
    @State private var tab: String = {
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-tab"), i + 1 < args.count { return args[i + 1] }
        return "swiftui"
    }()

    var body: some Scene {
        WindowGroup {
            TabView(selection: $tab) {
                GalleryView()
                    .tabItem { Label("Examples", systemImage: "square.grid.2x2") }.tag("swiftui")
                ChatView()
                    .tabItem { Label("Chat", systemImage: "bubble.left.and.text.bubble.right") }.tag("chat")
            }
            .tint(.prismCoral)
            .toastOverlay()
        }
    }
}

// MARK: - Examples

struct Example: Identifiable, Hashable {
    let id: String
    let title: String
    let source: String
    let envelopeJSON: String

    /// The gallery examples, then every part's examples from the web Components page (showcase.json).
    static let all: [Example] = load("examples") + load("showcase")

    private static func load(_ name: String) -> [Example] {
        guard let url = Bundle.main.url(forResource: name, withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [] }
        return list.compactMap { item in
            guard let id = item["id"] as? String, var title = item["title"] as? String,
                  let env = item["envelope"],
                  let envData = try? JSONSerialization.data(withJSONObject: env),
                  let envJSON = String(data: envData, encoding: .utf8) else { return nil }
            if let part = item["part"] as? String { title = "\(part) · \(title)" }
            if let note = title.range(of: " (") { title = String(title[..<note.lowerBound]) } // "Chat parts (from the part library)"
            return Example(id: id, title: title, source: item["source"] as? String ?? "", envelopeJSON: envJSON)
        }
    }

    static func named(_ id: String) -> Example? { all.first { $0.id == id } }

    // The home screen's sections. Tests check the SDK (a part that crashes, effects, the basic
    // blocks only our own code may use); they stay at the bottom.
    private static let testIds: Set<String> = ["06-broken", "07-effects", "11-blocks"]
    static var main: [Example] {
        let gallery = all.filter { $0.isGallery && !testIds.contains($0.id) }
        return gallery.filter { $0.id == "12-chat-parts" } + gallery.filter { $0.id != "12-chat-parts" }
    }
    /// Every part's examples (ids like "Badge-1"); the gallery's start with a number ("01-hello").
    static var parts: [Example] { all.filter { !$0.isGallery } }
    var isGallery: Bool { id.first?.isNumber == true }
    static var tests: [Example] { all.filter { testIds.contains($0.id) } }
}

/// Widget snapshot per example, kept in memory while the app runs.
final class StateStore {
    static let shared = StateStore()
    private var snapshots: [String: PrismSnapshot] = [:]
    private var counter = 0

    func snapshot(_ id: String) -> PrismSnapshot? { snapshots[id] }
    func save(_ id: String, _ snapshot: PrismSnapshot) { snapshots[id] = snapshot }
    func clear(_ id: String) { snapshots[id] = nil }

    /// A fresh instance id every time a widget is created (ids must be unique on screen).
    func nextInstanceId(_ id: String) -> String {
        counter += 1
        return "\(id)#\(counter)"
    }
}

// MARK: - Design tokens (core/CLIENTS.md)

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
    static func token(light: UInt32, dark: UInt32) -> UIColor {
        UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) }
    }
    // The Prism brand (core/tokens.json): ink and warm off-white.
    static let prismBackground = token(light: 0xF7F6F5, dark: 0x050506)
    static let prismMuted = token(light: 0x6B6966, dark: 0xA8A6A5)
    static let prismDefault = token(light: 0x18181B, dark: 0xF4F4F5)
    static let prismSurface = token(light: 0xFFFFFF, dark: 0x111114)
    static let prismBorder = token(light: 0xE6E4E2, dark: 0x24242A)
    static let prismSkeleton = token(light: 0xF2F1F0, dark: 0x1A1A1F)
    /// Coral, the demo's brand colour: deeper in light mode so it stays readable.
    static let prismCoral = token(light: 0xE5483C, dark: 0xFF5A4E)
}

extension Color {
    static let prismBackground = Color(UIColor.prismBackground)
    static let prismMuted = Color(UIColor.prismMuted)
    static let prismDefault = Color(UIColor.prismDefault)
    static let prismSurface = Color(UIColor.prismSurface)
    static let prismBorder = Color(UIColor.prismBorder)
    static let prismSkeleton = Color(UIColor.prismSkeleton)
    static let prismCoral = Color(UIColor.prismCoral)
}

// MARK: - Effects + toast

final class Toaster: ObservableObject {
    static let shared = Toaster()
    @Published var message: String?
    private var hideWork: DispatchWorkItem?

    func show(_ text: String) {
        message = text
        hideWork?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.message = nil }
        hideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5, execute: work)
    }

    /// What this demo does with each effect (effects are the host's job).
    func handle(_ effect: PrismEffect) {
        switch effect {
        case .toast(let text): show(text)
        case .open(let url): UIApplication.shared.open(url)
        case .copy(let text):
            UIPasteboard.general.string = text
            show("Copied")
        case .ask(let question): show("Would ask AI: \(question)")
        case .action(let name, _): show("The app would now run “\(name)”")
        case .other(let type, let value): show("\(type): \(value)")
        }
    }
}

struct ToastOverlay: ViewModifier {
    @ObservedObject var toaster = Toaster.shared
    func body(content: Content) -> some View {
        content.overlay(alignment: .bottom) {
            if let message = toaster.message {
                Text(message)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(Capsule().fill(Color.black.opacity(0.85)))
                    .padding(.bottom, 70)
                    .accessibilityIdentifier("toast")
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: toaster.message)
    }
}

extension View {
    func toastOverlay() -> some View { modifier(ToastOverlay()) }
}

// MARK: - Brands to try (DESIGN-SYSTEM.md section 3): one accent colour, Prism works out the rest.

enum DemoBrand: String, CaseIterable {
    case coral = "Coral", azure = "Azure", mint = "Mint"
    /// The one picked last, so every example's menu shows what the app is really using.
    static var current = DemoBrand.coral

    var theme: PrismTheme {
        switch self {
        case .coral: return PrismTheme(accent: UIColor(hex: 0xE5483C), accentDark: UIColor(hex: 0xFF5A4E))
        // Azure: pill corners. Mint: square corners and Avenir Next (built into iOS).
        case .azure: return PrismTheme(accent: UIColor(hex: 0x3A76F0), accentDark: UIColor(hex: 0x4C8DFF), corners: .pill)
        case .mint: return PrismTheme(accent: UIColor(hex: 0x1FA971), accentDark: UIColor(hex: 0x3DDC97), corners: .square,
                                      font: .init(regular: "AvenirNext-Regular", medium: "AvenirNext-Medium",
                                                  semibold: "AvenirNext-DemiBold", bold: "AvenirNext-Bold"))
        }
    }
}
