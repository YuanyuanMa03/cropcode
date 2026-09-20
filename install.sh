#!/bin/sh
# Install the platform bundle; no system Node.js or npm is needed.
set -eu

fail() { printf 'CropCode: %s\n' "$*" >&2; exit 1; }
usage() {
  cat <<'HELP'
CropCode standalone installer — macOS / Linux / WSL
Usage: sh install.sh [VERSION] [--prefix ABSOLUTE_DIRECTORY]
Default: latest stable release, installed under $HOME/.local.
Requires curl, tar and sha256sum or shasum; no Node.js, npm or sudo.
--from-release DIRECTORY  Install a locally built release (maintainer validation).
Uninstall: sh "$HOME/.local/share/cropcode/uninstall.sh"
HELP
}
download() {
  curl --fail --silent --show-error --location --retry 3 --connect-timeout 15 \
    --max-time 300 --proto '=https' --tlsv1.2 "$1" --output "$2" || fail "Download failed: $1"
}
main() {
  version=latest
  version_set=false
  prefix=${CROPCODE_INSTALL_PREFIX:-"$HOME/.local"}
  release_directory=
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help) usage; exit 0 ;;
      --prefix|--from-release)
        [ "$#" -ge 2 ] && [ -n "$2" ] || fail "$1 requires a directory."
        case "$1" in --prefix) prefix=$2 ;; *) release_directory=$2 ;; esac
        shift 2 ;;
      -*) fail "Unknown option: $1" ;;
      *) [ "$version_set" = false ] || fail 'Specify only one version.'; version=$1; version_set=true; shift ;;
    esac
  done
  case "$prefix" in /*) ;; *) fail 'The prefix must be an absolute path.' ;; esac
  case "$(uname -s)" in
    Darwin) platform=darwin ;;
    Linux)
      platform=linux
      if command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
        fail 'Standalone Linux builds require glibc 2.28+. Alpine/musl is not supported; use npm with a compatible system Node.js.'
      fi ;;
    *) fail 'Use install.ps1 on native Windows, or install.sh inside WSL.' ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) architecture=x64 ;;
    arm64|aarch64) architecture=arm64 ;;
    *) fail 'Supported architectures: x64 and ARM64.' ;;
  esac
  target="$platform-$architecture"
  for dependency in tar awk grep mktemp; do
    command -v "$dependency" >/dev/null 2>&1 || fail "Missing required command: $dependency"
  done
  if command -v sha256sum >/dev/null 2>&1; then checksum=sha256sum
  elif command -v shasum >/dev/null 2>&1; then checksum=shasum
  else fail 'Install sha256sum or shasum first.'; fi
  if [ -z "$release_directory" ]; then
    command -v curl >/dev/null 2>&1 || fail 'Install curl first.'
  else
    [ "$version" != latest ] || fail '--from-release requires an explicit version.'
  fi
  repo=https://github.com/YuanyuanMa03/cropcode
  if [ "$version" = latest ]; then
    # Resolve the redirect instead of requiring a JSON parser or a Node runtime.
    latest_url=$(curl -fsSL --retry 3 --connect-timeout 15 --max-time 60 --proto '=https' \
      --output /dev/null --write-out '%{url_effective}' "$repo/releases/latest") || fail 'Could not resolve the latest release.'
    case "$latest_url" in "$repo/releases/tag/v"*) version=${latest_url##*/} ;; *) fail 'Unexpected release redirect.' ;; esac
  fi
  version=${version#v}
  printf '%s\n' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' || fail 'Expected a version such as 1.1.0.'
  asset="cropcode-$version-$target.tar.gz"
  temp_dir=$(mktemp -d "${TMPDIR:-/tmp}/cropcode-install.XXXXXX")
  install_lock=
  trap 'rm -rf "$temp_dir"; if [ -n "$install_lock" ]; then rmdir "$install_lock"; fi' 0
  trap 'exit 130' INT
  trap 'exit 143' TERM HUP
  printf 'Installing CropCode %s for %s (bundled runtime)...\n' "$version" "$target"
  if [ -n "$release_directory" ]; then
    cp "$release_directory/$asset" "$temp_dir/$asset"
    cp "$release_directory/SHA256SUMS" "$temp_dir/SHA256SUMS"
  else
    download "$repo/releases/download/v$version/$asset" "$temp_dir/$asset"
    download "$repo/releases/download/v$version/SHA256SUMS" "$temp_dir/SHA256SUMS"
  fi
  expected=$(awk -v name="$asset" '$2 == name {print $1}' "$temp_dir/SHA256SUMS")
  [ "${#expected}" = 64 ] || fail 'Missing or duplicate checksum entry.'
  case "$expected" in *[!0-9a-fA-F]*) fail 'Invalid checksum.' ;; esac
  if [ "$checksum" = sha256sum ]; then actual=$(sha256sum "$temp_dir/$asset" | awk '{print $1}')
  else actual=$(shasum -a 256 "$temp_dir/$asset" | awk '{print $1}'); fi
  [ "$expected" = "$actual" ] || fail 'SHA-256 verification failed. The installed version was not changed.'
  tar -tzf "$temp_dir/$asset" > "$temp_dir/entries"
  awk '($0 != "cropcode" && $0 !~ /^cropcode\//) || $0 ~ /(^|\/)\.\.(\/|$)/ {bad=1} END {exit bad}' "$temp_dir/entries" \
    || fail 'Invalid archive paths.'
  tar -xzf "$temp_dir/$asset" -C "$temp_dir"
  bundle="$temp_dir/cropcode"
  runtime="$bundle/runtime/bin/node"
  [ -x "$runtime" ] && [ -x "$bundle/cropcode" ] || fail 'Incomplete platform bundle.'
  "$runtime" -e '
    const m = require(process.argv[1]);
    if (m.product !== "CropCode" || m.version !== process.argv[2] || m.target !== process.argv[3]) process.exit(1);
  ' "$bundle/manifest.json" "$version" "$target" || fail 'The platform bundle cannot run or its manifest does not match.'
  "$bundle/cropcode" --version </dev/null || fail 'The new CLI could not start. The installed version was not changed.'

  install_root="$prefix/share/cropcode"
  command_path="$prefix/bin/cropcode"
  [ ! -L "$install_root" ] || fail 'The installation directory must not be a symbolic link.'
  if [ -e "$install_root" ]; then
    [ -f "$install_root/.cropcode-install-root" ] && [ "$(cat "$install_root/.cropcode-install-root")" = cropcode-standalone-v1 ] \
      || fail 'Refusing to replace an unmanaged installation directory.'
  fi
  if [ -e "$command_path" ] || [ -L "$command_path" ]; then
    [ -L "$command_path" ] && [ "$(readlink "$command_path")" = "$install_root/current/cropcode" ] \
      || fail "Another installation owns $command_path. Uninstall it using its original method first."
  fi
  mkdir -p "$install_root/releases" "$prefix/bin"
  printf '%s\n' cropcode-standalone-v1 > "$install_root/.cropcode-install-root"
  mkdir "$install_root/.install-lock" 2>/dev/null || fail 'Another installation is in progress.'
  install_lock="$install_root/.install-lock"
  slot=$(mktemp -d "$install_root/releases/$version-$target.XXXXXX")
  mv "$bundle" "$slot/payload"
  cp "$slot/payload/uninstall.sh" "$install_root/uninstall.sh"
  # A filesystem rename swaps the current symlink atomically on both BSD and GNU systems.
  "$slot/payload/runtime/bin/node" -e '
    const fs = require("node:fs");
    const [root, slot] = process.argv.slice(1);
    const next = root + "/.current-next";
    fs.rmSync(next, {force:true});
    fs.symlinkSync(slot + "/payload", next);
    fs.renameSync(next, root + "/current");
  ' "$install_root" "$slot"
  if [ ! -L "$command_path" ]; then ln -s "$install_root/current/cropcode" "$command_path"; fi
  printf '\nInstalled: %s\n' "$command_path"
  case ":$PATH:" in
    *":$prefix/bin:"*) ;;
    *)
      printf 'Add this to your shell profile, then reopen the terminal:\n'
      "$slot/payload/runtime/bin/node" -e 'const q=s=>"\x27"+s.replace(/\x27/g,"\x27\\\x27\x27")+"\x27"; console.log("export PATH="+q(process.argv[1]+"/bin")+":\"$PATH\"");' "$prefix" ;;
  esac
  printf 'Run cropcode inside your project. Rerun this installer to update.\n'
  printf 'Uninstall: sh "%s/uninstall.sh" --prefix "%s"\n' "$install_root" "$prefix"
}
main "$@"
