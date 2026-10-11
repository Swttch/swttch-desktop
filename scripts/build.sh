#!/usr/bin/env bash
# Compatibility entry point; desktop commands are defined in package.json.
set -euo pipefail
ROOT=$(dirname "$(dirname "$(realpath "$0")")")
COMMAND=${1:--h}
if (($#)); then shift; fi
case "$COMMAND" in
  install) npm --prefix "$ROOT" install "$@" ;;
  build) npm --prefix "$ROOT" run build -- "$@" ;;
  runtime-build) npm --prefix "$ROOT" run runtime:build -- "$@" ;;
  test) npm --prefix "$ROOT" test -- "$@" ;;
  dev) npm --prefix "$ROOT" run dev:browser -- "$@" ;;
  dev-electron) npm --prefix "$ROOT" run dev -- "$@" ;;
  serve) npm --prefix "$ROOT" run serve -- "$@" ;;
  start) unset ELECTRON_RUN_AS_NODE; npm --prefix "$ROOT" start -- "$@" ;;
  -h|--help) echo "Use npm scripts: install | run build | run runtime:build | test | run dev | run dev:browser | run serve | start" ;;
  *) echo "Unknown command: $COMMAND" >&2; exit 1 ;;
esac
