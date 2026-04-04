#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
APPLE_DIR="$REPO_DIR/src-tauri/gen/apple"
TAURI_DIR="$REPO_DIR/src-tauri"

CONFIGURATION_VALUE=${CONFIGURATION:-}
SDKROOT_VALUE=${SDKROOT:-}
ARCH_VALUE=${NATIVE_ARCH_ACTUAL:-${CURRENT_ARCH:-${ARCHS:-}}}

usage() {
  echo "Usage: $0 [--configuration debug|release] [--sdk-root <path>] [--arch arm64]" >&2
}

fail() {
  echo "build-rust-ios.sh: $1" >&2
  exit 1
}

command_path() {
  command -v "$1" 2>/dev/null || true
}

append_path_if_dir() {
  if [ -d "$1" ]; then
    PATH="$1:$PATH"
  fi
}

pick_node_bin() {
  local_node=$(command_path node)
  if [ -n "$local_node" ]; then
    dirname "$local_node"
    return 0
  fi

  if [ -n "${HOME:-}" ] && [ -d "$HOME/.nvm/versions/node" ]; then
    for candidate in "$HOME"/.nvm/versions/node/*/bin; do
      if [ -x "$candidate/node" ]; then
        echo "$candidate"
        return 0
      fi
    done
  fi

  return 1
}

normalize_configuration() {
  value=$(printf "%s" "$1" | tr '[:upper:]' '[:lower:]')
  case "$value" in
    debug|release)
      echo "$value"
      ;;
    "")
      echo "debug"
      ;;
    *)
      fail "unsupported configuration '$1'"
      ;;
  esac
}

select_arch() {
  raw_archs=$1

  for arch in $raw_archs; do
    case "$arch" in
      arm64)
        echo "$arch"
        return 0
        ;;
    esac
  done

  echo ""
}

resolve_sdkroot() {
  if [ -n "$SDKROOT_VALUE" ]; then
    echo "$SDKROOT_VALUE"
    return 0
  fi

  if [ "$ARCH_VALUE" = "arm64" ]; then
    xcrun --sdk iphonesimulator --show-sdk-path
    return 0
  fi

  xcrun --sdk iphonesimulator --show-sdk-path
}

while [ $# -gt 0 ]; do
  case "$1" in
    --configuration)
      [ $# -ge 2 ] || fail "--configuration requires a value"
      CONFIGURATION_VALUE=$2
      shift 2
      ;;
    --sdk-root)
      [ $# -ge 2 ] || fail "--sdk-root requires a value"
      SDKROOT_VALUE=$2
      shift 2
      ;;
    --arch)
      [ $# -ge 2 ] || fail "--arch requires a value"
      ARCH_VALUE=$2
      shift 2
      ;;
    *)
      usage
      fail "unknown argument '$1'"
      ;;
  esac
done

CONFIGURATION_VALUE=$(normalize_configuration "$CONFIGURATION_VALUE")
ARCH_VALUE=$(select_arch "$ARCH_VALUE")
[ -n "$ARCH_VALUE" ] || fail "could not determine an arm64 iOS architecture from ARCHS/CURRENT_ARCH/NATIVE_ARCH_ACTUAL"

append_path_if_dir "/opt/homebrew/bin"
append_path_if_dir "${HOME:-}/.cargo/bin"

NODE_BIN=$(pick_node_bin || true)
if [ -n "$NODE_BIN" ]; then
  append_path_if_dir "$NODE_BIN"
fi

export PATH
export CARGO_HOME="${CARGO_HOME:-${HOME:-}/.cargo}"
export RUSTUP_HOME="${RUSTUP_HOME:-${HOME:-}/.rustup}"

XCRUN_BIN=$(command_path xcrun)
[ -n "$XCRUN_BIN" ] || fail "xcrun is required but was not found in PATH"

SDKROOT_VALUE=$(resolve_sdkroot)

case "$SDKROOT_VALUE" in
  *iPhoneSimulator*|*iphonesimulator*)
    RUST_TARGET="aarch64-apple-ios-sim"
    ARCH_DIR="arm64"
    ;;
  *iPhoneOS*|*iphoneos*)
    RUST_TARGET="aarch64-apple-ios"
    ARCH_DIR="arm64"
    ;;
  *)
    fail "unsupported SDKROOT '$SDKROOT_VALUE'"
    ;;
esac

CARGO_BIN=$(command_path cargo)
[ -n "$CARGO_BIN" ] || fail "cargo is required but was not found in PATH"

OUTPUT_DIR="$APPLE_DIR/Externals/$ARCH_DIR/$CONFIGURATION_VALUE"
mkdir -p "$OUTPUT_DIR"

BUILD_ARGS="--manifest-path $TAURI_DIR/Cargo.toml --target $RUST_TARGET"
if [ "$CONFIGURATION_VALUE" = "release" ]; then
  # shellcheck disable=SC2086
  "$CARGO_BIN" build $BUILD_ARGS --release
else
  # shellcheck disable=SC2086
  "$CARGO_BIN" build $BUILD_ARGS
fi

SOURCE_LIB="$TAURI_DIR/target/$RUST_TARGET/$CONFIGURATION_VALUE/libtiny_tummy_lib.a"
[ -f "$SOURCE_LIB" ] || fail "expected Rust static library was not produced at '$SOURCE_LIB'"

cp -f "$SOURCE_LIB" "$OUTPUT_DIR/libapp.a"
