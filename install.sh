#!/bin/sh
set -eu

REPOSITORY="YuanyuanMa03/cropcode"
VERSION="${CROPCODE_VERSION:-latest}"

case "$(uname -s)" in
  Darwin) ASSET="cropcode-macos-universal.tar.gz" ;;
  Linux)
    case "$(uname -m)" in
      x86_64|amd64) ASSET="cropcode-linux-x64.tar.gz" ;;
      *) echo "CropCode does not yet provide a Linux package for $(uname -m)." >&2; exit 1 ;;
    esac
    ;;
  *) echo "Unsupported operating system: $(uname -s)" >&2; exit 1 ;;
esac

if [ -n "${CROPCODE_DOWNLOAD_BASE:-}" ]; then
  DOWNLOAD_BASE="$CROPCODE_DOWNLOAD_BASE"
elif [ "$VERSION" = "latest" ]; then
  DOWNLOAD_BASE="https://github.com/$REPOSITORY/releases/latest/download"
else
  DOWNLOAD_BASE="https://github.com/$REPOSITORY/releases/download/$VERSION"
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to install CropCode." >&2
  exit 1
fi

TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t cropcode)
trap 'rm -rf "$TEMP_DIR"' EXIT HUP INT TERM

echo "Downloading CropCode $VERSION..."
if [ -n "${CROPCODE_DOWNLOAD_BASE:-}" ]; then
  curl -fsSL "$DOWNLOAD_BASE/$ASSET" -o "$TEMP_DIR/$ASSET"
else
  curl --proto '=https' --tlsv1.2 -fsSL "$DOWNLOAD_BASE/$ASSET" -o "$TEMP_DIR/$ASSET"
fi
tar -xzf "$TEMP_DIR/$ASSET" -C "$TEMP_DIR"
INSTALLER=$(find "$TEMP_DIR" -mindepth 2 -maxdepth 2 -type f -name install.sh -print -quit)
if [ -z "$INSTALLER" ]; then
  echo "The downloaded package does not contain install.sh." >&2
  exit 1
fi

sh "$INSTALLER"
