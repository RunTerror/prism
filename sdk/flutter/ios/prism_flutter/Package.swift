// swift-tools-version: 5.9
import Foundation
import PackageDescription

// The Prism iOS wrapper (sdk/ios) is used by path. Flutter reaches this plugin through a
// symlink, so the path is worked out from this file's real location.
let pluginDir = URL(fileURLWithPath: #filePath).resolvingSymlinksInPath().deletingLastPathComponent()
let prismPath = pluginDir.appendingPathComponent("../../../ios").standardizedFileURL.path

let package = Package(
    name: "prism_flutter",
    platforms: [.iOS("15.0")],
    products: [
        .library(name: "prism-flutter", targets: ["prism_flutter"]),
    ],
    dependencies: [
        .package(name: "FlutterFramework", path: "../FlutterFramework"),
        .package(path: prismPath),
    ],
    targets: [
        .target(
            name: "prism_flutter",
            dependencies: [
                .product(name: "FlutterFramework", package: "FlutterFramework"),
                .product(name: "Prism", package: "ios"),
            ]
        ),
    ]
)
