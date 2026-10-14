#!/usr/bin/env bash
# Compatibility entry point; desktop commands are defined in package.json.
set -euo pipefail
ROOT=$(dirname "$(dirname "$(realpath "$0")")")
COMMAND=${1:--h}
if (($#)); then shift; fi
case "$COMMAND" in
  install) pnpm --dir "$ROOT" install "$@" ;;
  build) pnpm --dir "$ROOT" run build "$@" ;;
  runtime-build) pnpm --dir "$ROOT" run runtime:build "$@" ;;
  test) pnpm --dir "$ROOT" test "$@" ;;
  dev) pnpm --dir "$ROOT" run dev:browser "$@" ;;
  dev-electron) pnpm --dir "$ROOT" run dev "$@" ;;
  serve) pnpm --dir "$ROOT" run serve "$@" ;;
  start) unset ELECTRON_RUN_AS_NODE; pnpm --dir "$ROOT" start "$@" ;;
  -h|--help) echo "Use pnpm scripts: install | run build | run runtime:build | test | run dev | run dev:browser | run serve | start" ;;
  *) echo "Unknown command: $COMMAND" >&2; exit 1 ;;
esac
