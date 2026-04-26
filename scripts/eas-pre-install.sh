#!/usr/bin/env bash
# Runs on EAS Build workers (and locally if invoked) before `npm install`.
# Ensures the Go toolchain is on PATH so the WireGuardTunnel target's
# "Build wireguard-go-bridge" Run Script Build Phase can produce libwg-go.a.

set -euo pipefail

if command -v go >/dev/null 2>&1; then
  echo "[eas-pre-install] go already installed: $(go version)"
  exit 0
fi

if [[ "$(uname -s)" == "Darwin" ]]; then
  echo "[eas-pre-install] Installing Go on macOS build worker..."
  ARCH="$(uname -m)"
  if [[ "$ARCH" == "arm64" ]]; then
    GO_PKG="go1.23.4.darwin-arm64.tar.gz"
  else
    GO_PKG="go1.23.4.darwin-amd64.tar.gz"
  fi
  curl -L -o "/tmp/${GO_PKG}" "https://go.dev/dl/${GO_PKG}"
  mkdir -p "$HOME/.local"
  tar -C "$HOME/.local" -xzf "/tmp/${GO_PKG}"
  rm -f "/tmp/${GO_PKG}"
  export PATH="$HOME/.local/go/bin:$PATH"
  echo "export PATH=\"$HOME/.local/go/bin:\$PATH\"" >> "$HOME/.bash_profile" || true
  echo "export PATH=\"$HOME/.local/go/bin:\$PATH\"" >> "$HOME/.zshrc" || true
  echo "[eas-pre-install] Go installed: $($HOME/.local/go/bin/go version)"
else
  echo "[eas-pre-install] Non-Darwin platform ($(uname -s)); skipping Go install."
fi
