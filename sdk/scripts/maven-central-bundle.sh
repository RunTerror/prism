#!/usr/bin/env bash
# Makes the Android packages ready for Maven Central: one signed zip to upload.
# Run after `scripts/build-sdk.sh release android`.
#
#   scripts/maven-central-bundle.sh <version> <GPG key id>
#   scripts/maven-central-bundle.sh 0.1.0 BBCCECA31F4FCC7EA619F57BDC6C8AE14D51C1B4
#
# Writes sdk/release/central/prism-android-<version>.zip with io.github.runterror:prism-android
# and :prism-valdi: each file with its .asc signature and .md5/.sha1 checksums, plus sources and
# docs jars. gpg asks for the key's passphrase (pinentry-mac shows a window).
#
# Then upload it: central.sonatype.com -> Publish Component -> the zip -> Publish.
# Nothing is uploaded here. A published version can never be changed or removed.
set -euo pipefail

VERSION="${1:?usage: maven-central-bundle.sh <version> <GPG key id>}"
KEY="${2:?usage: maven-central-bundle.sh <version> <GPG key id>}"
SDK="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$SDK/release/central"
REPO="$OUT/maven"

[[ -f "$SDK/dist/android/prism_sdk.aar" ]] || { echo "missing sdk/dist/android/prism_sdk.aar: run scripts/build-sdk.sh release android" >&2; exit 1; }
rm -rf "$OUT" && mkdir -p "$OUT"

echo "== Maven repository"
(cd "$SDK/android" && ./gradlew -q :prism-valdi:publish :prism:publish \
  -PprismVersion="$VERSION" -PprismRepo="file://$REPO")

# Maven Central builds its own maven-metadata.xml; uploaded ones are rejected.
find "$REPO" -name "maven-metadata*" -delete

echo "== sign every package file with $KEY"
while IFS= read -r f; do
  gpg --yes --quiet --armor --detach-sign --local-user "$KEY" --output "$f.asc" "$f"
done < <(find "$REPO" -type f \( -name "*.aar" -o -name "*.jar" -o -name "*.pom" -o -name "*.module" \))

echo "== check: every file signed"
missing=0
while IFS= read -r f; do
  [[ -f "$f.asc" ]] || { echo "  not signed: ${f#$REPO/}"; missing=1; }
done < <(find "$REPO" -type f \( -name "*.aar" -o -name "*.jar" -o -name "*.pom" -o -name "*.module" \))
[[ $missing == 0 ]] || { echo "some files are not signed" >&2; exit 1; }

ZIP="$OUT/prism-android-$VERSION.zip"
(cd "$REPO" && zip -qr "$ZIP" io)
echo
echo "Done: $ZIP ($(du -h "$ZIP" | cut -f1))"
(cd "$REPO" && find io -type f -name "*.pom" -o -type f -name "*.aar" | sed 's/^/  /')
echo "Upload: central.sonatype.com -> Publish Component -> this zip"
