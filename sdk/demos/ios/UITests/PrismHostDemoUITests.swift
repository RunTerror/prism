import XCTest

/// Real touches on the demo app. Screenshots go to ../screenshots/<name>-<suffix>.png
/// (suffix from env SHOT_SUFFIX via TEST_RUNNER_SHOT_SUFFIX, default "light").
final class PrismHostDemoUITests: XCTestCase {
    let app = XCUIApplication()
    var suffix: String { ProcessInfo.processInfo.environment["SHOT_SUFFIX"] ?? "light" }

    static let examples = [("Hello", "01-hello"), ("Counter", "02-counter"), ("Task list", "03-tasks"),
                           ("Settings", "04-settings"), ("Comparison table", "05-table"),
                           ("Broken parts (safety test)", "06-broken")]

    override func setUp() {
        continueAfterFailure = true
        app.launch()
        XCTAssertTrue(app.staticTexts["Prism examples"].waitForExistence(timeout: 10))
    }

    // MARK: helpers

    func shot(_ name: String) {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
            .appendingPathComponent("../screenshots").standardized
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let png = XCUIScreen.main.screenshot().pngRepresentation
        try? png.write(to: dir.appendingPathComponent("\(name)-\(suffix).png"))
    }

    func el(_ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
    }

    func has(_ label: String, _ timeout: TimeInterval = 3) -> Bool { el(label).waitForExistence(timeout: timeout) }

    func tapLabel(_ label: String, dx: CGFloat = 0) {
        let e = el(label)
        XCTAssertTrue(e.waitForExistence(timeout: 10), "missing \(label)")
        let f = e.frame
        app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: f.midX + dx, dy: f.midY)).tap()
    }

    func open(_ id: String) {
        let row = app.descendants(matching: .any)["row-\(id)"]
        // The list is longer than the screen: scroll until the row shows.
        for _ in 0..<20 where !(row.exists && row.isHittable) { app.swipeUp() }
        for _ in 0..<20 where !(row.exists && row.isHittable) { app.swipeDown() } // it was above
        XCTAssertTrue(row.waitForExistence(timeout: 5), "row \(id)")
        row.tap()
        sleep(1)
    }

    func back() {
        app.navigationBars.buttons.element(boundBy: 0).tap()
        sleep(1)
    }

    var below: XCUIElement { app.descendants(matching: .any)["belowWidget"] }

    // MARK: tests

    /// Every example draws, and the text below the widget sits under its content.
    func testEveryExampleDraws() {
        shot("gallery")
        let firstText = ["01-hello": "Welcome to Prism", "02-counter": "Tap a button", "03-tasks": "1 of 3 done",
                         "04-settings": "Notifications are on.", "05-table": "Where Prism runs",
                         "06-broken": "Everything else still works."]
        for (_, id) in Self.examples {
            open(id)
            let marker = el(firstText[id]!)
            XCTAssertTrue(marker.waitForExistence(timeout: 5), "\(id) draws")
            XCTAssertTrue(below.waitForExistence(timeout: 2))
            XCTAssertGreaterThan(below.frame.minY, marker.frame.maxY, "\(id): text below the widget")
            shot(id)
            back()
        }
    }

    func testCounterAndStateKeptWhenReopened() {
        open("02-counter")
        let belowBefore = below.frame.minY
        tapLabel("+1"); usleep(500_000)
        tapLabel("+1"); usleep(500_000)
        XCTAssertTrue(has("2"), "counter shows 2")
        XCTAssertTrue(has("Going up"))
        XCTAssertEqual(below.frame.minY, belowBefore, accuracy: 1, "same height after taps")
        shot("02-counter-after-2-taps")
        back()
        open("02-counter")
        XCTAssertTrue(has("2"), "state kept after re-opening")
        XCTAssertTrue(has("Going up"))
        shot("02-counter-reopened")
        app.descendants(matching: .any)["resetButton"].tap()
        sleep(1)
        XCTAssertTrue(has("Tap a button"), "Reset starts fresh")
        back()
    }

    func testTasksTypeAndAdd() {
        open("03-tasks")
        let belowBefore = below.frame.minY
        let field = app.textFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 5), "text field")
        field.tap()
        sleep(1)
        field.typeText("Ship it")
        usleep(500_000)
        XCTAssertEqual(field.value as? String, "Ship it", "typed text stays in order")
        shot("03-tasks-typing")
        tapLabel("Add")
        usleep(800_000)
        XCTAssertTrue(has("Ship it"), "new task added")
        let v = (field.value as? String) ?? ""
        XCTAssertTrue(v.isEmpty || v == "New task", "field cleared after Add, got '\(v)'")
        XCTAssertTrue(has("1 of 4 done"))
        XCTAssertGreaterThan(below.frame.minY, belowBefore + 10, "widget grew, text below moved down")
        shot("03-tasks-after-add")
    }

    func testSettingsSwitchAndSlider() {
        open("04-settings")
        XCTAssertTrue(has("Notifications are on."))
        // The switch and slider are iOS's own UISwitch / UISlider: drive them directly.
        app.switches.firstMatch.tap()
        usleep(500_000)
        XCTAssertTrue(has("Notifications are off."), "switch toggles")
        XCTAssertTrue(has("60%"))
        app.sliders.firstMatch.adjust(toNormalizedSliderPosition: 1.0)
        usleep(800_000)
        XCTAssertTrue(has("100%"), "badge follows slider")
        XCTAssertTrue(has("That's loud!"), "loud warning shows (widget grows)")
        shot("04-settings-after")
    }

    func testBrokenLoopDoesNotFreeze() {
        open("06-broken")
        XCTAssertFalse(has("Chart", 1))
        XCTAssertTrue(has("Everything else still works."))
        tapLabel("Run an endless loop")
        sleep(1)
        shot("06-broken-after-loop")
        back()
        open("01-hello")
        XCTAssertTrue(has("Welcome to Prism"), "app still responsive after endless loop")
        back()
    }

    /// Every basic block draws natively, and taps work (11-blocks: our own code, not the AI's).
    func testBasicBlocks() {
        open("11-blocks")
        XCTAssertTrue(has("What is a token?", 8))
        tapLabel("A small piece of text")
        XCTAssertTrue(has("Correct!"), "a tap shows the note")
        XCTAssertTrue(has("₹16,105"))
        shot("11-blocks-1")
        app.swipeUp(); sleep(1)
        XCTAssertTrue(has("iPhone 17"), "pager page")
        tapLabel("Show")
        XCTAssertTrue(has("Shown only when open. Later this opens with a native animation."), "collapse opens")
        shot("11-blocks-2")
        back()
    }

    /// The AI's chat parts, built by the part library from blocks (12-chat-parts).
    func testChatParts() {
        open("12-chat-parts")
        XCTAssertTrue(has("Split the text", 8), "Steps")
        tapLabel("A whole sentence")
        XCTAssertTrue(has("Not quite"), "Quiz: wrong answer note")
        tapLabel("Max")
        XCTAssertTrue(has("₹649"), "Choice changed the AI's state")
        shot("12-chat-parts-1")
        app.swipeUp(); sleep(1)
        tapLabel("How is a model trained?")
        XCTAssertTrue(app.descendants(matching: .any)["toast"].waitForExistence(timeout: 3), "FollowUps asks")
        shot("12-chat-parts-2")
        back()
    }

    /// A brand set by the app recolours every accent place, live (DESIGN-SYSTEM.md section 3).
    func testBrandColour() {
        open("12-chat-parts")
        XCTAssertTrue(has("Split the text", 8))
        app.descendants(matching: .any)["appearance"].tap()
        XCTAssertTrue(app.buttons["Azure"].waitForExistence(timeout: 3))
        app.buttons["Azure"].tap()
        sleep(1)
        tapLabel("A small piece of text")
        XCTAssertTrue(has("Correct!"), "still works after the brand change")
        shot("12-chat-parts-azure")
        // Mint: square corners and the app's own font (Avenir Next).
        app.descendants(matching: .any)["appearance"].tap()
        XCTAssertTrue(app.buttons["Mint"].waitForExistence(timeout: 3))
        app.buttons["Mint"].tap()
        sleep(1)
        XCTAssertTrue(has("Correct!"), "state kept across brand changes")
        shot("12-chat-parts-mint")
        back()
    }

    /// The appearance menu forces an example to dark (or light) without changing phone settings.
    func testAppearanceSwitch() {
        open("02-counter")
        XCTAssertTrue(has("Counter"))
        app.descendants(matching: .any)["appearance"].tap()
        XCTAssertTrue(app.buttons["Dark"].waitForExistence(timeout: 3))
        app.buttons["Dark"].tap()
        sleep(1)
        XCTAssertTrue(has("Tap a button"), "widget still drawn after switching")
        shot("02-counter-forced-dark")
        back()
    }

    /// Screenshots only (run in dark mode with SHOT_SUFFIX=dark).
    func testScreenshots() {
        shot("gallery")
        for (_, id) in Self.examples {
            open(id)
            sleep(1)
            shot(id)
            back()
        }
    }
}
