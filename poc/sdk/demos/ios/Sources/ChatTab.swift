import SwiftUI
import Prism

// Chat tab: talks to the Prism dev server (poc/server) and shows the reply as it streams.
//
//   you type -> POST /chat -> server events, one by one:
//     status       "Searching the web…" while the model works before writing
//     text         add to the message as it arrives
//     block_start  show the loading card (a shimmering skeleton)
//     block_progress  grow the loading card: lines written, title, parts used so far
//     block_partial   the screen so far: replaces the card, then grows (the same widget, updated)
//     block        swap the box for a live PrismWidget (the envelope is already compiled)
//     done/error   stop
//
// The simulator shares the Mac's network, so 127.0.0.1 is the Mac. (IP addresses skip App
// Transport Security, so plain http works without Info.plist changes.)

let chatServer = URL(string: "http://127.0.0.1:8787")!

/// What the server tells us about a block while the model is still writing it.
struct BlockProgress: Equatable {
    var lines = 0
    var title: String? = nil
    var parts: [String] = []
    /// Visible parts in the order they were written, repeats kept (for the preview's shapes).
    var shape: [String] = []
}

struct ChatMessage: Identifiable {
    enum Part {
        case text(String)
        case building(blockId: String, progress: BlockProgress)
        case widget(blockId: String, envelopeJSON: String, preview: BlockProgress)
    }
    let id: String
    let fromUser: Bool
    var parts: [Part] = []
    var status: String? = nil
}

@MainActor
final class ChatModel: ObservableObject {
    enum Mode: String, CaseIterable { case replay = "Replay", claude = "Claude" }

    @Published var messages: [ChatMessage] = []
    @Published var mode: Mode = .claude
    @Published var busy = false
    private var replies: [String] = []
    private var replayIndex = 0
    private var count = 0
    /// Same id for every message in this chat, so the model remembers earlier ones.
    private let conversation = UUID().uuidString
    private var task: Task<Void, Never>?

    func send(_ text: String) {
        guard !busy else { return }
        count += 1
        let replyId = "chat\(count)"
        let question = mode == .claude ? text : (text.isEmpty ? "Replay a saved reply" : text)
        messages.append(ChatMessage(id: "user\(count)", fromUser: true, parts: [.text(question)]))
        messages.append(ChatMessage(id: replyId, fromUser: false, status: "Waiting for the model…"))
        busy = true
        task = Task { await stream(question, into: replyId) }
    }

    func stop() { task?.cancel() }

    /// Screens that already faded in (so coming back to one doesn't show the preview again),
    /// and each screen's latest snapshot from the SDK (so a widget re-made by the lazy list
    /// appears instantly, as the user left it). Not @Published: must not redraw the whole chat.
    var revealed: Set<String> = []
    var snapshots: [String: PrismSnapshot] = [:]

    /// A screen button asked something (P.ask): send it as the user's next message.
    func handle(_ effect: PrismEffect) {
        if case .ask(let question) = effect {
            if mode == .replay { mode = .claude }
            send(question)
        } else {
            Toaster.shared.handle(effect)
        }
    }

    private func stream(_ text: String, into replyId: String) async {
        defer { busy = false }
        let started = Date()
        do {
            // app: what this SDK draws, so the AI only uses parts it can show (VERSIONS.md).
            var body: [String: Any] = ["message": text, "mode": mode == .claude ? "claude" : "replay",
                                       "conversation": conversation, "app": PrismVersions.app]
            if mode == .replay, let name = await nextReplay() { body["replay"] = name }
            var request = URLRequest(url: chatServer.appendingPathComponent("chat"))
            request.httpMethod = "POST"
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            request.timeoutInterval = 180 // web searches can be quiet for a while

            let (bytes, _) = try await URLSession.shared.bytes(for: request)
            var event = ""
            // Server-Sent Events: "event: name" then "data: {json}". Each event has one data line.
            for try await line in bytes.lines {
                if line.hasPrefix("event: ") {
                    event = String(line.dropFirst(7))
                } else if line.hasPrefix("data: "),
                          let data = line.dropFirst(6).data(using: .utf8),
                          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    handle(event, json, replyId, started)
                }
            }
        } catch is CancellationError {
            update(replyId) { $0.status = "Stopped" }
        } catch {
            update(replyId) { $0.status = "Can't reach the server at \(chatServer.absoluteString). Is `node server/server.mjs` running?" }
        }
    }

    private func handle(_ event: String, _ json: [String: Any], _ replyId: String, _ started: Date) {
        switch event {
        case "text":
            let piece = json["text"] as? String ?? ""
            update(replyId) { msg in
                msg.status = nil
                if case .text(let old)? = msg.parts.last { msg.parts[msg.parts.count - 1] = .text(old + piece) }
                else { msg.parts.append(.text(piece)) }
            }
        case "status":
            let text = json["text"] as? String ?? "Working…"
            update(replyId) { $0.status = text }
        case "block_start":
            let id = json["id"] as? String ?? "block"
            update(replyId) { $0.status = nil; $0.parts.append(.building(blockId: id, progress: BlockProgress())) }
        case "block_progress":
            let id = json["id"] as? String ?? "block"
            let progress = BlockProgress(lines: json["lines"] as? Int ?? 0, title: json["title"] as? String,
                                         parts: json["parts"] as? [String] ?? [], shape: json["shape"] as? [String] ?? [])
            update(replyId) { msg in
                if let i = msg.parts.firstIndex(where: { if case .building(id, _) = $0 { return true } else { return false } }) {
                    msg.parts[i] = .building(blockId: id, progress: progress)
                }
            }
        case "block", "block_partial":
            // block_partial: the screen so far; block: the finished screen. Both go into the same
            // widget, so the screen grows in place while the AI writes it.
            let id = json["id"] as? String ?? "block"
            guard let env = json["envelope"],
                  let data = try? JSONSerialization.data(withJSONObject: env),
                  let envJSON = String(data: data, encoding: .utf8) else { return }
            update(replyId) { msg in
                // Instance ids must be unique on screen, also across server restarts: add our reply id.
                let instance = "\(replyId)/\(id)"
                if let i = msg.parts.firstIndex(where: { if case .building(id, _) = $0 { return true } else { return false } }) {
                    var preview = BlockProgress()
                    if case .building(_, let p) = msg.parts[i] { preview = p }
                    msg.parts[i] = .widget(blockId: instance, envelopeJSON: envJSON, preview: preview)
                } else if let i = msg.parts.firstIndex(where: { if case .widget(instance, _, _) = $0 { return true } else { return false } }) {
                    if case .widget(_, _, let preview) = msg.parts[i] {
                        msg.parts[i] = .widget(blockId: instance, envelopeJSON: envJSON, preview: preview)
                    }
                } else {
                    msg.parts.append(.widget(blockId: instance, envelopeJSON: envJSON, preview: BlockProgress()))
                }
            }
        case "done":
            let seconds = Date().timeIntervalSince(started)
            let cost = (json["costUsd"] as? Double).map { $0 > 0 ? String(format: " · $%.3f", $0) : "" } ?? ""
            update(replyId) { $0.status = String(format: "%.1f s", seconds) + cost }
        case "error":
            update(replyId) { $0.status = "Error: \(json["message"] as? String ?? "unknown")" }
        default:
            break
        }
    }

    private func update(_ id: String, _ change: (inout ChatMessage) -> Void) {
        guard let i = messages.firstIndex(where: { $0.id == id }) else { return }
        change(&messages[i])
    }

    /// Replay mode walks through the saved replies the server knows, one per message.
    private func nextReplay() async -> String? {
        if replies.isEmpty,
           let (data, _) = try? await URLSession.shared.data(from: chatServer.appendingPathComponent("replies")),
           let list = try? JSONSerialization.jsonObject(with: data) as? [String] {
            replies = list
        }
        guard !replies.isEmpty else { return nil }
        defer { replayIndex += 1 }
        return replies[replayIndex % replies.count]
    }
}

struct ChatView: View {
    @StateObject private var model = ChatModel()
    @State private var draft = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        // Lazy: rows off screen are freed. A widget that comes back is re-made instantly by
                        // its snapshot (saved screen + height + state, see ChatModel.snapshots).
                        LazyVStack(alignment: .leading, spacing: 14) {
                            ForEach(model.messages) { msg in
                                MessageView(message: msg, model: model).id(msg.id)
                            }
                            Color.clear.frame(height: 1).id("bottom")
                        }
                        .padding(16)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: model.messages.count) { _ in
                        withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                    }
                    .onChange(of: model.messages.last?.parts.count) { _ in
                        withAnimation { proxy.scrollTo("bottom", anchor: .bottom) }
                    }
                }
                inputBar
            }
            .background(Color.prismBackground.ignoresSafeArea())
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("Mode", selection: $model.mode) {
                        ForEach(ChatModel.Mode.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 180)
                    .accessibilityIdentifier("chatMode")
                }
            }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 8) {
            TextField(model.mode == .claude ? "Ask for a screen…" : "Send = replay a saved reply", text: $draft)
                .textFieldStyle(.roundedBorder)
                .submitLabel(.send)
                .onSubmit(send)
                .accessibilityIdentifier("chatInput")
            if model.busy {
                Button("Stop") { model.stop() }.accessibilityIdentifier("chatStop")
            } else {
                Button("Send", action: send)
                    .disabled(model.mode == .claude && draft.trimmingCharacters(in: .whitespaces).isEmpty)
                    .accessibilityIdentifier("chatSend")
            }
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(.bar)
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespaces)
        if model.mode == .claude && text.isEmpty { return }
        draft = ""
        model.send(text)
    }
}

struct MessageView: View {
    let message: ChatMessage
    let model: ChatModel

    var body: some View {
        if message.fromUser {
            HStack {
                Spacer(minLength: 40)
                Text(plainText)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(RoundedRectangle(cornerRadius: 16).fill(Color.accentColor.opacity(0.15)))
            }
        } else {
            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(message.parts.enumerated()), id: \.offset) { _, part in
                    switch part {
                    case .text(let text):
                        MarkdownText(text: text)
                    case .building(_, let progress):
                        BuildingCard(progress: progress)
                    case .widget(let id, let env, let preview):
                        WidgetReveal(envelopeJSON: env, instanceId: id, preview: preview, model: model)
                    }
                }
                if let status = message.status {
                    Text(status).font(.caption).foregroundColor(.prismMuted).accessibilityIdentifier("chatStatus")
                }
            }
        }
    }

    private var plainText: String {
        if case .text(let t)? = message.parts.first { return t }
        return ""
    }

}

/// The model's plain text: paragraphs, bullet lists, small headings and ``` code boxes.
/// Inline Markdown (bold, `code`, links) inside each line. Enough for chat; not a full Markdown parser.
struct MarkdownText: View {
    let text: String

    private enum Block { case line(String), bullet(String), heading(String), code(String), gap, sources([String]) }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
                switch block {
                case .line(let s): Text(inline(s))
                case .heading(let s): Text(inline(s)).font(.headline).padding(.top, 4)
                case .bullet(let s):
                    HStack(alignment: .firstTextBaseline, spacing: 6) { Text("•"); Text(inline(s)) }
                case .code(let s):
                    ScrollView(.horizontal, showsIndicators: false) {
                        Text(s).font(.system(.footnote, design: .monospaced)).padding(10)
                    }
                    .background(RoundedRectangle(cornerRadius: 10).fill(Color.prismSurface))
                case .gap: Color.clear.frame(height: 4)
                case .sources(let links):
                    // Web sources: small and grey, so the answer stays the focus.
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Sources").font(.caption.weight(.semibold))
                        ForEach(Array(links.enumerated()), id: \.offset) { _, link in Text(inline(link)).lineLimit(1) }
                    }
                    .font(.caption)
                    .foregroundColor(.prismMuted)
                    .tint(.prismMuted)
                    .padding(.top, 6)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .textSelection(.enabled)
    }

    private var blocks: [Block] {
        var out: [Block] = []
        var code: [String]? = nil
        var sources: [String]? = nil
        for raw in text.trimmingCharacters(in: .whitespacesAndNewlines).components(separatedBy: "\n") {
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.hasPrefix("```") {
                if let c = code { out.append(.code(c.joined(separator: "\n"))); code = nil } else { code = [] }
            } else if code != nil {
                code!.append(raw)
            } else if sources != nil {
                if line.hasPrefix("- ") || line.hasPrefix("* ") { sources!.append(String(line.dropFirst(2))) }
            } else if line.trimmingCharacters(in: CharacterSet(charactersIn: "*#: ")).lowercased() == "sources" {
                sources = []
            } else if line.isEmpty {
                if case .gap? = out.last {} else { out.append(.gap) }
            } else if line.hasPrefix("- ") || line.hasPrefix("* ") {
                out.append(.bullet(String(line.dropFirst(2))))
            } else if line.hasPrefix("#") {
                out.append(.heading(line.drop(while: { $0 == "#" }).trimmingCharacters(in: .whitespaces)))
            } else {
                out.append(.line(line))
            }
        }
        if let c = code { out.append(.code(c.joined(separator: "\n"))) } // still streaming
        if let s = sources, !s.isEmpty { out.append(.sources(s)) }
        return out
    }

    private func inline(_ s: String) -> AttributedString {
        (try? AttributedString(markdown: s, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace))) ?? AttributedString(s)
    }
}

/// Shown while the model is still writing a ```prism block: a quiet preview of the screen.
/// It looks like the finished Card (same surface, border, radius, title size) and draws the shape of
/// each part as the model writes it: a track for a Slider, a field for an Input, rows for a Table.
/// Grey only, so it doesn't fight the app; the real screen then fades in on top.
struct BuildingCard: View {
    let progress: BlockProgress

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                if let title = progress.title {
                    Text(title).font(.system(size: 18, weight: .semibold)).foregroundColor(.prismDefault)
                        .lineLimit(1)
                        .transition(.opacity)
                } else {
                    SkeletonBlock(width: 140, height: 16)
                }
                Spacer(minLength: 8)
                ProgressView().controlSize(.small)
            }
            // Nothing written yet: two text lines, so the card never looks empty.
            ForEach(Array((progress.shape.isEmpty ? [PreviewShape.text(0.85), .text(0.55)] : PreviewShape.from(progress.shape)).enumerated()),
                    id: \.offset) { _, shape in
                shape.view.transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Color.prismSurface))
        .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Color.prismBorder))
        .animation(.easeOut(duration: 0.25), value: progress)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(progress.title.map { "Building \($0)" } ?? "Building screen")
        .accessibilityIdentifier("chatBuilding")
    }
}

/// One shape in the preview. Several parts in a row of the same kind become one shape
/// (three Buttons -> one row of three pills, many TableRows -> one table).
private enum PreviewShape {
    case title, text(CGFloat), field, slider, toggle, buttons(Int), badges(Int), stats(Int), progress, divider, callout, table(Int)

    static let maxShapes = 8

    static func from(_ parts: [String]) -> [PreviewShape] {
        var out: [PreviewShape] = []
        var i = 0
        var texts = 0
        while i < parts.count && out.count < maxShapes {
            let part = parts[i]
            var run = 1
            while i + run < parts.count && parts[i + run] == part { run += 1 }
            switch part {
            case "Title": out.append(.title)
            case "Text":
                texts += 1
                out.append(.text(texts % 2 == 0 ? 0.55 : 0.85))
            case "Input", "Select": out.append(.field)
            case "Slider": for _ in 0..<min(run, 3) { out.append(.slider) }
            case "Switch", "Checkbox": for _ in 0..<min(run, 3) { out.append(.toggle) }
            case "Button": out.append(.buttons(min(run, 3)))
            case "Badge": out.append(.badges(min(run, 3)))
            case "Stat": out.append(.stats(min(run, 3)))
            case "Progress": out.append(.progress)
            case "Divider": out.append(.divider)
            case "Callout": out.append(.callout)
            case "TableRow": out.append(.table(min(run, 5)))
            default: break
            }
            i += run
        }
        return out
    }

    @ViewBuilder var view: some View {
        switch self {
        case .title: SkeletonBlock(width: 120, height: 14)
        case .text(let fraction): SkeletonLine(fraction: fraction)
        case .field:
            VStack(alignment: .leading, spacing: 6) {
                SkeletonBlock(width: 60, height: 10)
                RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.prismBorder).frame(height: 44)
            }
        case .slider:
            VStack(alignment: .leading, spacing: 10) {
                SkeletonBlock(width: 90, height: 10)
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.prismSkeleton).frame(height: 4)
                    Circle().fill(Color.prismSurface).frame(width: 22, height: 22)
                        .shadow(color: .black.opacity(0.12), radius: 2, y: 1)
                        .offset(x: 70)
                }
            }
        case .toggle:
            HStack {
                SkeletonBlock(width: 110, height: 10)
                Spacer()
                Capsule().fill(Color.prismSkeleton).frame(width: 46, height: 28)
            }
        case .buttons(let n):
            HStack(spacing: 8) {
                ForEach(0..<n, id: \.self) { k in SkeletonBlock(width: k == 0 ? 96 : 76, height: 36, radius: 10) }
            }
        case .badges(let n):
            HStack(spacing: 6) { ForEach(0..<n, id: \.self) { _ in SkeletonBlock(width: 52, height: 20, radius: 10) } }
        case .stats(let n):
            HStack(alignment: .top, spacing: 20) {
                ForEach(0..<n, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 8) {
                        SkeletonBlock(width: 50, height: 10)
                        SkeletonBlock(width: 70, height: 22)
                    }
                }
            }
        case .progress: Capsule().fill(Color.prismSkeleton).frame(height: 6)
        case .divider: Rectangle().fill(Color.prismBorder).frame(height: 1)
        case .callout:
            VStack(alignment: .leading, spacing: 8) {
                SkeletonBlock(width: 100, height: 12)
                SkeletonLine(fraction: 0.8)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Color.prismBackground))
        case .table(let rows):
            VStack(spacing: 0) {
                ForEach(0..<rows, id: \.self) { r in
                    HStack(spacing: 12) {
                        SkeletonBlock(width: r == 0 ? 50 : 70, height: 10)
                        Spacer()
                        SkeletonBlock(width: 50, height: 10)
                        Spacer()
                        SkeletonBlock(width: 44, height: 10)
                    }
                    .padding(.vertical, 12)
                    if r < rows - 1 { Rectangle().fill(Color.prismBorder).frame(height: 1) }
                }
            }
        }
    }
}

/// A grey rounded block that gently shimmers.
private struct SkeletonBlock: View {
    var width: CGFloat
    var height: CGFloat
    var radius: CGFloat? = nil
    var body: some View {
        RoundedRectangle(cornerRadius: radius ?? height / 2, style: .continuous)
            .fill(Color.prismSkeleton)
            .frame(width: width, height: height)
            .shimmer()
    }
}

/// A line of text: a grey bar as wide as `fraction` of the card.
private struct SkeletonLine: View {
    var fraction: CGFloat
    var body: some View {
        GeometryReader { g in SkeletonBlock(width: g.size.width * fraction, height: 10) }
            .frame(height: 10)
    }
}

/// A soft light sweeping left to right, over and over. Very faint in dark mode.
private struct Shimmer: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    @State private var phase: CGFloat = 0
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { g in
                    LinearGradient(colors: [.clear, .white.opacity(scheme == .dark ? 0.08 : 0.6), .clear],
                                   startPoint: .leading, endPoint: .trailing)
                        .frame(width: max(60, g.size.width * 0.6))
                        .offset(x: -g.size.width * 0.6 + phase * g.size.width * 1.6)
                }
                .mask(content)
            )
            .onAppear { withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) { phase = 1 } }
    }
}

private extension View {
    func shimmer() -> some View { modifier(Shimmer()) }
}

/// The live widget, faded in over the loading card so the swap doesn't jump
/// (the widget is 0 tall for a moment while it measures itself).
struct WidgetReveal: View {
    let envelopeJSON: String
    let instanceId: String
    let preview: BlockProgress
    let model: ChatModel
    @State private var shown: Bool

    init(envelopeJSON: String, instanceId: String, preview: BlockProgress, model: ChatModel) {
        self.envelopeJSON = envelopeJSON
        self.instanceId = instanceId
        self.preview = preview
        self.model = model
        _shown = State(initialValue: model.revealed.contains(instanceId)) // fade in only the first time
    }

    var body: some View {
        ZStack(alignment: .top) {
            PrismWidget(envelopeJSON: envelopeJSON, instanceId: instanceId,
                        snapshot: model.snapshots[instanceId],
                        onEffect: { model.handle($0) },
                        onSnapshot: { model.snapshots[instanceId] = $0 })
                .opacity(shown ? 1 : 0)
                .accessibilityIdentifier("chatWidget")
            if !shown {
                BuildingCard(progress: preview).transition(.opacity)
            }
        }
        .onAppear {
            guard !shown else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                withAnimation(.easeOut(duration: 0.35)) { shown = true }
                model.revealed.insert(instanceId)
            }
        }
    }
}
