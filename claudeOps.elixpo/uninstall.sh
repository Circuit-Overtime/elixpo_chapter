#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'
NC='\033[0m'; BOLD='\033[1m'

info()    { echo -e "  ${BLUE}[*]${NC} $1"; }
success() { echo -e "  ${GREEN}[+]${NC} $1"; }
warn()    { echo -e "  ${YELLOW}[!]${NC} $1"; }
ask()     { echo -ne "  ${CYAN}[?]${NC} $1 (y/n): "; read -r ans; [[ "$ans" =~ ^[Yy] ]]; }

CLAUDE_DIR="$HOME/.claude"
CLAUDE_JSON="$HOME/.claude.json"
SETTINGS="$CLAUDE_DIR/settings.json"
AGENTS_DIR="$CLAUDE_DIR/agents"

echo ""
echo -e "${PURPLE}${BOLD}"
echo "  ============================================"
echo "        ClaudeOps Uninstaller"
echo "  ============================================"
echo -e "${NC}"
echo ""

# ── Step 1: Remove agents ────────────────────────────────────
GOD_MODE_AGENTS=(
  breaker architect refiner design-critic
  judge fuzzer wirer
  prism red-team researcher questioner
  specwriter test-auditor brancher ui-architect
)

if ask "Remove ClaudeOps agents from $AGENTS_DIR?"; then
  count=0
  for agent in "${GOD_MODE_AGENTS[@]}"; do
    if [ -f "$AGENTS_DIR/${agent}.md" ]; then
      rm "$AGENTS_DIR/${agent}.md"
      count=$((count + 1))
    fi
  done
  success "Removed $count agents"
else
  info "Skipping agent removal"
fi

# ── Step 2: Restore CLAUDE.md backup ─────────────────────────
if ask "Remove ClaudeOps CLAUDE.md?"; then
  BACKUP=$(ls -t "$CLAUDE_DIR"/CLAUDE.md.backup-* 2>/dev/null | head -1 || echo "")
  if [ -n "$BACKUP" ]; then
    cp "$BACKUP" "$CLAUDE_DIR/CLAUDE.md"
    success "Restored CLAUDE.md from backup: $(basename "$BACKUP")"
  elif [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
    rm "$CLAUDE_DIR/CLAUDE.md"
    success "Removed CLAUDE.md (no backup found)"
  fi
else
  info "Skipping CLAUDE.md removal"
fi

# ── Step 3: Remove hook scripts ──────────────────────────────
BIN_SCRIPTS=(
  orphan.sh wiring.sh loopcheck.sh
  handover.sh resume.sh onboard.sh
)

if ask "Remove ClaudeOps bin scripts from $CLAUDE_DIR/bin/?"; then
  count=0
  for script in "${BIN_SCRIPTS[@]}"; do
    if [ -f "$CLAUDE_DIR/bin/$script" ]; then
      rm "$CLAUDE_DIR/bin/$script"
      count=$((count + 1))
    fi
  done
  success "Removed $count bin scripts"
else
  info "Skipping bin script removal"
fi

# ── Step 4: Remove hook scripts (JS) ─────────────────────────
HOOK_SCRIPTS=(
  grep-guard.js glob-guard.js bash-guard.js
)

if ask "Remove ClaudeOps hook scripts from $CLAUDE_DIR/hooks/?"; then
  count=0
  for script in "${HOOK_SCRIPTS[@]}"; do
    if [ -f "$CLAUDE_DIR/hooks/$script" ]; then
      rm "$CLAUDE_DIR/hooks/$script"
      count=$((count + 1))
    fi
  done
  success "Removed $count hook scripts"
else
  info "Skipping hook script removal"
fi

# ── Step 5: Clean hooks from settings.json ───────────────────
if ask "Remove ClaudeOps hooks from settings.json? (will preserve non-God-Mode hooks)"; then
  python3 -c "
import json, os

path = os.path.expanduser('~/.claude/settings.json')
try:
    with open(path) as f:
        settings = json.load(f)
except:
    print('  [!] Could not read settings.json')
    exit(0)

if 'hooks' not in settings:
    print('  [*] No hooks found in settings.json')
    exit(0)

# ClaudeOps hook signatures to identify and remove
god_mode_signatures = [
    'grep-guard', 'glob-guard', 'bash-guard',
    'orphan.sh', 'wiring.sh', 'loopcheck.sh',
    'handover.sh', 'resume.sh', 'onboard.sh',
    'cozempic', 'SECRET IN PROMPT', 'SECRET DETECTED',
    'Destructive command', '--no-verify is not allowed'
]

removed = 0
for event in list(settings['hooks'].keys()):
    entries = settings['hooks'][event]
    filtered = []
    for entry in entries:
        is_god_mode = False
        for hook in entry.get('hooks', []):
            cmd = hook.get('command', '')
            if any(sig in cmd for sig in god_mode_signatures):
                is_god_mode = True
                break
        if not is_god_mode:
            filtered.append(entry)
        else:
            removed += 1
    settings['hooks'][event] = filtered
    if not settings['hooks'][event]:
        del settings['hooks'][event]

if not settings['hooks']:
    del settings['hooks']

with open(path, 'w') as f:
    json.dump(settings, f, indent=2)
print(f'  [+] Removed {removed} ClaudeOps hook entries from settings.json')
" 2>/dev/null || warn "Could not clean hooks from settings.json — edit manually"
else
  info "Skipping hooks cleanup"
fi

# ── Step 6: Remove MCP servers from ~/.claude.json ───────────
GOD_MODE_MCPS=(
  jcodemunch context-mode 21st-dev-magic shadcn magicui
  animotion aceternity dembrandt glance
)

if ask "Remove ClaudeOps MCP servers from ~/.claude.json?"; then
  python3 -c "
import json, os

path = os.path.expanduser('~/.claude.json')
try:
    with open(path) as f:
        d = json.load(f)
except:
    print('  [!] Could not read ~/.claude.json')
    exit(0)

mcps = d.get('mcpServers', {})
to_remove = ['jcodemunch','context-mode','21st-dev-magic','shadcn','magicui','animotion','aceternity','dembrandt','glance']
removed = [n for n in to_remove if mcps.pop(n, None) is not None]
d['mcpServers'] = mcps
with open(path, 'w') as f:
    json.dump(d, f, indent=2)
print(f'  [+] Removed {len(removed)} MCP servers')
" 2>/dev/null || warn "Could not clean MCP servers — edit ~/.claude.json manually"
else
  info "Skipping MCP server removal"
fi

# ── Step 7: Remove ENABLE_LSP_TOOL from shell rc ─────────────
SHELL_RC="$HOME/.bashrc"
[ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"

if ask "Remove ENABLE_LSP_TOOL from $SHELL_RC?"; then
  if grep -q "ENABLE_LSP_TOOL" "$SHELL_RC" 2>/dev/null; then
    sed -i '/export ENABLE_LSP_TOOL=1/d' "$SHELL_RC"
    success "Removed ENABLE_LSP_TOOL from $SHELL_RC"
  else
    info "ENABLE_LSP_TOOL not found in $SHELL_RC"
  fi
else
  info "Skipping shell rc cleanup"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}${BOLD}============================================"
echo "          Uninstall Complete"
echo -e "  ============================================${NC}"
echo ""
warn "Manual steps if needed:"
echo -e "    ${YELLOW}1.${NC} Restart Claude Code"
echo -e "    ${YELLOW}2.${NC} Remove community plugins via /plugin in Claude Code"
echo -e "    ${YELLOW}3.${NC} Remove .claudeignore from project roots if desired"
echo -e "    ${YELLOW}4.${NC} Uninstall tools: npm uninstall -g context-mode docfork; pip uninstall jcodemunch-mcp headroom-ai cozempic graphifyy mcp-compressor"
echo ""
