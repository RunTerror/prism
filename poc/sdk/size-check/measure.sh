#!/bin/sh
# How much does the Prism SDK add to an iOS app? Builds the same minimal SwiftUI app twice
# (Plain, and WithPrism showing one PrismWidget) in Release for a real iPhone (arm64), then prints
# the installed size (.app on disk) and the zipped size (close to the App Store download).
#   size-check/measure.sh        (needs dist/ios/PrismSDK.xcframework: scripts/build-sdk.sh)
set -e
cd "$(dirname "$0")"
xcodegen generate --quiet
for T in Plain WithPrism; do
  xcodebuild -project SizeCheck.xcodeproj -scheme $T -configuration Release -sdk iphoneos \
    -destination 'generic/platform=iOS' -derivedDataPath build build > build-$T.log 2>&1 \
    || { echo "$T build failed (see size-check/build-$T.log)"; exit 1; }
done
cd build/Build/Products/Release-iphoneos
for T in Plain WithPrism; do
  rm -f /tmp/prism-size-$T.zip
  zip -qr -9 /tmp/prism-size-$T.zip $T.app
  printf "%-10s installed %8s KB   download (zipped) %7s KB\n" $T "$(du -sk $T.app | cut -f1)" "$(du -k /tmp/prism-size-$T.zip | cut -f1)"
done
