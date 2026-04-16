#!/usr/bin/env bash
# Loop guard — escalating guidance when Claude repeats failing tool calls
# Exit 0 always (guidance, not blocking). Injects messages via stderr.
set -euo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")
EXIT_CODE=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_result',{}).get('exit_code',0))" 2>/dev/null || echo "0")
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id','default'))" 2>/dev/null || echo "default")

# Only track non-zero exits
[[ "$EXIT_CODE" == "0" || -z "$TOOL_NAME" ]] && exit 0

# Build hash from tool name + truncated input
SNIPPET=$(echo "$INPUT" | python3 -c "
import sys,json
d=json.load(sys.stdin)
ti=d.get('tool_input',{})
s=str(ti)[:200]
print(s)
" 2>/dev/null || echo "")

HASH=$(printf '%s|%s' "$TOOL_NAME" "$SNIPPET" | cksum | cut -d' ' -f1)
LOGFILE="${TMPDIR:-/tmp}/claude_loop_guard_${SESSION_ID}.log"

touch "$LOGFILE"
echo "$HASH" >> "$LOGFILE"

# Keep last 10 entries
tail -n 10 "$LOGFILE" > "${LOGFILE}.tmp" && mv "${LOGFILE}.tmp" "$LOGFILE"

# Count consecutive identical entries at tail
LAST=$(tail -n1 "$LOGFILE")
COUNT=0
while IFS= read -r line; do
  [[ "$line" == "$LAST" ]] && COUNT=$((COUNT + 1)) || COUNT=0
done < "$LOGFILE"

if [[ "$COUNT" -ge 5 ]]; then
  > "$LOGFILE"
  echo "[LOOP x${COUNT}] STOP. This exact approach has failed ${COUNT} times. Explain the failure to the user and ask for guidance. Do NOT retry." >&2
elif [[ "$COUNT" -ge 3 ]]; then
  echo "[LOOP x${COUNT}] This approach has failed ${COUNT} times consecutively. Try a COMPLETELY DIFFERENT strategy — different tool, different command, different approach." >&2
fi

exit 0
