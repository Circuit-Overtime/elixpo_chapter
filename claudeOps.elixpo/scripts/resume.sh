#!/usr/bin/env bash
# SessionStart hook: inject HANDOVER.md context into new session
# Outputs plain text to stdout → Claude receives it as injected context
# Exit 0 always — advisory only, never blocks session start
set -uo pipefail

INPUT=$(cat)

CWD=$(echo "$INPUT" | python3 -c "
import sys, json
print(json.load(sys.stdin).get('cwd', '.'))
" 2>/dev/null || echo ".")

HANDOVER="$CWD/.claude/HANDOVER.md"

# ── Nothing to inject if no handover file ───────────────────────────────────
[[ ! -f "$HANDOVER" ]] && exit 0

# ── Only inject if file was written recently (last 7 days) ──────────────────
# Avoids injecting stale context from ancient sessions
if command -v find &>/dev/null; then
  RECENT=$(find "$HANDOVER" -mtime -7 2>/dev/null)
  [[ -z "$RECENT" ]] && exit 0
fi

# ── Read the handover file and emit to stdout ─────────────────────────────────
# Claude Code SessionStart: whatever is printed to stdout is injected as context
cat <<INJECT
=== SESSION HANDOVER LOADED ===

The following context was auto-saved from the previous session.
Read it carefully before responding to the user's first message.

$(cat "$HANDOVER")

=== END HANDOVER ===
INJECT

exit 0
