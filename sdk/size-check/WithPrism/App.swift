import SwiftUI
import Prism

@main
struct WithPrismApp: App {
    var body: some Scene {
        WindowGroup {
            VStack {
                Text("Hello").padding()
                PrismWidget(envelopeJSON: "{}", instanceId: "size-check")
            }
        }
    }
}
