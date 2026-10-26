import SwiftUI
import Prism

struct GalleryView: View {
    /// `-example 03-tasks` on launch opens that example directly (handy for screenshots).
    @State private var path: [Example] = {
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-example"), i + 1 < args.count, let e = Example.named(args[i + 1]) { return [e] }
        return []
    }()

    var body: some View {
        NavigationStack(path: $path) {
            List(Example.all) { example in
                NavigationLink(value: example) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(example.title).font(.body)
                        Text(example.id).font(.caption).foregroundColor(.secondary)
                    }
                }
                .accessibilityIdentifier("row-\(example.id)")
            }
            .navigationTitle("Prism examples")
            .navigationDestination(for: Example.self) { ExamplePage(example: $0) }
        }
    }
}

struct ExamplePage: View {
    let example: Example
    @State private var instanceId: String
    @State private var showSource = false
    /// nil = follow the phone; otherwise force light or dark (to check both without changing settings).
    @State private var scheme: ColorScheme?
    @State private var brand = "Default"

    init(example: Example) {
        self.example = example
        _instanceId = State(initialValue: StateStore.shared.nextInstanceId(example.id))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                PrismWidget(
                    envelopeJSON: example.envelopeJSON,
                    instanceId: instanceId,
                    snapshot: StateStore.shared.snapshot(example.id),
                    onEffect: { Toaster.shared.handle($0) },
                    onSnapshot: { StateStore.shared.save(example.id, $0) }
                )

                Text("This text sits right below the widget. If it moves when the widget grows, auto height works.")
                    .font(.footnote)
                    .foregroundColor(.prismMuted)
                    .accessibilityIdentifier("belowWidget")

                if showSource {
                    Text(example.source)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.primary)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 10).fill(Color.prismSurface))
                        .accessibilityIdentifier("source")
                }
            }
            .padding(16)
        }
        .background(Color.prismBackground.ignoresSafeArea())
        .preferredColorScheme(scheme) // the whole window, so the bars match too
        .onChange(of: brand) { name in
            // Orange: pill corners. Green: square corners and Avenir Next (built into iOS). Purple: colour only.
            switch name {
            case "Orange": Prism.theme = PrismTheme(accent: UIColor(hex: 0xE8590C), corners: .pill)
            case "Green": Prism.theme = PrismTheme(accent: UIColor(hex: 0x0A8F5B), corners: .square,
                                                   font: .init(regular: "AvenirNext-Regular", medium: "AvenirNext-Medium",
                                                               semibold: "AvenirNext-DemiBold", bold: "AvenirNext-Bold"))
            case "Purple": Prism.theme = PrismTheme(accent: UIColor(hex: 0x7048E8))
            default: Prism.theme = nil
            }
        }
        .navigationTitle(example.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                Menu {
                    Picker("Appearance", selection: $scheme) {
                        Text("System").tag(ColorScheme?.none)
                        Text("Light").tag(ColorScheme?.some(.light))
                        Text("Dark").tag(ColorScheme?.some(.dark))
                    }
                    // Try a brand: one accent colour; Prism works out the rest (DESIGN-SYSTEM.md section 3).
                    Picker("Brand", selection: $brand) {
                        ForEach(["Default", "Orange", "Green", "Purple"], id: \.self) { Text($0).tag($0) }
                    }
                } label: { Image(systemName: "circle.lefthalf.filled") }
                .accessibilityIdentifier("appearance")
                Button(showSource ? "Hide source" : "Show source") { showSource.toggle() }
                    .accessibilityIdentifier("sourceToggle")
                Button("Reset") {
                    StateStore.shared.clear(example.id)
                    instanceId = StateStore.shared.nextInstanceId(example.id) // new id = fresh load
                }
                .accessibilityIdentifier("resetButton")
            }
        }
    }
}
