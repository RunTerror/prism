#!/bin/sh
# Workaround for a Valdi beta-0.2.0 export bug: SCValdiDrawingModuleFactory.h imports
# <PrismSDK/SCCDrawingTypes.h>, but `valdi export ios` does not ship that generated header.
# Copies it from bazel-out into every slice of the xcframework, rewriting
# <valdi_core/...> imports to <PrismSDK/...>. Safe to run twice; a no-op if the header exists.
# Usage: patch-xcframework.sh <path/to/PrismSDK.xcframework> <path/to/valdi workspace>
set -e
XC="$1"; WS="$2"
[ -d "$XC" ] && [ -d "$WS" ] || { echo "usage: $0 <PrismSDK.xcframework> <valdi workspace>"; exit 1; }
NEEDED=$(grep -l "PrismSDK/SCCDrawingTypes.h" "$XC"/*/PrismSDK.framework/Headers/*.h 2>/dev/null | head -1 || true)
if [ -z "$NEEDED" ]; then echo "no header references SCCDrawingTypes.h; nothing to patch"; exit 0; fi
SRC=$(find -L "$WS/bazel-out/" -path "*drawing/ios/*/src/SCCDrawingTypes/SCCDrawingTypes.h" 2>/dev/null | head -1)
[ -n "$SRC" ] || { echo "SCCDrawingTypes.h not found in $WS/bazel-out"; exit 1; }
for H in "$XC"/*/PrismSDK.framework/Headers; do
  sed 's#<valdi_core/#<PrismSDK/#g' "$SRC" > "$H/SCCDrawingTypes.h"
  echo "patched $H"
done
