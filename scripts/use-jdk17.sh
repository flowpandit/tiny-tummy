# Source this file to use JDK 17 for Android/Gradle commands in the current shell.
# Usage: source scripts/use-jdk17.sh

if [ "$(uname -s)" != "Darwin" ]; then
  echo "JDK 17 shell setup uses macOS /usr/libexec/java_home."
  return 1 2>/dev/null || exit 1
fi

if [ ! -x /usr/libexec/java_home ]; then
  echo "JDK 17 shell setup requires /usr/libexec/java_home."
  return 1 2>/dev/null || exit 1
fi

tiny_tummy_java_major_version() {
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

tiny_tummy_is_jdk17_home() {
  local java_home="$1"
  local version_line

  if [ ! -x "$java_home/bin/java" ]; then
    return 1
  fi

  version_line=$("$java_home/bin/java" -version 2>&1 | sed -n '1p' || true)
  [ "$(tiny_tummy_java_major_version "$version_line")" = "17" ]
}

tiny_tummy_find_jdk17() {
  local candidate

  candidate=$(/usr/libexec/java_home -v 17 2>/dev/null || true)
  if [ -n "$candidate" ] && tiny_tummy_is_jdk17_home "$candidate"; then
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
    if tiny_tummy_is_jdk17_home "$candidate"; then
      printf "%s" "$candidate"
      return 0
    fi
  done

  return 1
}

TINY_TUMMY_JDK17_HOME=$(tiny_tummy_find_jdk17 || true)

if [ -z "$TINY_TUMMY_JDK17_HOME" ]; then
  echo "JDK 17 was not found. /usr/libexec/java_home -v 17 may return a newer JDK when 17 is missing."
  echo "Run: ./scripts/setup-macos-jdk17.sh"
  return 1 2>/dev/null || exit 1
fi

export JAVA_HOME="$TINY_TUMMY_JDK17_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

java -version

unset TINY_TUMMY_JDK17_HOME
