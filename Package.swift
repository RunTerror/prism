// swift-tools-version:5.9
// Prism 0.1.0. Put this file at the repository root on the release tag, so apps can add
// .package(url: "<this repo>", from: "0.1.0") and use the product "Prism".
import PackageDescription

let package = Package(
    name: "Prism",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "Prism", targets: ["Prism"]),
    ],
    targets: [
        .binaryTarget(
            name: "PrismSDK",
            url: "https://github.com/RunTerror/prism/releases/download/v0.1.0/PrismSDK.xcframework.zip",
            checksum: "5f2039f8fafedb479328cdaaa16b5dd8d52d1aafd2dfe2226d4460a5017a589b"
        ),
        .target(name: "Prism", dependencies: ["PrismSDK"], path: "sdk/ios/Sources/Prism"),
    ]
)
