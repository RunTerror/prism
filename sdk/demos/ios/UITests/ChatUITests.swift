import XCTest

/// The Chat tab against the dev server (server/). Start it first: `node server/server.mjs` from the repo root.
/// Screenshots go to ../screenshots/chat-*.png, including ones taken while the reply streams.
final class ChatUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        let up = (try? Data(contentsOf: URL(string: "http://127.0.0.1:8787/health")!)) != nil
        try XCTSkipUnless(up, "dev server not running on 127.0.0.1:8787")
        app.launch()
        app.tabBars.buttons["Chat"].tap()
    }

    func shot(_ name: String) {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .appendingPathComponent("../screenshots").standardized
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? XCUIScreen.main.screenshot().pngRepresentation.write(to: dir.appendingPathComponent("chat-\(name).png"))
    }

    func any(_ id: String) -> XCUIElement { app.descendants(matching: .any)[id] }

    /// Waits until one of these shows; returns its id, or nil after the timeout.
    func firstOf(_ ids: [String], timeout: TimeInterval) -> String? {
        let end = Date().addingTimeInterval(timeout)
        repeat {
            if let id = ids.first(where: { any($0).exists }) { return id }
            usleep(200_000)
        } while Date() < end
        return nil
    }

    /// Replay: a saved reply streams in; text first, then the "building" box, then the live widget.
    func testReplayStreams() {
        app.segmentedControls.buttons["Replay"].tap()
        any("chatSend").tap()
        XCTAssertTrue(any("chatBuilding").waitForExistence(timeout: 10), "building box while the block streams")
        shot("1-replay-building")
        usleep(1_200_000)
        shot("1b-replay-building-later")
        XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 15), "widget after the block ends")
        XCTAssertFalse(any("chatBuilding").exists, "building box replaced")
        let status = any("chatStatus")
        XCTAssertTrue(status.waitForExistence(timeout: 15), "done")
        sleep(1)
        shot("2-replay-done")
        // It's live: the tip calculator's total is there.
        XCTAssertTrue(app.staticTexts["Tip Calculator"].waitForExistence(timeout: 5))
    }

    /// For the README recording, not a check: a saved reply streams in, then its screen is used.
    func testDemoRecording() {
        app.segmentedControls.buttons["Replay"].tap()
        sleep(1)
        any("chatSend").tap()
        XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 20))
        XCTAssertTrue(any("chatSend").waitForExistence(timeout: 20))
        sleep(1)
        let slider = app.sliders.firstMatch
        if slider.waitForExistence(timeout: 3) {
            slider.adjust(toNormalizedSliderPosition: 0.8); sleep(1)
            slider.adjust(toNormalizedSliderPosition: 0.35); sleep(1)
        }
        any("chatSend").tap()
        XCTAssertTrue(any("chatSend").waitForExistence(timeout: 30))
        sleep(3)
    }

    /// The real model (Haiku through the Claude CLI). Slower, and the reply differs each time.
    func testClaudeStreams() {
        let input = any("chatInput")
        input.tap()
        input.typeText("Make a small counter with plus and minus buttons")
        any("chatSend").tap()
        // A fast model can finish the block before the "building" box is ever seen (partial screens
        // replace it at once), so either one counts as the screen arriving.
        XCTAssertNotNil(firstOf(["chatBuilding", "chatWidget"], timeout: 60), "building box or widget while the block streams")
        shot("3-claude-building")
        XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 60), "widget after the block ends")
        XCTAssertTrue(any("chatStatus").waitForExistence(timeout: 30), "done")
        sleep(1)
        shot("4-claude-done")
    }

    /// A teaching answer: the model looks Valdi up, explains it in short text, and shows a screen.
    func testTeachValdi() {
        let input = any("chatInput")
        input.tap()
        input.typeText("Make me understand Valdi")
        any("chatSend").tap()
        XCTAssertTrue(any("chatStatus").waitForExistence(timeout: 30), "status while it works")
        shot("5-valdi-working")
        XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 150), "a teaching screen")
        shot("6-valdi-screen")
        XCTAssertTrue(any("chatSend").waitForExistence(timeout: 150), "reply finished")
        app.swipeDown() // keyboard away
        sleep(2)
        shot("7-valdi-done")
        app.swipeDown()
        sleep(1)
        shot("8-valdi-top")
    }

    /// Streaming: the screen grows in place while the AI writes it (block_partial), then finishes.
    func testScreenGrowsWhileStreaming() {
        app.segmentedControls.buttons["Replay"].tap()
        any("chatSend").tap()
        XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 10), "a partial screen replaces the card")
        XCTAssertTrue(app.staticTexts["Tip Calculator"].waitForExistence(timeout: 5))
        for k in 0..<5 { shot("stream-\(k)"); usleep(450_000) }
        XCTAssertTrue(any("chatSend").waitForExistence(timeout: 15), "reply finished")
        XCTAssertTrue(app.staticTexts["$29.50"].waitForExistence(timeout: 5), "the finished screen")
        shot("stream-done")
    }

    /// A screen scrolled far away (freed by the LazyVStack) and back comes back instantly from its
    /// snapshot: the user's slider value is kept and the loading preview never shows again.
    func testScrolledBackWidgetKeepsItsValues() {
        app.segmentedControls.buttons["Replay"].tap()
        any("chatSend").tap() // tip calculator
        XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 15))
        XCTAssertTrue(any("chatSend").waitForExistence(timeout: 15), "reply finished")
        let slider = app.sliders.firstMatch
        XCTAssertTrue(slider.waitForExistence(timeout: 5))
        slider.adjust(toNormalizedSliderPosition: 0)
        XCTAssertTrue(app.staticTexts["$0.00"].waitForExistence(timeout: 5), "slider moved to 0%: no tip")

        for _ in 0..<4 { // push the calculator several screens up
            any("chatSend").tap()
            XCTAssertTrue(any("chatStop").waitForExistence(timeout: 5))
            XCTAssertTrue(any("chatSend").waitForExistence(timeout: 30), "replay finished")
        }
        XCTAssertFalse(app.staticTexts["$0.00"].isHittable, "calculator is off screen")
        for _ in 0..<12 { app.swipeDown(velocity: .fast) }
        XCTAssertTrue(app.staticTexts["$0.00"].waitForExistence(timeout: 1), "value kept after scrolling back")
        XCTAssertFalse(any("chatBuilding").exists, "no loading preview on the way back")
        shot("9-scrolled-back")
    }

    /// Screenshots of real answers for design review (light/dark set by the simulator).
    func testDesignReviewShots() {
        let mode = ProcessInfo.processInfo.environment["SHOT_SUFFIX"] ?? "light"
        let prompts = [("bmi", "Create a bmi calculator with sliders"),
                       ("compare", "Compare iPhone 17 and Pixel 10 for me"),
                       ("workout", "Plan a 3 day beginner workout week")]
        for (name, prompt) in prompts {
            let input = any("chatInput")
            input.tap()
            input.typeText(prompt)
            any("chatSend").tap()
            if any("chatBuilding").waitForExistence(timeout: 90) {
                sleep(3) // let the preview grow a little
                shot("review-\(name)-\(mode)-0-preview")
            }
            XCTAssertTrue(any("chatWidget").waitForExistence(timeout: 150), "screen for \(name)")
            XCTAssertTrue(any("chatSend").waitForExistence(timeout: 150), "finished \(name)")
            app.swipeDown(); sleep(2)
            shot("review-\(name)-\(mode)-1")
            app.swipeUp(); sleep(2)
            shot("review-\(name)-\(mode)-2")
        }
    }
}
