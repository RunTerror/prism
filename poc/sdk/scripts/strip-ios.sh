#!/bin/sh
# Removes local symbol names from the PrismSDK binary in every slice of the xcframework.
# Release apps don't need them (crash reports use dSYMs). Saves about 5 MB installed / 0.8 MB download.
# The framework is not signed here; host apps sign it when they embed it.
# Usage: strip-ios.sh <path/to/PrismSDK.xcframework>
set -e
XC="$1"
[ -d "$XC" ] || { echo "usage: $0 <PrismSDK.xcframework>"; exit 1; }
for BIN in "$XC"/*/PrismSDK.framework/PrismSDK; do
  BEFORE=$(stat -f %z "$BIN")
  strip -x "$BIN"
  echo "stripped $(basename "$(dirname "$(dirname "$BIN")")"): $((BEFORE / 1024 / 1024)) MB -> $(($(stat -f %z "$BIN") / 1024 / 1024)) MB"
done
