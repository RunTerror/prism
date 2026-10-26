import XCTest
import UIKit
@testable import Prism

final class PrismEffectTests: XCTestCase {
    func testKnownTypes() {
        XCTAssertEqual(PrismEffect(type: "toast", value: "Saved"), .toast("Saved"))
        XCTAssertEqual(PrismEffect(type: "copy", value: "abc"), .copy("abc"))
        XCTAssertEqual(PrismEffect(type: "ask", value: "Why?"), .ask("Why?"))
        XCTAssertEqual(PrismEffect(type: "action", value: #"{"name":"send_email","args":{"to":"a@b.co","count":2}}"#),
                       .action(name: "send_email", args: ["to": "a@b.co", "count": 2]))
        XCTAssertEqual(PrismEffect(type: "action", value: "not json"), .other(type: "action", value: "not json"))
        XCTAssertEqual(PrismEffect(type: "open", value: "https://example.com/a?b=1"),
                       .open(URL(string: "https://example.com/a?b=1")!))
    }

    func testOpenWithoutURLFallsBackToOther() {
        XCTAssertEqual(PrismEffect(type: "open", value: "not a url"), .other(type: "open", value: "not a url"))
        XCTAssertEqual(PrismEffect(type: "open", value: ""), .other(type: "open", value: ""))
    }

    func testUnknownType() {
        let e = PrismEffect(type: "vibrate", value: "short")
        XCTAssertEqual(e, .other(type: "vibrate", value: "short"))
        XCTAssertEqual(e.type, "vibrate")
        XCTAssertEqual(e.value, "short")
    }

    func testTypeAndValueRoundTrip() {
        for (t, v) in [("toast", "x"), ("copy", "y"), ("ask", "z"), ("open", "https://a.b/")] {
            let e = PrismEffect(type: t, value: v)
            XCTAssertEqual(e.type, t)
            XCTAssertEqual(e.value, v)
        }
    }
}

final class PrismWidgetViewTests: XCTestCase {
    /// Envelopes from core/dist/examples.json (read from the source tree; the simulator
    /// can read the host file system).
    static let examples: [String: String] = {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("../../../../core/dist/examples.json").standardized
        guard let data = try? Data(contentsOf: url),
              let list = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return [:] }
        var out: [String: String] = [:]
        for item in list {
            guard let id = item["id"] as? String, let env = item["envelope"],
                  let envData = try? JSONSerialization.data(withJSONObject: env) else { continue }
            out[id] = String(data: envData, encoding: .utf8)
        }
        return out
    }()

    func envelope(_ id: String) throws -> String {
        try XCTUnwrap(Self.examples[id], "examples.json missing \(id)")
    }

    func testStartIsIdempotent() {
        Prism.start()
        let a = Prism.runtimeManager
        Prism.start()
        XCTAssertTrue(a === Prism.runtimeManager)
        XCTAssertNotNil(a.mainRuntime)
    }

    func testIntrinsicSizeHasNoWidth() throws {
        let view = PrismWidgetView(envelopeJSON: try envelope("02-counter"), instanceId: "t-size")
        XCTAssertEqual(view.intrinsicContentSize.width, UIView.noIntrinsicMetric)
        view.heightReported(120)
        XCTAssertEqual(view.intrinsicContentSize.height, 120)
        XCTAssertEqual(view.sizeThatFits(CGSize(width: 300, height: 10)), CGSize(width: 300, height: 120))
    }

    func testReportsHeightInWindow() throws {
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()

        let view = PrismWidgetView(envelopeJSON: try envelope("02-counter"), instanceId: "t-height")
        let got = expectation(description: "height")
        var heights: [CGFloat] = []
        view.onHeightChange = { h in
            heights.append(h)
            if heights.count == 1 { got.fulfill() }
        }
        view.translatesAutoresizingMaskIntoConstraints = false
        host.view.addSubview(view)
        NSLayoutConstraint.activate([
            view.leadingAnchor.constraint(equalTo: host.view.leadingAnchor, constant: 16),
            view.trailingAnchor.constraint(equalTo: host.view.trailingAnchor, constant: -16),
            view.topAnchor.constraint(equalTo: host.view.topAnchor, constant: 100),
        ])
        wait(for: [got], timeout: 10)
        XCTAssertGreaterThan(view.contentHeight, 50)
        XCTAssertEqual(view.intrinsicContentSize.height, view.contentHeight)
        host.view.layoutIfNeeded()
        XCTAssertEqual(view.frame.height, view.contentHeight, accuracy: 0.5, "Auto Layout uses the content height")
        XCTAssertEqual(view.frame.width, 390 - 32, accuracy: 0.5)
        window.isHidden = true
    }

    /// Regression: widgets made after another one went away must still draw and report
    /// their full height, also when they start 0 pt tall.
    func testManyWidgetsInARow() throws {
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()
        for (i, id) in ["02-counter", "02-counter", "03-tasks"].enumerated() {
            let view = PrismWidgetView(envelopeJSON: try envelope(id), instanceId: "t-row-\(i)")
            let got = expectation(description: "height \(i)")
            got.assertForOverFulfill = false
            view.onHeightChange = { _ in got.fulfill() }
            view.frame = CGRect(x: 0, y: 0, width: 390, height: 0)
            host.view.addSubview(view)
            wait(for: [got], timeout: 10)
            XCTAssertGreaterThan(view.contentHeight, 150, "\(id) #\(i) full height, not squeezed")
            view.removeFromSuperview()
        }
        window.isHidden = true
    }

    func testColorSchemeAndReloadBookkeeping() throws {
        let view = PrismWidgetView(envelopeJSON: try envelope("01-hello"), instanceId: "t-scheme")
        view.colorScheme = .dark
        view.applyIfNeeded()
        XCTAssertEqual(view.appliedColorScheme, "dark")
        XCTAssertEqual(view.loadCount, 1, "colour change redraws, does not reload")

        view.snapshot = PrismSnapshot(json: #"{"v":1,"key":"x","state":{},"tree":null,"height":10}"#)
        view.applyIfNeeded()
        XCTAssertEqual(view.loadCount, 1, "a snapshot alone does not reload")

        view.envelopeJSON = try envelope("02-counter")
        view.instanceId = "t-scheme-2"
        view.applyIfNeeded()
        XCTAssertEqual(view.loadCount, 2, "envelope + id change in one batch = one reload")
        XCTAssertEqual(view.loadedInstanceId, "t-scheme-2")

        view.colorScheme = .light
        view.applyIfNeeded()
        XCTAssertEqual(view.appliedColorScheme, "light")
    }

    func testSnapshotParsing() {
        let snap = PrismSnapshot(json: #"{"v":1,"key":"k","state":{"count":2},"tree":null,"height":120.5}"#)
        XCTAssertEqual(snap?.height, 120.5)
        XCTAssertNil(PrismSnapshot(json: "not json"))
        XCTAssertNil(PrismSnapshot(json: #"{"v":2,"height":1}"#), "unknown version")
        let data = try? JSONEncoder().encode(snap)
        XCTAssertEqual(data.flatMap { try? JSONDecoder().decode(PrismSnapshot.self, from: $0) }, snap, "Codable round trip")
    }

    /// The widget sends a snapshot; a widget made again from it starts at the right height at once,
    /// and carries on from the same state. A snapshot for another block is ignored.
    func testSnapshotBringsAWidgetBack() throws {
        let window = UIWindow(frame: CGRect(x: 0, y: 0, width: 390, height: 844))
        let host = UIViewController()
        window.rootViewController = host
        window.makeKeyAndVisible()

        let first = PrismWidgetView(envelopeJSON: try envelope("02-counter"), instanceId: "t-snap-1")
        var last: PrismSnapshot?
        let got = expectation(description: "snapshot")
        got.assertForOverFulfill = false
        first.onSnapshot = { last = $0; if $0.height > 0 { got.fulfill() } }
        first.frame = CGRect(x: 0, y: 0, width: 390, height: 0)
        host.view.addSubview(first)
        wait(for: [got], timeout: 10)
        let snap = try XCTUnwrap(last)
        XCTAssertEqual(snap.height, first.contentHeight, accuracy: 0.5)
        first.removeFromSuperview()

        // Made again (a lazy list scrolled back): full height before any layout or sandbox answer.
        let again = PrismWidgetView(envelopeJSON: try envelope("02-counter"), instanceId: "t-snap-2", snapshot: snap)
        XCTAssertEqual(again.contentHeight, snap.height, "starts at the saved height")
        XCTAssertEqual(again.intrinsicContentSize.height, snap.height)
        var againSnap: PrismSnapshot?
        let loaded = expectation(description: "loaded again")
        loaded.assertForOverFulfill = false
        again.onSnapshot = { againSnap = $0; loaded.fulfill() }
        again.frame = CGRect(x: 0, y: 0, width: 390, height: snap.height)
        host.view.addSubview(again)
        wait(for: [loaded], timeout: 10)
        XCTAssertEqual(try state(againSnap), try state(snap), "same state after the reload")
        again.removeFromSuperview()

        // The same snapshot on another block: ignored (that block starts fresh at 0).
        let other = PrismWidgetView(envelopeJSON: try envelope("01-hello"), instanceId: "t-snap-3", snapshot: snap)
        XCTAssertEqual(other.contentHeight, snap.height, "height is a hint until the block draws")
        var otherSnap: PrismSnapshot?
        let drew = expectation(description: "other drew")
        drew.assertForOverFulfill = false
        other.onSnapshot = { otherSnap = $0; drew.fulfill() }
        other.frame = CGRect(x: 0, y: 0, width: 390, height: 0)
        host.view.addSubview(other)
        wait(for: [drew], timeout: 10)
        XCTAssertNotEqual(try state(otherSnap), try state(snap), "another block's state was not used")
        window.isHidden = true
    }

    private func state(_ snap: PrismSnapshot?) throws -> String {
        let s = try XCTUnwrap(snap)
        let obj = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(s.json.utf8)) as? [String: Any])
        let data = try JSONSerialization.data(withJSONObject: obj["state"] ?? [:], options: .sortedKeys)
        return String(decoding: data, as: UTF8.self)
    }

    func testDeallocates() throws {
        weak var weakView: PrismWidgetView?
        autoreleasepool {
            let view = PrismWidgetView(envelopeJSON: try! envelope("01-hello"), instanceId: "t-dealloc")
            view.onHeightChange = { _ in }
            weakView = view
        }
        XCTAssertNil(weakView, "no retain cycle through callbacks")
    }
}
