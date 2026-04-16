#!/usr/bin/env bash
# Stop hook: blocks "done" if new code has zero references
# Exit 0 = allow, Exit 2 = block completion
set -euo pipefail

INPUT=$(cat)

# CRITICAL: prevent infinite loop
HOOK_ACTIVE=$(echo "$INPUT" | python3 -c "
import sys, json
print(json.load(sys.stdin).get('stop_hook_active', False))
" 2>/dev/null || echo "False")

[[ "$HOOK_ACTIVE" == "True" ]] && exit 0

CWD=$(echo "$INPUT" | python3 -c "
import sys, json
print(json.load(sys.stdin).get('cwd', '.'))
" 2>/dev/null || echo ".")

# Only check if in a git repo with recent changes
[[ ! -d "$CWD/.git" ]] && exit 0

# Get files changed in this session (uncommitted)
CHANGED=$(cd "$CWD" && git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|py|rs|go)$' | head -10 || echo "")
[[ -z "$CHANGED" ]] && exit 0

ORPHANS=""
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  [[ ! -f "$CWD/$file" ]] && continue
  # Skip tests, configs, index/main/lib files
  echo "$file" | grep -qEi '(test|spec|\.config|index\.|main\.|lib\.|mod\.rs|__init__)' && continue

  NOEXT=$(basename "$file" | sed 's/\.[^.]*$//')
  [[ ${#NOEXT} -lt 3 ]] && continue

  # Use import-aware patterns instead of raw word boundary to reduce false positives
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs)
      IMPORT_PATTERN="(from\s+['\"][^'\"]*${NOEXT}['\"]|require\(['\"][^'\"]*${NOEXT}['\"]|import\s+.*['\"][^'\"]*${NOEXT}['\"])"
      ;;
    *.py)
      IMPORT_PATTERN="(from\s+[a-zA-Z0-9_.]*${NOEXT}\b|import\s+[a-zA-Z0-9_.]*${NOEXT}\b)"
      ;;
    *.rs)
      IMPORT_PATTERN="(use\s+[a-zA-Z0-9_:]*\b${NOEXT}\b|mod\s+${NOEXT}\b)"
      ;;
    *.go)
      IMPORT_PATTERN="\"[^\"]*/${NOEXT}\""
      ;;
    *)
      IMPORT_PATTERN="\b${NOEXT}\b"
      ;;
  esac

  REF_COUNT=$(cd "$CWD" && rg -l "$IMPORT_PATTERN" --type-add 'src:*.{ts,tsx,js,jsx,py,rs,go}' --type src . 2>/dev/null \
    | grep -v "$file" | wc -l | tr -d ' ' || echo "0")

  [[ "$REF_COUNT" -eq "0" ]] && ORPHANS="$ORPHANS\n  - $file (zero references)"
done <<< "$CHANGED"

if [[ -n "$ORPHANS" ]]; then
  echo "CONNECTIVITY CHECK FAILED. These files have zero import references:" >&2
  echo -e "$ORPHANS" >&2
  echo "" >&2
  echo "Wire them into the system (import, register, render) or remove them before completing." >&2
  exit 2
fi

exit 0
