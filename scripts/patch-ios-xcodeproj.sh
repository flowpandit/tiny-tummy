#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PBXPROJ_PATH="$REPO_DIR/src-tauri/gen/apple/tiny-tummy.xcodeproj/project.pbxproj"

if [ ! -f "$PBXPROJ_PATH" ]; then
  echo "patch-ios-xcodeproj.sh: missing $PBXPROJ_PATH" >&2
  exit 1
fi

perl -0pi -e 's/CODE_SIGN_STYLE = Automatic;\n(\s+)ENABLE_BITCODE = NO;/CODE_SIGN_STYLE = Automatic;\n$1ENABLE_USER_SCRIPT_SANDBOXING = NO;\n$1ENABLE_BITCODE = NO;/g' "$PBXPROJ_PATH"

echo "Patched $PBXPROJ_PATH"
