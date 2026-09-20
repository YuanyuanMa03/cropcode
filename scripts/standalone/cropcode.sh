#!/bin/sh
set -eu
source_path=$0
while [ -L "$source_path" ]; do
  directory=$(CDPATH= cd -P "$(dirname "$source_path")" && pwd)
  source_path=$(readlink "$source_path")
  case "$source_path" in /*) ;; *) source_path="$directory/$source_path" ;; esac
done
base=$(CDPATH= cd -P "$(dirname "$source_path")" && pwd)
PATH="$base/runtime/bin:$PATH"
export PATH
export CROPCODE_INSTALL_METHOD=standalone
exec "$base/runtime/bin/node" "$base/app/node_modules/@yuanyuanma03/cropcode-cli/cli.js" "$@"
