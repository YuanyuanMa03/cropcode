#!/bin/sh
set -eu
fail() { printf 'CropCode: %s\n' "$*" >&2; exit 1; }
main() {
  prefix=${CROPCODE_INSTALL_PREFIX:-"$HOME/.local"}
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --prefix) [ "$#" -ge 2 ] || fail '--prefix requires a directory.'; prefix=$2; shift 2 ;;
      -h|--help) printf 'Usage: sh uninstall.sh [--prefix ABSOLUTE_DIRECTORY]\nRemoves only the standalone installation; keeps ~/.cropcode and project files.\n'; exit 0 ;;
      *) fail "Unknown option: $1" ;;
    esac
  done
  case "$prefix" in /*) ;; *) fail 'The prefix must be an absolute path.' ;; esac
  root="$prefix/share/cropcode"
  [ ! -L "$root" ] || fail 'Refusing to remove a symbolic-link installation directory.'
  [ -e "$root" ] || { printf 'CropCode standalone is not installed at %s.\n' "$root"; exit 0; }
  [ -f "$root/.cropcode-install-root" ] && [ "$(cat "$root/.cropcode-install-root")" = cropcode-standalone-v1 ] \
    || fail 'Refusing to remove an unmanaged directory.'
  mkdir "$root/.install-lock" 2>/dev/null || fail 'Another installation is in progress.'
  trap 'rmdir "$root/.install-lock" 2>/dev/null || true' 0
  if [ -L "$prefix/bin/cropcode" ] && [ "$(readlink "$prefix/bin/cropcode")" = "$root/current/cropcode" ]; then
    rm "$prefix/bin/cropcode"
  fi
  rm -rf "$root"
  printf 'CropCode standalone and its private runtime were removed.\nYour ~/.cropcode settings, sessions and project files were kept.\n'
  printf 'npm installations or development links, if any, must be uninstalled separately with npm.\n'
}
main "$@"
