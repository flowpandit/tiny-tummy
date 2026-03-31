#!/bin/bash
# Run this AFTER 'cargo tauri android init' to apply custom Android config.
# Usage: ./scripts/setup-android.sh

set -e

ANDROID_DIR="src-tauri/gen/android"
RES_DIR="$ANDROID_DIR/app/src/main/res"
JAVA_DIR="$ANDROID_DIR/app/src/main/java/com/nikhilmehral/tinytummy"
ICON_MANIFEST="src-tauri/icons/icon-manifest.json"
TMP_ICON_DIR="/tmp/tiny-tummy-android-icons"

if [ ! -d "$ANDROID_DIR" ]; then
  echo "Error: $ANDROID_DIR not found. Run 'cargo tauri android init' first."
  exit 1
fi

if [ ! -f "$ICON_MANIFEST" ]; then
  echo "Error: $ICON_MANIFEST not found."
  exit 1
fi

echo "Applying custom Android configuration..."

# 0. Regenerate Android icon pack from the manifest, then copy it into the
# generated Android project so icon output stays consistent across machines.
rm -rf "$TMP_ICON_DIR"
mkdir -p "$TMP_ICON_DIR"
npx tauri icon "$ICON_MANIFEST" -o "$TMP_ICON_DIR"

if [ ! -d "$TMP_ICON_DIR/android" ]; then
  echo "Error: Android icon output was not generated in $TMP_ICON_DIR/android."
  exit 1
fi

# 1. Copy custom MainActivity.kt (manual edge-to-edge + status bar control)
cp src-tauri/android-templates/MainActivity.kt "$JAVA_DIR/MainActivity.kt"
echo "  ✓ MainActivity.kt (status bar icon control)"

# 2. Copy StatusBarPlugin.kt (Tauri plugin for JS→Kotlin status bar bridge)
cp src-tauri/android-templates/StatusBarPlugin.kt "$JAVA_DIR/StatusBarPlugin.kt"
echo "  ✓ StatusBarPlugin.kt (theme bridge)"

# 3. Copy DownloadsPlugin.kt (Tauri plugin for native Downloads saves)
cp src-tauri/android-templates/DownloadsPlugin.kt "$JAVA_DIR/DownloadsPlugin.kt"
echo "  ✓ DownloadsPlugin.kt (Downloads save bridge)"

# 4. Copy custom app icons
cp -r "$TMP_ICON_DIR/android/"* "$RES_DIR/"
echo "  ✓ App icons"

echo ""
echo "Done! You can now build with: cargo tauri android build --apk"
