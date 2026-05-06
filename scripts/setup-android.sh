#!/bin/bash
# Run this AFTER 'cargo tauri android init' to apply custom Android config.
# Usage: ./scripts/setup-android.sh

set -e

ANDROID_DIR="src-tauri/gen/android"
RES_DIR="$ANDROID_DIR/app/src/main/res"
JAVA_DIR="$ANDROID_DIR/app/src/main/java/com/nikhilmehral/tinytummy"
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle.kts"
ICON_MANIFEST="src-tauri/icons/icon-manifest.json"
TMP_ICON_DIR="/tmp/tiny-tummy-android-icons"
BILLING_DEPENDENCY='implementation("com.android.billingclient:billing-ktx:7.1.1")'

warn_if_java_is_not_17() {
  if ! command -v java >/dev/null 2>&1; then
    echo "Warning: java was not found in PATH. Install JDK 17 before running Gradle Android builds."
    echo "         On macOS, set it with: export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
    return
  fi

  JAVA_VERSION_LINE=$(java -version 2>&1 | head -n 1 || true)
  JAVA_VERSION=$(printf "%s" "$JAVA_VERSION_LINE" | sed -n 's/.*version "\([^"]*\)".*/\1/p')
  if [ -z "$JAVA_VERSION" ]; then
    JAVA_VERSION=$(printf "%s" "$JAVA_VERSION_LINE" | awk '{print $2}' | tr -d '"')
  fi

  JAVA_MAJOR=${JAVA_VERSION%%.*}
  if [ "$JAVA_MAJOR" = "1" ]; then
    JAVA_REST=${JAVA_VERSION#1.}
    JAVA_MAJOR=${JAVA_REST%%.*}
  fi

  if [ "$JAVA_MAJOR" != "17" ]; then
    echo "Warning: Android Gradle builds for this project should use JDK 17."
    echo "         Detected: ${JAVA_VERSION_LINE:-unknown java version}"
    echo "         On macOS, set it with: export JAVA_HOME=\$(/usr/libexec/java_home -v 17)"
    echo "         Then rerun:"
    echo "           ./scripts/setup-android.sh"
    echo "           cd src-tauri/gen/android"
    echo "           ./gradlew :app:compileDebugKotlin"
  else
    echo "  ✓ Java 17 detected ($JAVA_VERSION)"
  fi
}

if [ ! -d "$ANDROID_DIR" ]; then
  echo "Error: $ANDROID_DIR not found. Run 'cargo tauri android init' first."
  exit 1
fi

if [ ! -f "$ICON_MANIFEST" ]; then
  echo "Error: $ICON_MANIFEST not found."
  exit 1
fi

if [ ! -f "$BUILD_GRADLE" ]; then
  echo "Error: $BUILD_GRADLE not found."
  exit 1
fi

warn_if_java_is_not_17

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
mkdir -p "$JAVA_DIR"
cp src-tauri/android-templates/MainActivity.kt "$JAVA_DIR/MainActivity.kt"
echo "  ✓ MainActivity.kt (status bar icon control)"

# 2. Copy StatusBarPlugin.kt (Tauri plugin for JS→Kotlin status bar bridge)
cp src-tauri/android-templates/StatusBarPlugin.kt "$JAVA_DIR/StatusBarPlugin.kt"
echo "  ✓ StatusBarPlugin.kt (theme bridge)"

# 3. Copy DownloadsPlugin.kt (Tauri plugin for native Downloads saves)
cp src-tauri/android-templates/DownloadsPlugin.kt "$JAVA_DIR/DownloadsPlugin.kt"
echo "  ✓ DownloadsPlugin.kt (Downloads save bridge)"

# 4. Copy BillingPlugin.kt (Tauri plugin for Google Play Billing bridge)
cp src-tauri/android-templates/BillingPlugin.kt "$JAVA_DIR/BillingPlugin.kt"
echo "  ✓ BillingPlugin.kt (Google Play Billing bridge)"

# 5. Ensure Google Play Billing dependency is reproducible in generated Gradle
if ! grep -q 'com.android.billingclient:billing-ktx' "$BUILD_GRADLE"; then
  perl -0pi -e "s/dependencies \{\n/dependencies {\n    $BILLING_DEPENDENCY\n/" "$BUILD_GRADLE"
fi
echo "  ✓ billing-ktx dependency"

# 6. Copy custom app icons
cp -r "$TMP_ICON_DIR/android/"* "$RES_DIR/"
echo "  ✓ App icons"

echo ""
echo "Done! You can now build with: cargo tauri android build --apk"
