// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Prism",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "Prism", targets: ["Prism"]),
    ],
    targets: [
        // Built by sdk/scripts/build-sdk.sh (Valdi export). Not committed.
        .binaryTarget(name: "PrismSDK", path: "../dist/ios/PrismSDK.xcframework"),
        .target(name: "Prism", dependencies: ["PrismSDK"]),
        .testTarget(name: "PrismTests", dependencies: ["Prism"]),
    ]
)
