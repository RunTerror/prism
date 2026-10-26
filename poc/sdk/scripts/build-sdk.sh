#!/bin/sh
# Builds the Prism mobile SDK:
#   1. embed the runtime and tokens from poc/core
#   2. valdi export ios      -> dist/ios/PrismSDK.xcframework   (+ header patch, Valdi beta-0.2.0 bug;
#                               symbol names stripped: -5 MB in apps)
#   3. valdi export android  -> dist/android/prism_sdk.aar
# Usage: scripts/build-sdk.sh [debug|release] [all|ios|android]   (default: release all)
#   Trying a change on one platform? Build only that one: scripts/build-sdk.sh release ios
set -e
CONFIG="${1:-release}"
PLATFORM="${2:-all}"
case "$PLATFORM" in all|ios|android) ;; *) echo "platform must be all, ios or android"; exit 1 ;; esac
HERE="$(cd "$(dirname "$0")" && pwd)"
WS="$(cd "$HERE/.." && pwd)"
DIST="$WS/dist"
OUT="$WS/out"
mkdir -p "$DIST/ios" "$DIST/android" "$OUT"

echo "== 1/4 embed runtime + tokens"
"$HERE/embed-core.sh"

cd "$WS"
# Xcode 27's libc++ turns a "selected platform is no longer supported" #warning into an error
# for Valdi's old iOS deployment target; silence that warning.
IOS_ARGS="--copt=-Wno-#warnings --host_copt=-Wno-#warnings"

if [ "$PLATFORM" != android ]; then
echo "== 2/4 export ios ($CONFIG)"
rm -rf "$OUT/PrismSDK.xcframework"
STAMP="$OUT/.ios-build-start"; touch "$STAMP"
valdi export ios --build_config "$CONFIG" --library //:prism_sdk_ios \
  --bazel_args="$IOS_ARGS" --output_path "$OUT/PrismSDK.xcframework" > "$OUT/export-ios.log" 2>&1 || true
if [ ! -d "$OUT/PrismSDK.xcframework" ]; then
  # valdi CLI 1.2.0 sometimes builds fine but fails to unzip/move the result; do it ourselves.
  [ "$CONFIG" = release ] && CFG=opt || CFG=fastbuild
  ZIP=$(ls "$WS"/bazel-out/*-$CFG/bin/prism_sdk_ios.xcframework.zip 2>/dev/null | head -1)
  # Only a package built during this run: an older one would hide a failed build (and ship old code).
  if [ ! -f "$ZIP" ] || [ ! "$ZIP" -nt "$STAMP" ] || grep -q "error TS\|ERROR:" "$OUT/export-ios.log"; then
    echo "iOS export failed (see $OUT/export-ios.log)"; grep -m3 "error TS\|ERROR:" "$OUT/export-ios.log"; exit 1
  fi
  (cd "$OUT" && unzip -q -o "$ZIP")
  chmod -R u+w "$OUT/PrismSDK.xcframework"
fi

echo "== 3/4 patch xcframework headers"
"$HERE/patch-xcframework.sh" "$OUT/PrismSDK.xcframework" "$WS"
rm -rf "$DIST/ios/PrismSDK.xcframework"
cp -R "$OUT/PrismSDK.xcframework" "$DIST/ios/PrismSDK.xcframework"
"$HERE/strip-ios.sh" "$DIST/ios/PrismSDK.xcframework"
fi

if [ "$PLATFORM" != ios ]; then
echo "== 4/4 export android ($CONFIG)"
rm -f "$OUT/prism_sdk.aar"
valdi export android --build_config "$CONFIG" --library //:prism_sdk_android \
  --output_path "$OUT/prism_sdk.aar" > "$OUT/export-android.log" 2>&1 || true
[ -f "$OUT/prism_sdk.aar" ] || { echo "Android export failed (see $OUT/export-android.log)"; exit 1; }
rm -f "$DIST/android/prism_sdk.aar"
cp "$OUT/prism_sdk.aar" "$DIST/android/prism_sdk.aar"
chmod u+w "$DIST/android/prism_sdk.aar"
fi

echo
echo "Done:"
du -sh "$DIST/ios/PrismSDK.xcframework" "$DIST/android/prism_sdk.aar" 2>/dev/null || true
