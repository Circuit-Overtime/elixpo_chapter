#!/usr/bin/env bash
# biome — one-shot lint + format + fix helper.
#
# Usage:
#   ./biome         # auto-fix everything biome can (safe + unsafe), then ci
#   ./biome check   # just report issues, no writes
#   ./biome fix     # apply safe fixes only
#   ./biome all     # safe + unsafe fixes, then ci (same as default)
#   ./biome ci      # strict check — what the workflow runs
#
# The bot should prefer `./biome` over raw `npx @biomejs/biome ...` calls.
# --diagnostic-level=error is used in ci mode so infos/warnings print for
# visibility but don't block the build.

set -e

MODE="${1:-all}"
BIOME="npx --yes @biomejs/biome"

case "$MODE" in
  check)
    $BIOME check . --max-diagnostics=200
    ;;
  fix)
    $BIOME check . --write --max-diagnostics=200
    ;;
  all|"")
    echo "▶ applying safe fixes…"
    $BIOME check . --write --max-diagnostics=200 || true
    echo ""
    echo "▶ applying unsafe fixes…"
    $BIOME check . --write --unsafe --max-diagnostics=200 || true
    echo ""
    echo "▶ running CI check (errors-only)…"
    $BIOME ci . --diagnostic-level=error
    ;;
  ci)
    $BIOME ci . --diagnostic-level=error
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: ./biome [check|fix|all|ci]"
    exit 2
    ;;
esac
