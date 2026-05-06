#!/bin/bash
# Verify the generated Android project compiles Kotlin with JDK 17.
# Usage: ./scripts/verify-android-kotlin.sh

set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ANDROID_DIR="$REPO_ROOT/src-tauri/gen/android"

fail_jdk17() {
  echo "Android verification requires JDK 17. Run: source scripts/use-jdk17.sh"
  if [ -n "${1:-}" ]; then
    echo "Detected: $1"
  fi
  exit 1
}

java_major_version() {
  local version_line="$1"
  local version
  local major

  version=$(printf "%s" "$version_line" | sed -n 's/.*version "\([^"]*\)".*/\1/p')
  if [ -z "$version" ]; then
    version=$(printf "%s" "$version_line" | awk '{print $2}' | tr -d '"')
  fi

  major=${version%%.*}
  if [ "$major" = "1" ]; then
    version=${version#1.}
    major=${version%%.*}
  fi

  printf "%s" "$major"
}

if [ -z "${JAVA_HOME:-}" ]; then
  fail_jdk17 "JAVA_HOME is not set"
fi

if [ ! -x "$JAVA_HOME/bin/java" ]; then
  fail_jdk17 "JAVA_HOME does not contain bin/java ($JAVA_HOME)"
fi

JAVA_VERSION_LINE=$("$JAVA_HOME/bin/java" -version 2>&1 | sed -n '1p' || true)
JAVA_MAJOR=$(java_major_version "$JAVA_VERSION_LINE")

if [ "$JAVA_MAJOR" != "17" ]; then
  fail_jdk17 "${JAVA_VERSION_LINE:-unknown java version}"
fi

export PATH="$JAVA_HOME/bin:$PATH"

echo "Java 17 detected for Android verification:"
"$JAVA_HOME/bin/java" -version

cd "$REPO_ROOT"
./scripts/setup-android.sh

cd "$ANDROID_DIR"
./gradlew :app:compileUniversalDebugKotlin
