#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
APPLE_DIR="$REPO_DIR/src-tauri/gen/apple"
TAURI_DIR="$REPO_DIR/src-tauri"
IOS_INFO_PLIST="$APPLE_DIR/tiny-tummy_iOS/Info.plist"
IOS_PLUGIN_TEMPLATE="$TAURI_DIR/ios-templates/BillingPlugin.swift"
IOS_PLUGIN_TARGET="$APPLE_DIR/Sources/tiny-tummy/BillingPlugin.swift"
LOCAL_NETWORK_REASON="Tiny Tummy connects to the Vite dev server on your Mac when running iOS development builds with hot reload."

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

copy_frontend_assets() {
  npm_bin=$(command_path npm)
  [ -n "$npm_bin" ] || fail "npm is required to build the frontend but was not found in PATH"

  (cd "$REPO_DIR" && "$npm_bin" run build)

  [ -f "$REPO_DIR/dist/index.html" ] || fail "expected frontend build output was not produced at '$REPO_DIR/dist/index.html'"

  rm -rf "$APPLE_DIR/assets"
  mkdir -p "$APPLE_DIR/assets"
  cp -R "$REPO_DIR/dist/." "$APPLE_DIR/assets/"

  # When Xcode decides the folder-reference resources are already up to date,
  # the app bundle can keep an older hashed index.html/asset pair and boot to a
  # blank screen. Mirror the freshly built frontend directly into the active
  # resources output as well so device builds always launch the current bundle.
  if [ -n "${TARGET_BUILD_DIR:-}" ] && [ -n "${UNLOCALIZED_RESOURCES_FOLDER_PATH:-}" ]; then
    BUNDLE_ASSETS_DIR="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/assets"
    rm -rf "$BUNDLE_ASSETS_DIR"
    mkdir -p "$BUNDLE_ASSETS_DIR"
    cp -R "$REPO_DIR/dist/." "$BUNDLE_ASSETS_DIR/"
  fi
}

sync_generated_ios_info_plist() {
  [ -f "$IOS_INFO_PLIST" ] || return 0
  [ -x /usr/libexec/PlistBuddy ] || return 0

  if /usr/libexec/PlistBuddy -c "Print :NSLocalNetworkUsageDescription" "$IOS_INFO_PLIST" >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :NSLocalNetworkUsageDescription $LOCAL_NETWORK_REASON" "$IOS_INFO_PLIST" >/dev/null
  else
    /usr/libexec/PlistBuddy -c "Add :NSLocalNetworkUsageDescription string $LOCAL_NETWORK_REASON" "$IOS_INFO_PLIST" >/dev/null
  fi
}

sync_generated_ios_plugin_sources() {
  [ -f "$IOS_PLUGIN_TEMPLATE" ] || return 0

  mkdir -p "$(dirname "$IOS_PLUGIN_TARGET")"
  cp -f "$IOS_PLUGIN_TEMPLATE" "$IOS_PLUGIN_TARGET"
}

clean_tauri_crate_artifacts() {
  target_dir="$TAURI_DIR/target/$RUST_TARGET/$CONFIGURATION_VALUE"
  [ -d "$target_dir" ] || return 0

  rm -f "$target_dir/libtiny_tummy_lib.a" "$target_dir/libtiny_tummy_lib.d"
  if [ -d "$target_dir/deps" ]; then
    find "$target_dir/deps" -maxdepth 1 -type f -name "*tiny_tummy_lib*" -delete
  fi
  if [ -d "$target_dir/incremental" ]; then
    find "$target_dir/incremental" -maxdepth 1 -type d -name "tiny_tummy_lib-*" -exec rm -rf {} +
  fi
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

# Xcode installs should use bundled frontend assets. Hot reload still goes
# through `cargo tauri ios dev --device`, which provides the dev server.
export TAURI_CONFIG='{"build":{"devUrl":null}}'

sync_generated_ios_info_plist
sync_generated_ios_plugin_sources
copy_frontend_assets

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

# Tauri embeds `TAURI_CONFIG` and dependency feature flags into this crate at
# compile time. Cargo does not always notice when only those inputs change, so
# remove this package's iOS artifacts before rebuilding to avoid stale loaders.
clean_tauri_crate_artifacts

BUILD_ARGS="--manifest-path $TAURI_DIR/Cargo.toml --target $RUST_TARGET --lib --crate-type staticlib --features tauri/custom-protocol"
if [ "$CONFIGURATION_VALUE" = "release" ]; then
  # shellcheck disable=SC2086
  "$CARGO_BIN" rustc $BUILD_ARGS --release
else
  # shellcheck disable=SC2086
  "$CARGO_BIN" rustc $BUILD_ARGS
fi

SOURCE_LIB="$TAURI_DIR/target/$RUST_TARGET/$CONFIGURATION_VALUE/libtiny_tummy_lib.a"
[ -f "$SOURCE_LIB" ] || fail "expected Rust static library was not produced at '$SOURCE_LIB'"

cp -f "$SOURCE_LIB" "$OUTPUT_DIR/libapp.a"

SWIFT_MODULE_DIR="$APPLE_DIR/Externals/SwiftModules"
mkdir -p "$SWIFT_MODULE_DIR"
find "$TAURI_DIR/target/$RUST_TARGET/$CONFIGURATION_VALUE" \
  \( -name "Tauri.swiftmodule" -o -name "SwiftRs.swiftmodule" \) \
  -exec cp -R {} "$SWIFT_MODULE_DIR/" \;
