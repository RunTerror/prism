#!/usr/bin/env bash
# Packs the built SDK into release files. Run after `scripts/build-sdk.sh release`.
#
#   scripts/package-release.sh <version> <download URL base>
#   scripts/package-release.sh 0.1.0 https://github.com/RunTerror/prism/releases/download/v0.1.0
#
# Writes sdk/release/:
#   PrismSDK.xcframework.zip   iOS binary, uploaded to the GitHub release
#   Package.swift              SwiftPM manifest for the repo root on the release tag: the Prism
#                              wrapper from source + the binary from the URL above, with its checksum
#   maven/                     a Maven repository with io.github.runterror:prism-android and :prism-valdi,
#                              ready to upload (GitHub Packages, Maven Central) or to host as files
# Nothing is uploaded or published.
set -euo pipefail

VERSION="${1:?usage: package-release.sh <version> <download URL base>}"
URL_BASE="${2:?usage: package-release.sh <version> <download URL base>}"
SDK="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$SDK/release"
XCF="$SDK/dist/ios/PrismSDK.xcframework"
AAR="$SDK/dist/android/prism_sdk.aar"

[[ -d "$XCF" ]] || { echo "missing $XCF: run scripts/build-sdk.sh release" >&2; exit 1; }
[[ -f "$AAR" ]] || { echo "missing $AAR: run scripts/build-sdk.sh release" >&2; exit 1; }
rm -rf "$OUT" && mkdir -p "$OUT"

echo "== iOS: zip + checksum"
(cd "$(dirname "$XCF")" && ditto -c -k --sequesterRsrc --keepParent PrismSDK.xcframework "$OUT/PrismSDK.xcframework.zip")
CHECKSUM="$(swift package compute-checksum "$OUT/PrismSDK.xcframework.zip")"
cat > "$OUT/Package.swift" <<EOF
// swift-tools-version:5.9
// Prism $VERSION. Put this file at the repository root on the release tag, so apps can add
// .package(url: "<this repo>", from: "$VERSION") and use the product "Prism".
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
            url: "$URL_BASE/PrismSDK.xcframework.zip",
            checksum: "$CHECKSUM"
        ),
        .target(name: "Prism", dependencies: ["PrismSDK"], path: "sdk/ios/Sources/Prism"),
    ]
)
EOF

echo "== Android: Maven repository"
(cd "$SDK/android" && ./gradlew -q :prism-valdi:publish :prism:publish \
  -PprismVersion="$VERSION" -PprismRepo="file://$OUT/maven")

echo
echo "Done: $OUT"
du -sh "$OUT/PrismSDK.xcframework.zip" "$OUT/maven"
echo "iOS checksum: $CHECKSUM"
echo "Android: implementation(\"io.github.runterror:prism-android:$VERSION\")"
