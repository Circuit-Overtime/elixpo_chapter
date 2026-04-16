#!/usr/bin/env bash
# Orphan file detector for Claude Code PreToolUse hook
# Checks if an EXISTING file being edited has zero import references
# Exit 0 = allow, Exit 2 = warn (advisory, not blocking for new files)
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ti = d.get('tool_input', {})
print(ti.get('file_path') or ti.get('path') or '')
" 2>/dev/null || echo "")

# Skip if no file path, file doesn't exist yet (new file), or is a test/config file
[[ -z "$FILE_PATH" ]] && exit 0
[[ ! -f "$FILE_PATH" ]] && exit 0
echo "$FILE_PATH" | grep -qEi '(test|spec|\.config|\.json|\.md|\.yml|\.yaml|\.toml|\.lock|__init__|index\.|mod\.rs|main\.|lib\.)' && exit 0

BASENAME=$(basename "$FILE_PATH")
NOEXT="${BASENAME%.*}"

# Skip very short names (likely to false-positive)
[[ ${#NOEXT} -lt 3 ]] && exit 0

# Language-specific import pattern
case "$FILE_PATH" in
  *.ts|*.tsx)
    PATTERN="from\s+['\"][^'\"]*${NOEXT}['\"]|require\(['\"][^'\"]*${NOEXT}['\"]"
    TYPE_FLAGS="--type ts"
    ;;
  *.js|*.jsx|*.mjs)
    PATTERN="from\s+['\"][^'\"]*${NOEXT}['\"]|require\(['\"][^'\"]*${NOEXT}['\"]"
    TYPE_FLAGS="--type js"
    ;;
  *.py)
    PATTERN="(from|import)\s+[a-zA-Z0-9_.]*${NOEXT}\b"
    TYPE_FLAGS="--type py"
    ;;
  *.rs)
    PATTERN="(use|mod)\s+[a-zA-Z0-9_:]*\b${NOEXT}\b"
    TYPE_FLAGS="--type rust"
    ;;
  *.go)
    PATTERN="\"[^\"]*/${NOEXT}\""
    TYPE_FLAGS="--type go"
    ;;
  *)
    exit 0
    ;;
esac

REF_COUNT=$(rg $TYPE_FLAGS -l "$PATTERN" . 2>/dev/null \
  | grep -v "${FILE_PATH}" \
  | wc -l | tr -d ' ' || echo "0")

if [ "$REF_COUNT" -eq "0" ]; then
  echo "[ORPHAN WARNING] ${FILE_PATH} has zero import references. Ensure it is imported somewhere before continuing." >&2
  # Advisory only — don't block with exit 2 for edits to existing files
  # The Stop hook handles hard enforcement
fi

exit 0
