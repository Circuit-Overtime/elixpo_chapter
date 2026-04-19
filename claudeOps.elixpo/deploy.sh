#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

# ── Load .env (SOPS-encrypted preferred, .env.local plaintext fallback) ──
load_env() {
  # SOPS-encrypted .env
  if [ -f .env ] && grep -q '^sops_' .env 2>/dev/null; then
    if ! command -v sops >/dev/null 2>&1; then
      echo -e "${RED}[-]${NC} .env is SOPS-encrypted but sops is not installed"
      echo -e "    Install: https://github.com/getsops/sops/releases"
      exit 1
    fi
    local decrypted
    decrypted=$(sops -d .env 2>/dev/null) || {
      echo -e "${RED}[-]${NC} Failed to decrypt .env. Check SOPS_AGE_KEY_FILE / ~/.config/sops/age/keys.txt"
      exit 1
    }
    set -a
    eval "$decrypted"
    set +a
    return
  fi
  # Plaintext .env
  if [ -f .env ]; then
    set -a; source .env; set +a
    return
  fi
  # Local override
  if [ -f .env.local ]; then
    set -a; source .env.local; set +a
    return
  fi
  echo -e "${RED}[-]${NC} No .env or .env.local found. Create one with NPM_TOKEN=your_token"
  exit 1
}
load_env

if [ -z "${NPM_TOKEN:-}" ]; then
  echo -e "${RED}[-]${NC} NPM_TOKEN not set in .env"
  exit 1
fi

# ── Preflight checks ─────────────────────────────────────
echo ""
echo -e "${BOLD}ClaudeOps Deploy${NC}"
echo "────────────────"
echo ""

# Validate package
node -c cli.js 2>/dev/null || { echo -e "${RED}[-]${NC} cli.js has syntax errors"; exit 1; }
for f in lib/*.js; do
  node -c "$f" 2>/dev/null || { echo -e "${RED}[-]${NC} $f has syntax errors"; exit 1; }
done
echo -e "${GREEN}[+]${NC} All JS files valid"

NAME=$(node -p "require('./package.json').name")

# ── Bump patch version ────────────────────────────────────
OLD_VERSION=$(node -p "require('./package.json').version")
VERSION=$(node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const parts = pkg.version.split('.').map(Number);
parts[2]++;
pkg.version = parts.join('.');
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(pkg.version);
")
echo -e "${CYAN}[*]${NC} Version bump: ${OLD_VERSION} → ${VERSION}"
echo -e "${CYAN}[*]${NC} Package: ${NAME}@${VERSION}"

# ── Publish ───────────────────────────────────────────────
echo ""
echo -e "${CYAN}[*]${NC} Publishing to npm..."

npm publish --access public --registry https://registry.npmjs.org/ --//registry.npmjs.org/:_authToken="${NPM_TOKEN}"

echo ""
echo -e "${GREEN}[+]${NC} Published ${NAME}@${VERSION}"
echo -e "${CYAN}[*]${NC} https://www.npmjs.com/package/${NAME}"

# ── Commit version bump + tag ─────────────────────────────
echo ""
git add package.json
git commit -m "chore: bump version to ${VERSION}"
git tag "v${VERSION}"
echo -e "${GREEN}[+]${NC} Committed and tagged v${VERSION}"

echo -ne "${CYAN}[?]${NC} Push commit + tag to remote? (y/n): "
read -r ans
if [[ "$ans" =~ ^[Yy] ]]; then
  git push && git push origin "v${VERSION}"
  echo -e "${GREEN}[+]${NC} Pushed to remote"
fi

echo ""
