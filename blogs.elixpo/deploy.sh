#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LixBlogs Deploy & Release
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Usage: ./deploy.sh [command ...] [options]
#
# Infra Commands:
#   deploy      Build & deploy website to Cloudflare Pages
#   worker      Deploy the collab Worker
#   secrets     Upload .env vars to Worker + Pages
#   build       Build Pages only (no deploy)
#
# Release Commands:
#   release [targets]   Full release with version bump + changelog + publish
#                       Targets: engine, vscode, web, all (default: all)
#
# Options (for release):
#   --patch     Patch version bump (default)
#   --minor     Minor version bump
#   --major     Major version bump
#   --dry-run   Print what would happen, don't execute
#   --skip-changelog  Skip changelog generation
#
# Shorthand:
#   all         secrets + worker + deploy (infra only, no release)
#
# Auth tokens are read automatically from .env:
#   NPM_TOKEN            → npm publish
#   VSCE_PAT             → VS Code extension publish
#   GITHUB_ACCESS_TOKEN  → gh release create
#
# Examples:
#   ./deploy.sh deploy                    # Quick website deploy
#   ./deploy.sh release all --minor       # Release everything with minor bump
#   ./deploy.sh release engine --patch    # Publish npm package only
#   ./deploy.sh release vscode            # Publish VS Code extension only
#   ./deploy.sh release all --dry-run     # Preview full release
#   ./deploy.sh all                       # Infra: secrets + worker + deploy

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
PAGES_PROJECT="lixblogs"
PAGES_BRANCH="main"

# ── Helpers ──────────────────────────────────────────────────

load_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env not found at $ENV_FILE"
    exit 1
  fi
  set -a
  source "$ENV_FILE"
  set +a
}

get_binding_ids() {
  load_env
  D1_DB_ID="${D1_DATABASE_ID:?D1_DATABASE_ID not set in .env}"
  KV_ID="${KV_NAMESPACE_ID:?KV_NAMESPACE_ID not set in .env}"
}

dry_run() {
  if $DRY_RUN; then
    echo "[dry-run] $*"
  else
    eval "$@"
  fi
}

auth_remote() {
  local url
  url=$(git remote get-url origin)
  echo "${url/https:\/\//https:\/\/${GITHUB_ACCESS_TOKEN}@}"
}

# ── Infra Commands ───────────────────────────────────────────

secrets() {
  echo "==> Uploading secrets from .env..."
  load_env

  while IFS='=' read -r key value; do
    [[ -z "$key" || "$key" =~ ^# || "$key" =~ ^NEXT_PUBLIC_ ]] && continue
    [[ "$key" =~ ^(CLOUDFLARE_ACCOUNT|D1_DATABASE_ID|KV_NAMESPACE_ID)$ ]] && continue

    echo "  -> $key (worker)"
    printf '%s\n' "$value" | sudo npx wrangler versions secret put "$key" --name lixblogs-collab || echo "    [warn] worker secret failed for $key"
    echo "  -> $key (pages)"
    printf '%s\n' "$value" | sudo npx wrangler pages secret put "$key" --project-name "$PAGES_PROJECT" || echo "    [warn] pages secret failed for $key"
  done < "$ENV_FILE"

  echo "==> Secrets uploaded to Worker + Pages."
}

build() {
  echo "==> Building for Cloudflare Pages..."
  sudo npm version patch --no-git-tag-version
  sudo npm run pages:build
  echo "==> Build complete (.vercel/output/static)"
}

deploy() {
  if [ ! -d "$SCRIPT_DIR/.vercel/output/static" ]; then
    echo "==> No build found, building first..."
    build
  fi

  echo "==> Deploying to Cloudflare Pages ($PAGES_PROJECT)..."
  sudo npx wrangler pages deploy .vercel/output/static \
    --project-name "$PAGES_PROJECT" \
    --branch "$PAGES_BRANCH"

  echo "==> Pages deploy complete."

  VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
  sudo git add -A
  if sudo git diff --cached --quiet; then
    echo "==> No changes to commit."
  else
    sudo git commit -m "deploy: v${VERSION}"
    load_env
    sudo git push "$(auth_remote)" main
    echo "==> Pushed v${VERSION} to origin/main."
  fi
}

worker() {
  echo "==> Deploying Worker (lixblogs-collab)..."
  cd "$SCRIPT_DIR/worker/collab" && sudo npx wrangler deploy
  cd "$SCRIPT_DIR"
  echo "==> Worker deploy complete."
}

# ── Release Commands ─────────────────────────────────────────

generate_changelog() {
  if $SKIP_CHANGELOG; then
    echo "==> Skipping changelog generation"
    return
  fi

  echo "==> Generating changelog..."

  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -z "$LAST_TAG" ]; then
    RANGE="HEAD"
  else
    RANGE="${LAST_TAG}..HEAD"
  fi

  local DATE
  DATE=$(date +%Y-%m-%d)

  FEATS=$(git log "$RANGE" --oneline --format='%s' 2>/dev/null | grep -E '^feat' | sed 's/^feat(\([^)]*\)): /- **\1**: /' | sed 's/^feat: /- /' || true)
  FIXES=$(git log "$RANGE" --oneline --format='%s' 2>/dev/null | grep -E '^fix' | sed 's/^fix(\([^)]*\)): /- **\1**: /' | sed 's/^fix: /- /' || true)
  OTHER=$(git log "$RANGE" --oneline --format='%s' 2>/dev/null | grep -vE '^(feat|fix|docs|chore|ci|style|refactor|test)' || true)

  {
    echo ""
    echo "## v${NEW_VERSION} ($DATE)"
    echo ""
    if [ -n "$FEATS" ]; then
      echo "### Features"
      echo "$FEATS"
      echo ""
    fi
    if [ -n "$FIXES" ]; then
      echo "### Fixes"
      echo "$FIXES"
      echo ""
    fi
    if [ -n "$OTHER" ] && [ "$(echo "$OTHER" | wc -l)" -gt 0 ]; then
      echo "### Other"
      echo "$OTHER" | head -10 | sed 's/^/- /'
      echo ""
    fi
  } > /tmp/changelog_entry.md

  if [ -f "$SCRIPT_DIR/CHANGELOG.md" ]; then
    head -1 "$SCRIPT_DIR/CHANGELOG.md" > /tmp/cl_head.md
    cat /tmp/changelog_entry.md > /tmp/cl_new.md
    tail -n +2 "$SCRIPT_DIR/CHANGELOG.md" > /tmp/cl_tail.md
    cat /tmp/cl_head.md /tmp/cl_new.md /tmp/cl_tail.md > "$SCRIPT_DIR/CHANGELOG.md"
  else
    echo "# Changelog" > "$SCRIPT_DIR/CHANGELOG.md"
    cat /tmp/changelog_entry.md >> "$SCRIPT_DIR/CHANGELOG.md"
  fi

  echo "==> Changelog updated"
}

do_release() {
  local BUMP="patch"
  local DRY_RUN=false
  local SKIP_CHANGELOG=false
  local RELEASE_ENGINE=false
  local RELEASE_VSCODE=false
  local RELEASE_WEB=false
  local TARGETS=()

  # Parse release sub-args
  for arg in "$@"; do
    case "$arg" in
      --patch)  BUMP="patch" ;;
      --minor)  BUMP="minor" ;;
      --major)  BUMP="major" ;;
      --dry-run) DRY_RUN=true ;;
      --skip-changelog) SKIP_CHANGELOG=true ;;
      engine) TARGETS+=("engine") ;;
      vscode) TARGETS+=("vscode") ;;
      web)    TARGETS+=("web") ;;
      all)    TARGETS+=("all") ;;
    esac
  done

  # Default to 'all'
  if [ ${#TARGETS[@]} -eq 0 ]; then
    TARGETS=("all")
  fi

  for t in "${TARGETS[@]}"; do
    case "$t" in
      engine) RELEASE_ENGINE=true ;;
      vscode) RELEASE_VSCODE=true ;;
      web)    RELEASE_WEB=true ;;
      all)    RELEASE_ENGINE=true; RELEASE_VSCODE=true; RELEASE_WEB=true ;;
    esac
  done

  # ── Load tokens from .env ──
  load_env
  local _NPM_TOKEN="${NPM_TOKEN:?NPM_TOKEN not set in .env}"
  local _VSCE_PAT="${VSCE_PAT:?VSCE_PAT not set in .env}"
  local _GH_TOKEN="${GITHUB_ACCESS_TOKEN:?GITHUB_ACCESS_TOKEN not set in .env}"

  echo "==> Tokens loaded from .env"

  # ── Version Bump ──
  echo "==> Bumping versions ($BUMP)..."

  if $RELEASE_ENGINE; then
    dry_run "sudo npm version $BUMP --no-git-tag-version -w packages/lixsketch"
  fi
  if $RELEASE_VSCODE; then
    dry_run "sudo npm version $BUMP --no-git-tag-version -w packages/vscode"
  fi
  if $RELEASE_WEB; then
    dry_run "sudo npm version $BUMP --no-git-tag-version"
  fi

  if $RELEASE_ENGINE; then
    NEW_VERSION=$(node -p "require('./packages/lixsketch/package.json').version" 2>/dev/null || echo "0.0.0")
  else
    NEW_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")
  fi

  echo "==> New version: v${NEW_VERSION}"

  # ── Changelog ──
  generate_changelog

  # ── Build & Publish ──
  if $RELEASE_ENGINE; then
    echo "==> Publishing @elixpo/lixsketch to npm..."
    dry_run "cd '$SCRIPT_DIR/packages/lixsketch' && sudo NPM_TOKEN='$_NPM_TOKEN' npm publish --access public --registry https://registry.npmjs.org/ --//registry.npmjs.org/:_authToken='$_NPM_TOKEN'"
    echo "==> Publishing @elixpo/lixsketch to GitHub Packages..."
    dry_run "cd '$SCRIPT_DIR/packages/lixsketch' && sudo npm publish --access public --registry https://npm.pkg.github.com/ --//npm.pkg.github.com/:_authToken='$_GH_TOKEN'"
    echo "==> Engine published (npm + GitHub Packages)"
  fi

  if $RELEASE_VSCODE; then
    echo "==> Building VS Code extension..."
    dry_run "cd '$SCRIPT_DIR/packages/vscode' && sudo npm run build"
    echo "==> Packaging & publishing VS Code extension..."
    dry_run "cd '$SCRIPT_DIR/packages/vscode' && sudo npx @vscode/vsce package --no-dependencies && sudo VSCE_PAT='$_VSCE_PAT' npx @vscode/vsce publish --no-dependencies --pat '$_VSCE_PAT'"
    echo "==> VS Code extension published"
  fi

  if $RELEASE_WEB; then
    echo "==> Building & deploying website..."
    dry_run "cd '$SCRIPT_DIR' && sudo npm run pages:build"
    dry_run "cd '$SCRIPT_DIR' && sudo npx wrangler pages deploy .vercel/output/static --project-name lixblogs --branch main"
    echo "==> Website deployed"
  fi

  # ── Git Tag & Push ──
  echo "==> Committing and tagging v${NEW_VERSION}..."
  dry_run "sudo git add -A"
  dry_run "sudo git commit -m 'release: v${NEW_VERSION}' || true"
  dry_run "sudo git tag 'v${NEW_VERSION}'"
  dry_run "sudo git push \"\$(auth_remote)\" main --tags"

  # ── GitHub Release ──
  echo "==> Creating GitHub release..."
  dry_run "sudo GH_TOKEN='$_GH_TOKEN' GITHUB_TOKEN='$_GH_TOKEN' gh release create 'v${NEW_VERSION}' --generate-notes --title 'v${NEW_VERSION}'"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Release v${NEW_VERSION} complete!"
  echo ""
  $RELEASE_ENGINE && echo "  - @elixpo/lixsketch published to npm"
  $RELEASE_VSCODE && echo "  - LixSketch VS Code extension published"
  $RELEASE_WEB    && echo "  - Website deployed to Cloudflare Pages"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ── Usage ────────────────────────────────────────────────────

usage() {
  echo "Usage: ./deploy.sh [command ...] [options]"
  echo ""
  echo "Infra Commands:"
  echo "  deploy              Build & deploy website to Cloudflare Pages"
  echo "  worker              Deploy the collab Worker"
  echo "  secrets             Upload .env vars to Worker + Pages"
  echo "  build               Build Pages only (no deploy)"
  echo "  all                 secrets + worker + deploy"
  echo ""
  echo "Release Commands:"
  echo "  release [targets]   Full release with version bump + changelog + publish"
  echo "                      Targets: engine, vscode, web, all (default: all)"
  echo ""
  echo "Release Options:"
  echo "  --patch             Patch version bump (default)"
  echo "  --minor             Minor version bump"
  echo "  --major             Major version bump"
  echo "  --dry-run           Preview without executing"
  echo "  --skip-changelog    Skip changelog generation"
  echo ""
  echo "Auth (auto-loaded from .env):"
  echo "  NPM_TOKEN           npm publish authentication"
  echo "  VSCE_PAT            VS Code Marketplace publish"
  echo "  GITHUB_ACCESS_TOKEN GitHub release creation"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh deploy                     # Quick website deploy"
  echo "  ./deploy.sh release all --minor        # Release everything"
  echo "  ./deploy.sh release engine --patch     # Publish npm package only"
  echo "  ./deploy.sh release vscode             # Publish VS Code extension"
  echo "  ./deploy.sh release all --dry-run      # Preview full release"
}

# ── Entrypoint ───────────────────────────────────────────────

# DRY_RUN default for non-release commands
DRY_RUN=false
SKIP_CHANGELOG=false
NEW_VERSION=""

run_command() {
  case "$1" in
    deploy)  deploy ;;
    worker)  worker ;;
    secrets) secrets ;;
    build)   build ;;
    all)     secrets; worker; deploy ;;
    release) shift; do_release "$@"; exit 0 ;;
    -h|--help|help) usage ;;
    *)
      echo "Unknown command: $1"
      usage
      exit 1
      ;;
  esac
}

if [ $# -eq 0 ]; then
  deploy
elif [ "$1" = "release" ]; then
  shift
  do_release "$@"
else
  for cmd in "$@"; do
    run_command "$cmd"
  done
fi
