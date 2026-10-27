import XCTest

/// The README videos, not checks: each test plays one showcase answer (core/test/ai-replies/showcase.md)
/// and uses its screen like a person would, at a pace that reads well on video. They only run when
/// asked, while the simulator records:
///
///   xcrun simctl io booted recordVideo clip.mp4 &
///   TEST_RUNNER_PRISM_CLIPS=1 xcodebuild test ... -only-testing:PrismHostDemoUITests/ShowcaseClips/testLaptops
///
/// Needs the dev server (`node server/server.mjs` from the repo root).
final class ShowcaseClips: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["PRISM_CLIPS"] != nil, "only when recording clips")
        let up = (try? Data(contentsOf: URL(string: "http://127.0.0.1:8787/health")!)) != nil
        try XCTSkipUnless(up, "dev server not running on 127.0.0.1:8787")
        app.launch()
        app.tabBars.buttons["Chat"].tap()
        app.segmentedControls.buttons["Replay"].tap()
        sleep(2) // the welcome screen, so the clip starts calm
    }

    func any(_ id: String) -> XCUIElement { app.descendants(matching: .any)[id] }

    /// The first element whose label contains `text` (screen rows are labelled "B: Where is …").
    func labelled(_ text: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }

    /// Taps the welcome card, then waits until the answer has finished arriving.
    func play(_ card: String) {
        let button = app.buttons[card]
        XCTAssertTrue(button.waitForExistence(timeout: 10), "card \(card)")
        button.tap()
        XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 30), "screen")
        XCTAssertTrue(any("chatSend").waitForExistence(timeout: 60), "answer finished")
        sleep(2)
    }

    func tap(_ text: String, scrolling: Bool = true) {
        let el = labelled(text)
        for _ in 0..<6 where scrolling && !(el.exists && el.isHittable) { app.swipeUp(velocity: .slow) }
        XCTAssertTrue(el.waitForExistence(timeout: 5), text)
        el.tap()
        sleep(1)
    }

    func testHTTPS() {
        play("How HTTPS keeps your password safe, as a diagram")
        app.swipeUp(velocity: .slow); sleep(2)
        app.swipeUp(velocity: .slow); sleep(4)
    }

    func testLaptops() {
        play("Choose a laptop for 4K video editing under $1500")
        let screen = any("chatWidget")
        screen.swipeLeft(velocity: .slow); sleep(2)
        screen.swipeLeft(velocity: .slow); sleep(2)
        app.swipeUp(velocity: .slow); sleep(4) // the pick and why
    }

    func testBooking() {
        play("Book a table for 4, with Allow or Cancel first")
        tap("Book table", scrolling: false)
        sleep(4) // the app's message: what it would now run
    }

    func testQuiz() {
        play("Spanish travel phrases quiz with a score")
        tap("Where is the train station?")
        tap("How much does this cost?")
        tap("One beer, thank you") // a wrong one, to show both
        tap("Do you speak English?")
        tap("I need help")
        app.swipeUp(velocity: .slow); sleep(4) // the score
    }
}
