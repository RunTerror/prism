import SwiftUI
import Prism

@main
struct PrismClientApp: App {
    init() { Prism.start() }

    var body: some Scene {
        WindowGroup {
            Text("Prism")
        }
    }
}
