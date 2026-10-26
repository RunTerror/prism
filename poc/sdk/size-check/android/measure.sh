#!/bin/sh
# How much does the Prism SDK add to an Android app? Builds two minimal apps (plain, and one with a
# PrismWidgetView) as release APKs for arm64 (what a modern phone downloads) with R8 shrinking on.
#   size-check/android/measure.sh   (needs dist/android/prism_sdk.aar: scripts/build-sdk.sh)
set -e
cd "$(dirname "$0")"
./gradlew :plain:assembleRelease :withprism:assembleRelease --console=plain -q > build.log 2>&1 \
  || { echo "build failed (see size-check/android/build.log)"; exit 1; }
for M in plain withprism; do
  APK=$(find $M/build/outputs/apk/release -name "*.apk" | head -1)
  SO=$(unzip -l "$APK" | awk '/libprism_sdk.so/ {print $1}')
  printf "%-10s download (apk) %7s KB   installed (apk + unpacked native lib) %7s KB\n" \
    $M $(($(stat -f %z "$APK") / 1024)) $((($(stat -f %z "$APK") + ${SO:-0}) / 1024))
done
