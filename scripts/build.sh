#!/usr/bin/env bash
set -euo pipefail
ROOT=$(dirname "$(dirname "$(realpath "$0")")")
PLUGIN_ROOT=$(dirname "$(dirname "$ROOT")")
case "${1:--h}" in
  install) npm --prefix "$ROOT" install ;;
  build)
    for source in "$ROOT"/src/*.cjs "$ROOT"/src/database/*.cjs; do node --check "$source"; done
    node --check "$ROOT/scripts/dev.mjs"
    node "$ROOT/node_modules/typescript/lib/tsc.js" --project "$ROOT/renderer/tsconfig.json"
    node "$ROOT/node_modules/vite/bin/vite.js" build --config "$ROOT/renderer/vite.config.mjs"
    ;;
  runtime-build)
    bash "$PLUGIN_ROOT/scripts/build.sh" be-build
    bash "$PLUGIN_ROOT/scripts/build.sh" wv-build
    ;;
  test) node --test "$ROOT"/test/*.test.cjs ;;
  dev) node "$ROOT/scripts/dev.mjs" "${@:2}" ;;
  dev-electron) node "$ROOT/scripts/dev.mjs" --electron ;;
  serve) node "$ROOT/src/host.cjs" ;;
  start) unset ELECTRON_RUN_AS_NODE; "$ROOT/node_modules/.bin/electron" "$ROOT" "${@:2}" ;;
  -h|--help) echo 'Commands: install | build | runtime-build | test | dev | dev-electron | serve | start' ;;
  *) echo "Unknown command: $1" >&2; exit 1 ;;
esac
