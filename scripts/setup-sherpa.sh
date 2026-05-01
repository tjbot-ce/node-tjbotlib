#!/usr/bin/env bash
#
# Copyright 2026-present TJBot Contributors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -euo pipefail

PACKAGE="sherpa-onnx-linux-arm64"
DEST_ROOT="$HOME/.tjbot"
DEST_DIR="$DEST_ROOT/$PACKAGE"
BASHRC="$HOME/.bashrc"

echo "== Sherpa-ONNX setup =="

# Ensure destination root exists
mkdir -p "$DEST_ROOT"

# Install/copy sherpa-onnx-linux-arm64 into ~/.tjbot if not present
if [[ -f "$DEST_DIR/sherpa-onnx.node" ]]; then
  echo "✔ Sherpa-ONNX already present at $DEST_DIR"
else
  echo "• Installing $PACKAGE to $DEST_DIR"

  # Try local copy from current project's node_modules
  SRC_DIR="$(npm root 2>/dev/null)/$PACKAGE" || true
  if [[ -d "${SRC_DIR:-}" && -f "$SRC_DIR/sherpa-onnx.node" ]]; then
    echo "  - Found local package at $SRC_DIR; copying..."
    rm -rf "$DEST_DIR"
    mkdir -p "$DEST_DIR"
    cp -a "$SRC_DIR/." "$DEST_DIR/"
  else
    # Fallback: download via npm pack into temp dir
    if ! command -v npm >/dev/null 2>&1; then
      echo "✗ npm is not available. Please install $PACKAGE manually into $DEST_DIR" >&2
      exit 1
    fi
    TMPDIR="$(mktemp -d)"
    echo "  - Downloading $PACKAGE via npm pack (tmp: $TMPDIR)"
    pushd "$TMPDIR" >/dev/null
    npm pack "$PACKAGE" >/dev/null
    TARBALL="$(ls ${PACKAGE}-*.tgz | head -n1)"
    if [[ -z "$TARBALL" ]]; then
      echo "✗ Failed to download $PACKAGE tarball" >&2
      popd >/dev/null
      rm -rf "$TMPDIR"
      exit 1
    fi
    tar -xzf "$TARBALL"
    if [[ ! -f "package/sherpa-onnx.node" ]]; then
      echo "✗ Downloaded package missing sherpa-onnx.node" >&2
      popd >/dev/null
      rm -rf "$TMPDIR"
      exit 1
    fi
    rm -rf "$DEST_DIR"
    mkdir -p "$DEST_DIR"
    cp -a package/. "$DEST_DIR/"
    popd >/dev/null
    rm -rf "$TMPDIR"
  fi
  echo "✔ Installed $PACKAGE to $DEST_DIR"
fi

# Update ~/.bashrc with LD_LIBRARY_PATH entry if missing
EXPORT_LINE="export LD_LIBRARY_PATH=\"$DEST_DIR:\$LD_LIBRARY_PATH\""
if [[ -f "$BASHRC" ]] && grep -q "$DEST_DIR" "$BASHRC"; then
  echo "✔ LD_LIBRARY_PATH already includes $DEST_DIR in $BASHRC"
else
  echo "• Appending LD_LIBRARY_PATH update to $BASHRC"
  {
    echo ""
    echo "# Sherpa-ONNX native libraries for TJBot STT/TTS"
    echo "$EXPORT_LINE"
  } >> "$BASHRC"
  echo "✔ Updated $BASHRC"
fi

cat <<EOF

Sherpa-ONNX native libraries installed at: $DEST_DIR
Please restart your shell or run this command to make them available
for immediate use:
  source "$BASHRC"

EOF
