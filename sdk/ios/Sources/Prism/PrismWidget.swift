import SwiftUI
import UIKit

/// SwiftUI view that draws one Prism widget natively.
///
/// Fills the width it is offered and sizes itself to the content height (no `.frame` needed).
/// Follows `@Environment(\.colorScheme)`. Callbacks arrive on the main thread.
///
/// In a `LazyVStack`/`List`, keep the last `onSnapshot` per block and pass it back as `snapshot`:
/// a widget that scrolls away and back then appears instantly, as the user left it.
public struct PrismWidget: View {
    private let envelopeJSON: String
    private let instanceId: String
    private let snapshot: PrismSnapshot?
    private let onEffect: ((PrismEffect) -> Void)?
    private let onSnapshot: ((PrismSnapshot) -> Void)?

    @State private var height: CGFloat

    public init(envelopeJSON: String,
                instanceId: String,
                snapshot: PrismSnapshot? = nil,
                onEffect: ((PrismEffect) -> Void)? = nil,
                onSnapshot: ((PrismSnapshot) -> Void)? = nil) {
        self.envelopeJSON = envelopeJSON
        self.instanceId = instanceId
        self.snapshot = snapshot
        self.onEffect = onEffect
        self.onSnapshot = onSnapshot
        _height = State(initialValue: snapshot?.height ?? 0) // re-made from a snapshot: no jump
    }

    public var body: some View {
        PrismWidgetRepresentable(envelopeJSON: envelopeJSON,
                                 instanceId: instanceId,
                                 snapshot: snapshot,
                                 onEffect: onEffect,
                                 onSnapshot: onSnapshot,
                                 height: $height)
            .frame(maxWidth: .infinity)
            .frame(height: height)
    }
}

struct PrismWidgetRepresentable: UIViewRepresentable {
    let envelopeJSON: String
    let instanceId: String
    let snapshot: PrismSnapshot?
    let onEffect: ((PrismEffect) -> Void)?
    let onSnapshot: ((PrismSnapshot) -> Void)?
    @Binding var height: CGFloat

    func makeUIView(context: Context) -> PrismWidgetView {
        let view = PrismWidgetView(envelopeJSON: envelopeJSON, instanceId: instanceId,
                                   snapshot: snapshot)
        view.colorScheme = Self.style(context.environment.colorScheme)
        view.setContentHuggingPriority(.defaultLow, for: .horizontal)
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        configure(view)
        return view
    }

    func updateUIView(_ view: PrismWidgetView, context: Context) {
        // Order matters: snapshot first so a reload in the same pass picks it up.
        view.snapshot = snapshot
        view.envelopeJSON = envelopeJSON
        view.instanceId = instanceId
        view.colorScheme = Self.style(context.environment.colorScheme)
        configure(view)
    }

    static func dismantleUIView(_ view: PrismWidgetView, coordinator: ()) {
        view.onEffect = nil
        view.onSnapshot = nil
        view.onHeightChange = nil
    }

    private func configure(_ view: PrismWidgetView) {
        view.onEffect = onEffect
        view.onSnapshot = onSnapshot
        let binding = $height
        view.onHeightChange = { h in
            if binding.wrappedValue != h { binding.wrappedValue = h }
        }
        if view.contentHeight != height && view.contentHeight > 0 {
            DispatchQueue.main.async { binding.wrappedValue = view.contentHeight }
        }
    }

    static func style(_ scheme: ColorScheme) -> UIUserInterfaceStyle {
        scheme == .dark ? .dark : .light
    }
}
