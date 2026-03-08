#!/usr/bin/env bash
set -euo pipefail

# Purpose: Install/repair Android SDK command-line tools + required packages (including NDK)
# so the React Native / Expo prebuild can succeed locally.
# Safe to re-run; will skip already-installed components.

REQUIRED_PACKAGES=(
  "platform-tools"
  "platforms;android-35"
  "build-tools;35.0.0"
  "cmake;3.22.1"
  "ndk;26.1.10909125"  # Stable NDK version widely used for RN 0.7x
)

ANDROID_HOME_DEFAULT="$HOME/Library/Android/sdk"
ANDROID_HOME="${ANDROID_HOME:-$ANDROID_HOME_DEFAULT}"
CMDLINE_TOOLS_DIR="$ANDROID_HOME/cmdline-tools"
LATEST_DIR="$CMDLINE_TOOLS_DIR/latest"

green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
red() { printf "\033[31m%s\033[0m\n" "$*"; }

ensure_cmdline_tools() {
  if [[ -x "$LATEST_DIR/bin/sdkmanager" ]]; then
    green "Command-line tools already present."
    return 0
  fi
  yellow "Command-line tools missing. Downloading..."
  mkdir -p "$CMDLINE_TOOLS_DIR"
  TMP_ZIP="/tmp/android_cmdline_tools.zip"
  curl -L https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip -o "$TMP_ZIP"
  unzip -q "$TMP_ZIP" -d "$CMDLINE_TOOLS_DIR"
  # Google ships the folder as 'cmdline-tools'; rename to 'latest' for sdkmanager expected layout.
  if [[ ! -d "$LATEST_DIR" ]]; then
    mv "$CMDLINE_TOOLS_DIR/cmdline-tools" "$LATEST_DIR"
  fi
  rm -f "$TMP_ZIP"
  green "Installed command-line tools."
}

accept_licenses() {
  yes | "$LATEST_DIR/bin/sdkmanager" --licenses >/dev/null || true
}

install_packages() {
  for pkg in "${REQUIRED_PACKAGES[@]}"; do
    if "$LATEST_DIR/bin/sdkmanager" --list_installed 2>/dev/null | grep -q "^${pkg}$"; then
      green "Already installed: $pkg"
    else
      yellow "Installing: $pkg"
      "$LATEST_DIR/bin/sdkmanager" --install "$pkg"
    fi
  done
}

main() {
  mkdir -p "$ANDROID_HOME"
  ensure_cmdline_tools
  export ANDROID_HOME
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$LATEST_DIR/bin:$PATH"
  accept_licenses
  install_packages
  green "All required Android SDK components installed." 
  echo
  echo "If not already set, add to your shell profile (~/.zshrc):"
  echo "  export ANDROID_HOME=\"$ANDROID_HOME\"" 
  echo "  export PATH=\"$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH\""
  echo
  echo "Then re-run: (from frontend/android) ./gradlew clean assembleDebug"
}

main "$@"
