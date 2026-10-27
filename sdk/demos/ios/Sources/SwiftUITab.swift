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
            List {
                Section {
                    HStack(spacing: 14) {
                        PrismMark(size: 40)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Prism examples").font(.system(size: 26, weight: .light))
                            Text("Small working screens, drawn with iPhone controls.")
                                .font(.footnote).foregroundColor(.prismMuted)
                        }
                    }
                    .padding(.vertical, 6)
                    .listRowBackground(Color.clear)
                }
                section("Examples", Example.main)
                section("Every part", Example.parts)
                section("Tests", Example.tests)
            }
            .scrollContentBackground(.hidden)
            .background(Color.prismBackground.ignoresSafeArea())
            .navigationTitle("Examples")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: Example.self) { ExamplePage(example: $0) }
        }
    }

    private func section(_ title: String, _ examples: [Example]) -> some View {
        Section(title) {
            ForEach(examples) { example in
                NavigationLink(value: example) { Text(example.title) }
                    .listRowBackground(Color.prismSurface)
                    .accessibilityIdentifier("row-\(example.id)")
            }
        }
    }
}

struct ExamplePage: View {
    let example: Example
    @State private var instanceId: String
    @State private var showSource = false
    /// nil = follow the phone; otherwise force light or dark (to check both without changing settings).
    @State private var scheme: ColorScheme?
    @State private var brand = DemoBrand.current

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
        .onChange(of: brand) { DemoBrand.current = $0; Prism.theme = $0.theme }
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
                        ForEach(DemoBrand.allCases, id: \.self) { Text($0.rawValue).tag($0) }
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
