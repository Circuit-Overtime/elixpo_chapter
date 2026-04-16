#!/usr/bin/env bash
# Stop hook: auto-generate .claude/HANDOVER.md at session end
# Zero LLM tokens — pure bash + git
# Exit 0 always (non-blocking, informational only)
set -uo pipefail

INPUT=$(cat)

# ── CRITICAL: prevent infinite loop ─────────────────────────────────────────
HOOK_ACTIVE=$(echo "$INPUT" | python3 -c "
import sys, json
print(json.load(sys.stdin).get('stop_hook_active', False))
" 2>/dev/null || echo "False")

[[ "$HOOK_ACTIVE" == "True" ]] && exit 0

# ── Extract session fields ───────────────────────────────────────────────────
CWD=$(echo "$INPUT" | python3 -c "
import sys, json
print(json.load(sys.stdin).get('cwd', '.'))
" 2>/dev/null || echo ".")

SESSION_ID=$(echo "$INPUT" | python3 -c "
import sys, json
print(json.load(sys.stdin).get('session_id', 'unknown'))
" 2>/dev/null || echo "unknown")

TRANSCRIPT=$(echo "$INPUT" | python3 -c "
import sys, json
print(json.load(sys.stdin).get('transcript_path', ''))
" 2>/dev/null || echo "")

# ── Only run inside a git repo ───────────────────────────────────────────────
[[ ! -d "$CWD/.git" ]] && exit 0

cd "$CWD" || exit 0

# ── Ensure .claude/ dir exists ───────────────────────────────────────────────
mkdir -p "$CWD/.claude"

OUTFILE="$CWD/.claude/HANDOVER.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%SZ")

# ── Git state ────────────────────────────────────────────────────────────────
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_REMOTE=$(git remote get-url origin 2>/dev/null | sed 's|git@github\.com:|https://github.com/|; s|\.git$||' || echo "none")
LAST_COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "none")
LAST_COMMIT_MSG=$(git log -1 --format="%s" 2>/dev/null || echo "none")
LAST_COMMIT_DATE=$(git log -1 --format="%ci" 2>/dev/null || echo "none")
LAST_COMMIT_AUTHOR=$(git log -1 --format="%an" 2>/dev/null || echo "none")

# ── Modified files (vs HEAD) ─────────────────────────────────────────────────
MODIFIED_STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")
MODIFIED_UNSTAGED=$(git diff --name-only 2>/dev/null || echo "")
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | head -20 || echo "")

# ── Diff summary (stats only, not full patch — token-safe for next session) ──
DIFF_STAT=$(git diff HEAD --stat 2>/dev/null | tail -1 || echo "no changes")
DIFF_STAGED_STAT=$(git diff --cached --stat 2>/dev/null | tail -1 || echo "no staged changes")

# Full diff of unstaged (capped at 120 lines to stay readable)
DIFF_CONTENT=$(git diff HEAD 2>/dev/null | head -120 || echo "")
if [[ $(git diff HEAD 2>/dev/null | wc -l) -gt 120 ]]; then
  DIFF_CONTENT="${DIFF_CONTENT}
... [truncated — run: git diff HEAD for full diff]"
fi

# ── Recent commits this session (heuristic: last 10) ─────────────────────────
RECENT_COMMITS=$(git log --oneline -10 2>/dev/null || echo "none")

# ── Files modified in last 10 commits (distinct list) ───────────────────────
SESSION_FILES=$(git diff HEAD~10...HEAD --name-only 2>/dev/null | sort -u | head -30 || \
                git diff HEAD --name-only 2>/dev/null | sort -u | head -30 || echo "none")

# ── Extract last assistant messages from transcript (no LLM, grep only) ──────
LAST_MESSAGES=""
if [[ -n "$TRANSCRIPT" && -f "$TRANSCRIPT" ]]; then
  LAST_MESSAGES=$(TRANSCRIPT_PATH="$TRANSCRIPT" python3 - <<'PYEOF' 2>/dev/null
import sys, json, os

transcript = os.environ.get('TRANSCRIPT_PATH', '')
if not transcript or not os.path.exists(transcript):
    sys.exit(0)

messages = []
with open(transcript, 'r', encoding='utf-8', errors='replace') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        # Claude Code transcript format: {type: "assistant", message: {content: [...]}}
        msg_type = obj.get('type', '')
        if msg_type == 'assistant':
            content = obj.get('message', {}).get('content', [])
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get('type') == 'text':
                        text = block.get('text', '').strip()
                        if text:
                            messages.append(text)
            elif isinstance(content, str) and content.strip():
                messages.append(content.strip())

# Last 5 meaningful assistant messages (skip very short ones)
meaningful = [m for m in messages if len(m) > 40][-5:]
for m in meaningful:
    # Cap each at 300 chars
    snippet = m[:300] + ('...' if len(m) > 300 else '')
    print(f"- {snippet}")
PYEOF
)
fi

# ── Build HANDOVER.md ─────────────────────────────────────────────────────────
cat > "$OUTFILE" <<HANDOVER
# Session Handover

**Generated:** ${TIMESTAMP}
**Session ID:** ${SESSION_ID}
**Project:** ${CWD}

---

## Git State

| Field         | Value |
|---------------|-------|
| Branch        | \`${GIT_BRANCH}\` |
| Remote        | ${GIT_REMOTE} |
| Last commit   | \`${LAST_COMMIT_HASH}\` — ${LAST_COMMIT_MSG} |
| Commit date   | ${LAST_COMMIT_DATE} |
| Commit author | ${LAST_COMMIT_AUTHOR} |

### Recent Commits (last 10)

\`\`\`
${RECENT_COMMITS}
\`\`\`

---

## What Was Modified

### Staged changes
${DIFF_STAGED_STAT}

### Unstaged changes
${DIFF_STAT}

### Staged files
\`\`\`
${MODIFIED_STAGED:-none}
\`\`\`

### Modified (unstaged) files
\`\`\`
${MODIFIED_UNSTAGED:-none}
\`\`\`

### Untracked files
\`\`\`
${UNTRACKED:-none}
\`\`\`

### All files touched this session (last 10 commits)
\`\`\`
${SESSION_FILES}
\`\`\`

---

## Diff (unstaged vs HEAD)

\`\`\`diff
${DIFF_CONTENT:-no uncommitted changes}
\`\`\`

---

## What Claude Did This Session

*(Extracted from transcript — last 5 assistant responses)*

${LAST_MESSAGES:-No transcript available or no assistant messages found.}

---

## What to Do Next

> **IMPORTANT — next session must fill this in.**
> The Stop hook captures git state automatically but cannot infer intent.
> Before closing this session, run: \`/handover\` or manually edit this section.

- [ ] TODO: describe the next concrete step here
- [ ] TODO: any blockers or open questions
- [ ] TODO: which branch/PR to continue on

---

## Known Issues / What Was Abandoned

*(Fill in manually or via /handover command)*

- none recorded this session

---

## Decisions Made

*(Fill in manually or via /handover command)*

- none recorded this session

---

## How to Resume

\`\`\`bash
# 1. Switch to the right branch
git checkout ${GIT_BRANCH}

# 2. Review outstanding changes
git diff HEAD --stat
git status

# 3. Read this file at session start (automatic if SessionStart hook is active)
cat .claude/HANDOVER.md
\`\`\`

---
*Auto-generated by \`~/.claude/bin/handover.sh\` Stop hook — zero LLM tokens*
HANDOVER

exit 0
