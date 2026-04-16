#!/usr/bin/env bash
# Auto-onboard: silently set up tools on first project visit
# Marker file = skip forever after (~1ms check)
set -euo pipefail

INPUT=$(cat)
CWD=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('cwd','.'))" 2>/dev/null || echo ".")

[ -d "$CWD/.git" ] || exit 0

MARKER="$CWD/.claude/.onboarded"
[ -f "$MARKER" ] && exit 0

# First time — run setup silently in background
mkdir -p "$CWD/.claude" 2>/dev/null || true

# Graphify: build index if not exists (background, marker written on success)
if [ ! -d "$CWD/graphify-out" ] && command -v graphify &>/dev/null; then
  (cd "$CWD" && graphify . --no-viz >/dev/null 2>&1 && touch "$MARKER" 2>/dev/null) &
else
  # No graphify — just mark as onboarded
  touch "$MARKER" 2>/dev/null || true
fi

exit 0
