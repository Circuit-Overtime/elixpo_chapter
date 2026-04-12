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
#                       Targets: editor, web, all (default: all)
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
#   GITHUB_ACCESS_TOKEN  → gh release create + GitHub Packages
#
# Examples:
#   ./deploy.sh deploy                    # Quick website deploy
#   ./deploy.sh release all --minor       # Release everything with minor bump
#   ./deploy.sh release editor --patch   # Publish lixeditor to npm + GitHub
#   ./deploy.sh release web               # Deploy website only
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
  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    export "$line" 2>/dev/null || true
  done < "$ENV_FILE"
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

    echo "  -> $key (collab worker)"
    printf '%s\n' "$value" | sudo npx wrangler versions secret put "$key" --name elixpoblogs-collab || echo "    [warn] collab worker secret failed for $key"
    echo "  -> $key (pages)"
    printf '%s\n' "$value" | sudo npx wrangler pages secret put "$key" --project-name "$PAGES_PROJECT" || echo "    [warn] pages secret failed for $key"

    # Only push to cron worker if it's enabled
    if grep -q 'ENABLE_WEEKLY_DIGEST=true' "$ENV_FILE" 2>/dev/null; then
      echo "  -> $key (cron worker)"
      printf '%s\n' "$value" | sudo npx wrangler versions secret put "$key" --name elixpoblogs-cron || echo "    [warn] cron worker secret failed for $key"
    fi
  done < "$ENV_FILE"

  echo "==> Secrets uploaded to Workers + Pages."
}

build() {
  echo "==> Building for Cloudflare Pages..."
  sudo npm version patch --no-git-tag-version
  sudo npm run pages:build
  echo "==> Build complete (.vercel/output/static)"
}

sync_d1() {
  echo "==> Syncing local D1 to remote..."
  LOCAL_DB="$SCRIPT_DIR/.wrangler/state/v3/d1/miniflare-D1DatabaseObject"
  DB_FILE=$(find "$LOCAL_DB" -name "*.sqlite" 2>/dev/null | head -1)

  if [ -z "$DB_FILE" ]; then
    echo "  [skip] No local D1 database found"
    return
  fi

  # Get all user-created tables (exclude internal ones)
  TABLES=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%' AND name != 'd1_migrations' ORDER BY name;")

  if [ -z "$TABLES" ]; then
    echo "  [skip] No tables to sync"
    return
  fi

  DUMP_FILE="/tmp/d1_sync_$(date +%s).sql"
  > "$DUMP_FILE"

  for tbl in $TABLES; do
    COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM $tbl;")
    [ "$COUNT" -eq 0 ] && continue

    COLS=$(sqlite3 "$DB_FILE" "PRAGMA table_info($tbl);" | cut -d'|' -f2 | paste -sd,)
    sqlite3 "$DB_FILE" -separator '|' "SELECT * FROM $tbl;" | while IFS= read -r row; do
      VALS=$(echo "$row" | awk -F'|' '{
        for(i=1;i<=NF;i++) {
          gsub(/\047/, "\047\047", $i)
          if(i>1) printf ","
          if($i=="") printf "NULL"
          else printf "\047%s\047", $i
        }
      }')
      echo "INSERT OR REPLACE INTO $tbl ($COLS) VALUES ($VALS);" >> "$DUMP_FILE"
    done
    echo "  -> $tbl ($COUNT rows)"
  done

  LINES=$(wc -l < "$DUMP_FILE")
  if [ "$LINES" -eq 0 ]; then
    echo "  [skip] No data to sync"
    rm -f "$DUMP_FILE"
    return
  fi

  sudo npx wrangler d1 execute elixpoblogs --remote --file="$DUMP_FILE" 2>&1 | tail -3
  rm -f "$DUMP_FILE"
  echo "==> D1 sync complete."
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

  # Sync local D1 to remote
  sync_d1

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
  echo "==> Deploying Worker (elixpoblogs-collab)..."
  cd "$SCRIPT_DIR/worker/collab" && sudo npx wrangler deploy
  cd "$SCRIPT_DIR"
  echo "==> Collab worker deployed."

  # Cron worker — only deploy if digest is enabled
  if grep -q 'ENABLE_WEEKLY_DIGEST=true' "$ENV_FILE" 2>/dev/null; then
    echo "==> Deploying Worker (elixpoblogs-cron)..."
    cd "$SCRIPT_DIR/worker/cron" && sudo npx wrangler deploy
    cd "$SCRIPT_DIR"
    echo "==> Cron worker deployed."
  else
    echo "==> Skipping cron worker (ENABLE_WEEKLY_DIGEST is not true)"
  fi
}

# ── Release Commands ─────────────────────────────────────────

generate_changelog() {
  if $SKIP_CHANGELOG; then
    echo "==> Skipping changelog generation"
    return
  fi

  echo "==> Generating changelog..."

  local DATE
  DATE=$(date +%Y-%m-%d)

  # Simple changelog — just list recent commits
  local COMMITS
  COMMITS=$(git log --oneline -20 2>/dev/null || echo "No commits found")

  local ENTRY
  ENTRY="
## v${NEW_VERSION} ($DATE)

${COMMITS}
"

  if [ -f "$SCRIPT_DIR/CHANGELOG.md" ]; then
    local EXISTING
    EXISTING=$(cat "$SCRIPT_DIR/CHANGELOG.md")
    printf "# Changelog\n%s\n%s" "$ENTRY" "$EXISTING" > "$SCRIPT_DIR/CHANGELOG.md"
  else
    printf "# Changelog\n%s\n" "$ENTRY" > "$SCRIPT_DIR/CHANGELOG.md"
  fi

  echo "==> Changelog updated"
}

do_release() {
  local BUMP="patch"
  local DRY_RUN=false
  local SKIP_CHANGELOG=false
  local RELEASE_NPM=false
  local RELEASE_GITHUB=false
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
      editor) TARGETS+=("editor") ;;
      npm)    TARGETS+=("npm") ;;
      github) TARGETS+=("github") ;;
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
      editor) RELEASE_NPM=true; RELEASE_GITHUB=true ;;
      npm)    RELEASE_NPM=true ;;
      github) RELEASE_GITHUB=true ;;
      vscode) RELEASE_VSCODE=true ;;
      web)    RELEASE_WEB=true ;;
      all)    RELEASE_NPM=true; RELEASE_GITHUB=true; RELEASE_VSCODE=true; RELEASE_WEB=true ;;
    esac
  done

  # ── Load tokens from .env ──
  load_env
  local _NPM_TOKEN="${NPM_TOKEN:-}"
  local _GH_TOKEN="${GITHUB_ACCESS_TOKEN:-}"
  local _VSCE_PAT="${VSCE_PAT:-}"

  # Validate tokens based on targets
  if $RELEASE_NPM && [ -z "$_NPM_TOKEN" ]; then echo "Error: NPM_TOKEN not set in .env"; exit 1; fi
  if $RELEASE_GITHUB && [ -z "$_GH_TOKEN" ]; then echo "Error: GITHUB_ACCESS_TOKEN not set in .env"; exit 1; fi
  if $RELEASE_VSCODE && [ -z "$_VSCE_PAT" ]; then echo "Error: VSCE_PAT not set in .env"; exit 1; fi

  echo "==> Tokens loaded from .env"

  # ── Version Bump ──
  echo "==> Bumping versions ($BUMP)..."

  if $RELEASE_NPM || $RELEASE_GITHUB; then
    dry_run "cd '$SCRIPT_DIR/packages/lixeditor' && sudo npm version $BUMP --no-git-tag-version && cd '$SCRIPT_DIR'"
  fi
  if $RELEASE_WEB; then
    dry_run "sudo npm version $BUMP --no-git-tag-version"
  fi

  if $RELEASE_NPM || $RELEASE_GITHUB; then
    NEW_VERSION=$(node -p "require('./packages/lixeditor/package.json').version" 2>/dev/null || echo "0.0.0")
  elif $RELEASE_VSCODE; then
    NEW_VERSION=$(node -p "require('./packages/vscode-lixeditor/package.json').version" 2>/dev/null || echo "0.0.0")
  else
    NEW_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")
  fi

  echo "==> New version: v${NEW_VERSION}"

  # ── Changelog ──
  generate_changelog

  # ── Build (needed for both npm and github) ──
  if $RELEASE_NPM || $RELEASE_GITHUB; then
    echo ""
    echo "==> Building @elixpo/lixeditor..."
    dry_run "cd '$SCRIPT_DIR/packages/lixeditor' && npm run build"
    echo "    ✓ Build complete"
  fi

  # ── Publish to npm ──
  if $RELEASE_NPM; then
    echo ""
    echo "==> Publishing @elixpo/lixeditor to npm..."
    set +e
    dry_run "cd '$SCRIPT_DIR/packages/lixeditor' && sudo npm publish --access public --registry https://registry.npmjs.org/ --//registry.npmjs.org/:_authToken='$_NPM_TOKEN'"
    if [ $? -eq 0 ]; then echo "    ✓ npm publish complete"; else echo "    ✗ npm publish failed"; fi
    set -e
  fi

  # ── Publish to GitHub Packages ──
  if $RELEASE_GITHUB; then
    echo ""
    echo "==> Publishing @elixpo/lixeditor to GitHub Packages..."
    set +e
    # Write a temp .npmrc for GitHub Packages auth
    local EDITOR_DIR="$SCRIPT_DIR/packages/lixeditor"
    local NPMRC_BAK=""
    if [ -f "$EDITOR_DIR/.npmrc" ]; then
      NPMRC_BAK=$(cat "$EDITOR_DIR/.npmrc")
    fi
    printf "@elixpo:registry=https://npm.pkg.github.com/\n//npm.pkg.github.com/:_authToken=%s\n" "$_GH_TOKEN" > "$EDITOR_DIR/.npmrc"

    dry_run "cd '$EDITOR_DIR' && sudo npm publish --access public"
    if [ $? -eq 0 ]; then echo "    ✓ GitHub Packages publish complete"; else echo "    ✗ GitHub Packages publish failed"; fi

    # Restore or remove .npmrc
    if [ -n "$NPMRC_BAK" ]; then
      echo "$NPMRC_BAK" > "$EDITOR_DIR/.npmrc"
    else
      rm -f "$EDITOR_DIR/.npmrc"
    fi
    set -e
  fi

  # ── Publish VS Code Extension ──
  if $RELEASE_VSCODE; then
    echo ""
    echo "==> [1/3] Bumping VS Code extension version ($BUMP)..."
    dry_run "cd '$SCRIPT_DIR/packages/vscode-lixeditor' && sudo npm version $BUMP --no-git-tag-version && cd '$SCRIPT_DIR'"

    local VSCODE_VERSION
    VSCODE_VERSION=$(node -p "require('./packages/vscode-lixeditor/package.json').version" 2>/dev/null || echo "0.0.0")
    echo "    Extension version: $VSCODE_VERSION"

    echo ""
    echo "==> [2/3] Building VS Code extension..."
    dry_run "cd '$SCRIPT_DIR/packages/vscode-lixeditor' && npm run build"

    echo ""
    echo "==> [3/3] Publishing LixEditor to VS Code Marketplace..."
    set +e
    dry_run "cd '$SCRIPT_DIR/packages/vscode-lixeditor' && npx @vscode/vsce package --no-dependencies && npx @vscode/vsce publish --no-dependencies --pat '$_VSCE_PAT'"
    if [ $? -eq 0 ]; then echo "    ✓ VS Code extension v$VSCODE_VERSION published"; else echo "    ✗ VS Code extension publish failed"; fi
    set -e
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

  # ── GitHub Release (skipped — using GitHub Packages instead) ──

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Release v${NEW_VERSION} complete!"
  echo ""
  $RELEASE_NPM    && echo "  - @elixpo/lixeditor published to npm"
  $RELEASE_GITHUB && echo "  - @elixpo/lixeditor published to GitHub Packages"
  $RELEASE_VSCODE && echo "  - LixEditor VS Code extension published"
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
  echo "                      Targets: editor (npm+github), npm, github, web, all"
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
  echo "  GITHUB_ACCESS_TOKEN GitHub release creation"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh deploy                     # Quick website deploy"
  echo "  ./deploy.sh release all --minor        # Release everything"
  echo "  ./deploy.sh release editor --patch     # Publish lixeditor to npm + GitHub"
  echo "  ./deploy.sh release npm --patch        # Publish lixeditor to npm only"
  echo "  ./deploy.sh release github --patch     # Publish lixeditor to GitHub Packages only"
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
    sync)    sync_d1 ;;
    all)     worker; secrets; deploy ;;
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
