#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'
NC='\033[0m'; BOLD='\033[1m'

info()    { echo -e "  ${BLUE}[*]${NC} $1"; }
success() { echo -e "  ${GREEN}[+]${NC} $1"; }
warn()    { echo -e "  ${YELLOW}[!]${NC} $1"; }
error()   { echo -e "  ${RED}[-]${NC} $1"; }
ask()     { echo -ne "  ${CYAN}[?]${NC} $1 (y/n): "; read -r ans; [[ "$ans" =~ ^[Yy] ]]; }

CLAUDE_DIR="$HOME/.claude"
CLAUDE_JSON="$HOME/.claude.json"
SETTINGS="$CLAUDE_DIR/settings.json"
AGENTS_DIR="$CLAUDE_DIR/agents"

# Detect if running from git clone or curl pipe
if [ -d "$(dirname "$0")/agents" ]; then
  REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
else
  REPO_DIR="$(mktemp -d)"
  info "Downloading claudeops..."
  git clone --depth 1 https://github.com/elixpo/claudeOps.elixpo.git "$REPO_DIR" 2>&1 | tail -1
fi

echo ""
echo -e "${PURPLE}${BOLD}"
echo "  ============================================"
echo "          ClaudeOps Installer"
echo "  ============================================"
echo -e "${NC}"
echo -e "  ${CYAN}15 agents | autonomous token pipeline | 60-99% savings${NC}"
echo ""

# ── Preflight ──────────────────────────────────────────────
if ! command -v claude &>/dev/null; then
  error "Claude Code not found. Install it first: https://claude.ai/code"
  exit 1
fi
success "Claude Code: $(claude --version 2>&1)"

has_cmd() { command -v "$1" &>/dev/null; }
has_pip() { python3 -m pip show "$1" &>/dev/null 2>&1 || pip show "$1" &>/dev/null 2>&1; }
pip_install() { python3 -m pip install "$@" 2>&1 | tail -3 || pip install "$@" 2>&1 | tail -3; }

# Detect shell rc file
SHELL_RC="$HOME/.bashrc"
[ -f "$HOME/.zshrc" ] && SHELL_RC="$HOME/.zshrc"

# ── Step 1: Agents ─────────────────────────────────────────
echo -e "\n  ${BOLD}Step 1/7: Agents${NC}"
mkdir -p "$AGENTS_DIR"
count=0
for agent in "$REPO_DIR/agents/"*.md; do
  cp "$agent" "$AGENTS_DIR/$(basename "$agent")"
  count=$((count + 1))
done
success "Installed $count agents"

# ── Step 2: CLAUDE.md ──────────────────────────────────────
echo -e "\n  ${BOLD}Step 2/7: CLAUDE.md${NC}"
if [ -f "$CLAUDE_DIR/CLAUDE.md" ]; then
  backup="$CLAUDE_DIR/CLAUDE.md.backup-$(date +%Y%m%d%H%M%S)"
  cp "$CLAUDE_DIR/CLAUDE.md" "$backup"
  warn "Existing CLAUDE.md backed up to $(basename "$backup")"
fi
cp "$REPO_DIR/config/CLAUDE.md.template" "$CLAUDE_DIR/CLAUDE.md"
success "CLAUDE.md installed (~55 lines)"

# ── Step 3: Hooks ──────────────────────────────────────────
echo -e "\n  ${BOLD}Step 3/7: Hooks${NC}"

# Ensure settings.json exists
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

# Use Python to merge hooks safely
REPO_DIR="$REPO_DIR" python3 -c "
import json, os

settings_path = os.path.expanduser('~/.claude/settings.json')
hooks_file = os.path.join(os.environ.get('REPO_DIR', '.'), 'config', 'hooks.json')

# Load existing settings
try:
    with open(settings_path) as f:
        settings = json.load(f)
except (json.JSONDecodeError, FileNotFoundError):
    settings = {}

# Load hooks template
try:
    with open(hooks_file) as f:
        hooks_data = json.load(f)
except FileNotFoundError:
    print('  [!] hooks.json not found, skipping')
    exit(0)

new_hooks = hooks_data.get('hooks', {})

# Merge: add new hook entries without duplicating
if 'hooks' not in settings:
    settings['hooks'] = {}

for event, entries in new_hooks.items():
    if event not in settings['hooks']:
        settings['hooks'][event] = []
    existing_cmds = set()
    for entry in settings['hooks'][event]:
        for hook in entry.get('hooks', []):
            existing_cmds.add(hook.get('command', ''))
    for new_entry in entries:
        is_dup = any(h.get('command', '') in existing_cmds for h in new_entry.get('hooks', []))
        if not is_dup:
            settings['hooks'][event].append(new_entry)

with open(settings_path, 'w') as f:
    json.dump(settings, f, indent=2)
print('  [+] Hooks merged into settings.json')
" 2>/dev/null || warn "Could not auto-merge hooks — see config/hooks.json for manual setup"

# ── Step 4: Plugins ────────────────────────────────────────
echo -e "\n  ${BOLD}Step 4/7: Plugins${NC}"

enable_plugin() {
  local plugin="$1"
  python3 -c "
import json, os
path = os.path.expanduser('~/.claude/settings.json')
with open(path) as f: d = json.load(f)
if 'enabledPlugins' not in d: d['enabledPlugins'] = {}
d['enabledPlugins']['$plugin'] = True
with open(path, 'w') as f: json.dump(d, f, indent=2)
" 2>/dev/null
}

plugins=(
  "pyright-lsp@claude-plugins-official"
  "rust-analyzer-lsp@claude-plugins-official"
  "context7@claude-plugins-official"
  "superpowers@claude-plugins-official"
  "semgrep@claude-plugins-official"
  "code-review@claude-plugins-official"
)

for plugin in "${plugins[@]}"; do
  enable_plugin "$plugin"
done
success "Enabled ${#plugins[@]} official plugins (pyright-lsp, rust-analyzer-lsp, context7, superpowers, semgrep, code-review)"

# Community plugins (need marketplace registration)
info "Community plugins (install manually via /plugin in Claude Code):"
info "  - claude-mem (thedotmack) — persistent cross-session memory"
info "  - caveman (JuliusBrussee) — terse output, 60-75% savings"
info "  - everything-claude-code (affaan-m) — 230+ dev skills"

# ── Step 5: MCP Servers ────────────────────────────────────
echo -e "\n  ${BOLD}Step 5/7: MCP Servers & Tools${NC}"

add_mcp() {
  local name="$1" command="$2" args="$3"
  python3 -c "
import json, os
path = os.path.expanduser('~/.claude.json')
try:
    with open(path) as f: d = json.load(f)
except: d = {}
if 'mcpServers' not in d: d['mcpServers'] = {}
if '$name' not in d['mcpServers']:
    d['mcpServers']['$name'] = {'type': 'stdio', 'command': '$command', 'args': $args, 'env': {}}
    with open(path, 'w') as f: json.dump(d, f, indent=2)
    print('  [+] Added MCP: $name')
else:
    print('  [*] MCP already configured: $name')
" 2>/dev/null
}

# Context Mode
if has_cmd context-mode; then
  success "Context Mode already installed"
else
  if ask "Install Context Mode? (tool output sandboxing, 98% savings)"; then
    npm install -g context-mode 2>&1 | tail -2
    success "Context Mode installed"
  fi
fi
add_mcp "context-mode" "context-mode" "[]"

# jCodeMunch
if has_pip jcodemunch-mcp; then
  success "jCodeMunch already installed"
else
  if ask "Install jCodeMunch? (lightweight code indexing, 95%+ savings, 50-150MB RAM)"; then
    pip_install jcodemunch-mcp
    success "jCodeMunch installed"
  fi
fi
add_mcp "jcodemunch" "jcodemunch-mcp" "[]"

# Headroom
if has_cmd headroom || has_pip headroom-ai; then
  success "Headroom already installed"
else
  if ask "Install Headroom? (AST-aware prompt compression, ~50% savings)"; then
    pip_install "headroom-ai[all]"
    success "Headroom installed"
  fi
fi
if has_cmd headroom; then
  headroom mcp install 2>/dev/null || true
fi

# Serena
if has_cmd serena; then
  success "Serena already installed"
else
  if ask "Install Serena? (LSP code navigation, 40+ languages)"; then
    if has_cmd uv; then
      uv tool install -p 3.13 serena-agent@latest --prerelease=allow 2>&1 | tail -3
      success "Serena installed"
    else
      warn "uv not found. Install: https://docs.astral.sh/uv/getting-started/installation/"
    fi
  fi
fi
if has_cmd serena; then
  add_mcp "serena" "serena" '["start-mcp-server","--context","claude-code","--project-from-cwd","--open-web-dashboard","False","--enable-web-dashboard","False"]'
fi

# Docfork
if has_cmd docfork || npm list -g docfork &>/dev/null 2>&1; then
  success "Docfork already installed"
else
  if ask "Install Docfork? (9000+ library docs)"; then
    npm install -g docfork 2>&1 | tail -2
    success "Docfork installed"
  fi
fi
# Windows needs cmd /c wrapper for npx
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$(uname -s)" == *MINGW* ]]; then
  add_mcp "docfork" "cmd" '["/c","npx","-y","docfork@latest"]'
else
  add_mcp "docfork" "npx" '["-y","docfork@latest"]'
fi

# RTK
if has_cmd rtk; then
  success "RTK already installed ($(rtk --version 2>&1))"
else
  if ask "Install RTK? (CLI output compression, 60-90% savings)"; then
    if has_cmd cargo; then
      info "Installing RTK via cargo (may take 2-3 min)..."
      cargo install --git https://github.com/rtk-ai/rtk 2>&1 | tail -3
      rtk init -g 2>/dev/null || true
      success "RTK installed"
    else
      warn "Cargo not found. Install Rust first or download from https://github.com/rtk-ai/rtk/releases"
    fi
  fi
fi

# Cozempic
if has_pip cozempic; then
  success "Cozempic already installed"
else
  if ask "Install Cozempic? (context auto-pruning, 30-70% savings)"; then
    pip_install cozempic
    cozempic init 2>/dev/null || true
    success "Cozempic installed + hooks wired"
  fi
fi

# Graphify
if has_pip graphifyy; then
  success "Graphify already installed"
else
  if ask "Install Graphify? (multi-modal code+docs graph)"; then
    pip_install graphifyy
    graphify install 2>/dev/null || true
    success "Graphify installed"
  fi
fi

# MCP Compressor
if has_pip mcp-compressor; then
  success "MCP Compressor already installed"
else
  if ask "Install MCP Compressor? (MCP response compression + TOON)"; then
    pip_install mcp-compressor
    success "MCP Compressor installed"
  fi
fi

# ── Step 5b: UI/Design MCP Servers ─────────────────────────
echo ""
echo -e "  ${BOLD}Step 5b: UI/Design MCP Servers${NC}"
echo ""
info "These give Claude access to component libraries and visual feedback."
echo ""

# 21st.dev Magic
if ask "Install 21st.dev Magic MCP? (AI component generation — needs free API key from 21st.dev)"; then
  add_mcp "21st-dev-magic" "npx" '["-y","@21st-dev/magic@latest"]'
  warn "Set your API key: edit ~/.claude.json → mcpServers → 21st-dev-magic → env → API_KEY"
fi

# shadcn/ui
if ask "Install shadcn/ui MCP? (official component registry, zero hallucinations)"; then
  add_mcp "shadcn" "npx" '["-y","mcp-remote","https://www.shadcn.io/api/mcp"]'
fi

# Magic UI
if ask "Install Magic UI MCP? (60+ animated components — beams, particles, meteors)"; then
  add_mcp "magicui" "npx" '["-y","magicui-mcp"]'
fi

# Animotion
if ask "Install Animotion MCP? (745 CSS animations + 9000 SVG icons)"; then
  add_mcp "animotion" "npx" '["-y","animotion-mcp"]'
fi

# Aceternity UI
if ask "Install Aceternity UI MCP? (200+ cinematic, 3D, parallax components)"; then
  add_mcp "aceternity" "npx" '["-y","aceternityui-mcp@latest"]'
fi

# Dembrandt
if ask "Install Dembrandt MCP? (extract design tokens from any website)"; then
  add_mcp "dembrandt" "npx" '["-y","dembrandt-mcp"]'
fi

# Glance (headless by default)
if ask "Install Glance MCP? (browser screenshots — Claude sees what it built)"; then
  python3 -c "
import json, os
path = os.path.expanduser('~/.claude.json')
try:
    with open(path) as f: d = json.load(f)
except: d = {}
if 'mcpServers' not in d: d['mcpServers'] = {}
if 'glance' not in d['mcpServers']:
    d['mcpServers']['glance'] = {'type': 'stdio', 'command': 'npx', 'args': ['-y', 'glance-mcp'], 'env': {'BROWSER_HEADLESS': 'true', 'BROWSER_LAZY': 'true'}}
    with open(path, 'w') as f: json.dump(d, f, indent=2)
    print('  [+] Added MCP: glance (headless mode)')
else:
    print('  [*] MCP already configured: glance')
" 2>/dev/null
fi

# ── Step 6: Environment ───────────────────────────────────
echo -e "\n  ${BOLD}Step 6/7: Environment${NC}"

if ! grep -q "ENABLE_LSP_TOOL" "$SHELL_RC" 2>/dev/null; then
  echo 'export ENABLE_LSP_TOOL=1' >> "$SHELL_RC"
  success "Added ENABLE_LSP_TOOL=1 to $SHELL_RC"
else
  success "ENABLE_LSP_TOOL already set"
fi

# ── Step 7: .claudeignore template ─────────────────────────
echo -e "\n  ${BOLD}Step 7/7: .claudeignore${NC}"
info "Copy config/.claudeignore.template to your project roots as .claudeignore"
info "This prevents Claude from reading build artifacts, node_modules, etc."

# ── Done ───────────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}${BOLD}============================================"
echo "         Installation Complete!"
echo -e "  ============================================${NC}"
echo ""
success "What was installed:"
echo -e "    ${GREEN}+${NC} $count agents in ~/.claude/agents/"
echo -e "    ${GREEN}+${NC} CLAUDE.md template (~55 lines)"
echo -e "    ${GREEN}+${NC} Hooks merged into settings.json"
echo -e "    ${GREEN}+${NC} 6 official plugins enabled"
echo -e "    ${GREEN}+${NC} MCP servers configured in ~/.claude.json"
echo -e "    ${GREEN}+${NC} ENABLE_LSP_TOOL=1 in $SHELL_RC"
echo ""
warn "Manual steps remaining:"
echo -e "    ${YELLOW}1.${NC} Restart Claude Code"
echo -e "    ${YELLOW}2.${NC} Install community plugins via /plugin:"
echo -e "       - claude-mem (thedotmack)"
echo -e "       - caveman (JuliusBrussee)"
echo -e "       - everything-claude-code (affaan-m)"
echo -e "    ${YELLOW}3.${NC} In any project: say 'index this project' to build the code graph"
echo -e "    ${YELLOW}4.${NC} Copy .claudeignore template to your project roots"
echo ""
echo -e "  ${PURPLE}If this helped, star the repo: https://github.com/elixpo/claudeOps.elixpo${NC}"
echo ""
