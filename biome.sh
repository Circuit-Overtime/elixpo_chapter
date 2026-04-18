#!/usr/bin/env bash
# biome.sh — one-shot script to fix Biome linting issues.
#
# Default behavior: applies safe AND unsafe fixes across the repo. This is
# the go-to script the bot + developers run before committing.
#
# Usage:
#   ./biome.sh         # fix everything (safe + unsafe writes). Exit 0.
#   ./biome.sh ci      # strict check, errors-only. What biome.yml runs.
#                      # Exit non-zero only on actual errors.
#   ./biome.sh check   # report every diagnostic (info/warn/error), no writes.

set -e

MODE="${1:-fix}"
BIOME="npx --yes @biomejs/biome"

case "$MODE" in
  fix|"")
    echo "▶ safe fixes…"
    $BIOME check . --write --max-diagnostics=200 || true
    echo ""
    echo "▶ unsafe fixes…"
    $BIOME check . --write --unsafe --max-diagnostics=200 || true
    echo ""
    echo "✓ done — run './biome.sh ci' to verify CI will pass."
    ;;
  ci)
    # --diagnostic-level=error: infos + warnings still print but don't fail.
    # Downgraded rules in biome.jsonc keep stylistic issues from blocking CI.
    $BIOME ci . --diagnostic-level=error
    ;;
  check)
    $BIOME check . --max-diagnostics=200
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: ./biome.sh [fix|ci|check]"
    exit 2
    ;;
esac
