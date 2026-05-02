#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PBXPROJ_PATH="$REPO_DIR/src-tauri/gen/apple/tiny-tummy.xcodeproj/project.pbxproj"
INFO_PLIST_PATH="$REPO_DIR/src-tauri/gen/apple/tiny-tummy_iOS/Info.plist"
LOCAL_NETWORK_REASON="Tiny Tummy connects to the Vite dev server on your Mac when running iOS development builds with hot reload."

if [ ! -f "$PBXPROJ_PATH" ]; then
  echo "patch-ios-xcodeproj.sh: missing $PBXPROJ_PATH" >&2
  exit 1
fi

perl -0pi -e 's/CODE_SIGN_STYLE = Automatic;\n(\s+)ENABLE_BITCODE = NO;/CODE_SIGN_STYLE = Automatic;\n$1ENABLE_USER_SCRIPT_SANDBOXING = NO;\n$1ENABLE_BITCODE = NO;/g' "$PBXPROJ_PATH"

if [ -f "$INFO_PLIST_PATH" ] && [ -x /usr/libexec/PlistBuddy ]; then
  if /usr/libexec/PlistBuddy -c "Print :NSLocalNetworkUsageDescription" "$INFO_PLIST_PATH" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :NSLocalNetworkUsageDescription $LOCAL_NETWORK_REASON" "$INFO_PLIST_PATH" >/dev/null
  else
    /usr/libexec/PlistBuddy -c "Add :NSLocalNetworkUsageDescription string $LOCAL_NETWORK_REASON" "$INFO_PLIST_PATH" >/dev/null
  fi
fi

echo "Patched $PBXPROJ_PATH"
