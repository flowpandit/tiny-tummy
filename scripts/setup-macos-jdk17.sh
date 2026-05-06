#!/bin/bash
# Install and verify JDK 17 for Tiny Tummy Android/Gradle builds on macOS.
# Usage: ./scripts/setup-macos-jdk17.sh

set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "Error: scripts/setup-macos-jdk17.sh only supports macOS."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Error: Homebrew is required to install Eclipse Temurin 17."
  echo "Install Homebrew from https://brew.sh, then rerun this script."
  exit 1
fi

find_jdk17() {
  local candidate

  candidate=$(/usr/libexec/java_home -v 17 2>/dev/null || true)
  if [ -n "$candidate" ] && is_jdk17_home "$candidate"; then
    printf "%s" "$candidate"
    return 0
  fi

  for candidate in \
    /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home \
    /Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home \
    /Library/Java/JavaVirtualMachines/*.jdk/Contents/Home \
    /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
    /usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
  do
    if is_jdk17_home "$candidate"; then
      printf "%s" "$candidate"
      return 0
    fi
  done

  return 1
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

is_jdk17_home() {
  local java_home="$1"
  local version_line

  if [ ! -x "$java_home/bin/java" ]; then
    return 1
  fi

  version_line=$("$java_home/bin/java" -version 2>&1 | sed -n '1p' || true)
  [ "$(java_major_version "$version_line")" = "17" ]
}

JAVA_HOME_CANDIDATE=$(/usr/libexec/java_home -v 17 2>/dev/null || true)
if [ -n "$JAVA_HOME_CANDIDATE" ] && ! is_jdk17_home "$JAVA_HOME_CANDIDATE"; then
  echo "/usr/libexec/java_home -v 17 returned a non-17 JDK:"
  echo "  $JAVA_HOME_CANDIDATE"
  "$JAVA_HOME_CANDIDATE/bin/java" -version
  echo "Treating JDK 17 as missing."
  echo ""
fi

JDK17_HOME=$(find_jdk17 || true)

if [ -z "$JDK17_HOME" ]; then
  echo "JDK 17 was not found by /usr/libexec/java_home -v 17."
  echo "Installing Eclipse Temurin 17 with Homebrew..."
  brew install --cask temurin@17
fi

JDK17_HOME=$(find_jdk17 || true)

if [ -z "$JDK17_HOME" ]; then
  echo "Error: JDK 17 still could not be found after installation."
  echo "Expected /usr/libexec/java_home -v 17 to return a path."
  echo "Try opening a new terminal, then run:"
  echo "  /usr/libexec/java_home -V"
  exit 1
fi

export JAVA_HOME="$JDK17_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

JAVA_VERSION_LINE=$(java -version 2>&1 | sed -n '1p' || true)
JAVA_MAJOR=$(java_major_version "$JAVA_VERSION_LINE")

if [ "$JAVA_MAJOR" != "17" ]; then
  echo "Error: JDK 17 was found at $JAVA_HOME, but java -version did not report 17."
  echo "Detected: ${JAVA_VERSION_LINE:-unknown java version}"
  exit 1
fi

echo "JDK 17 is available for Android builds."
echo "JAVA_HOME=$JAVA_HOME"
echo ""
echo "For your current shell, run:"
echo "  source scripts/use-jdk17.sh"
echo ""
echo "Or export manually:"
echo '  export JAVA_HOME=$(/usr/libexec/java_home -v 17)'
echo '  export PATH="$JAVA_HOME/bin:$PATH"'
echo ""
java -version
