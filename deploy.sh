#!/usr/bin/env bash
set -euo pipefail

# LixSketch deploy script
# Usage: ./deploy.sh [command]
#
# Commands:
#   deploy      Build & deploy Next.js to Cloudflare Pages
#   worker      Deploy the collab Worker
#   secrets     Upload .env vars as secrets to Worker + Pages
#   all         secrets + worker + deploy
#   build       Build Pages only (no deploy)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
PAGES_PROJECT="lixsketch"
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

# Pull D1 and KV IDs from .env (loaded by load_env)
get_binding_ids() {
  load_env
  D1_DB_ID="${D1_DATABASE_ID:?D1_DATABASE_ID not set in .env}"
  KV_ID="${KV_NAMESPACE_ID:?KV_NAMESPACE_ID not set in .env}"
}

# ── Commands ─────────────────────────────────────────────────

# Upload secrets to both Worker and Pages project
secrets() {
  echo "==> Uploading secrets from .env..."
  load_env

  while IFS='=' read -r key value; do
    # Skip blanks, comments, and NEXT_PUBLIC_ vars
    [[ -z "$key" || "$key" =~ ^# || "$key" =~ ^NEXT_PUBLIC_ ]] && continue
    # Skip infra IDs that aren't secrets
    [[ "$key" =~ ^(CLOUDFLARE_ACCOUNT|D1_DATABASE_ID|KV_NAMESPACE_ID)$ ]] && continue

    echo "  -> $key (worker)"
    printf '%s\n' "$value" | sudo npx wrangler versions secret put "$key" --name lixsketch-collab || echo "    [warn] worker secret failed for $key"
    echo "  -> $key (pages)"
    printf '%s\n' "$value" | sudo npx wrangler pages secret put "$key" --project-name "$PAGES_PROJECT" || echo "    [warn] pages secret failed for $key"
  done < "$ENV_FILE"

  echo "==> Secrets uploaded to Worker + Pages."
}

# Build Next.js for Cloudflare Pages
build() {
  echo "==> Building for Cloudflare Pages..."
  sudo npm version patch --no-git-tag-version
  sudo npx @cloudflare/next-on-pages

  echo "==> Build complete (.vercel/output/static)"
}

# Deploy to Cloudflare Pages
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

  # Commit version bump + source changes (skip build artifacts, .env, node_modules)
  VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
  git add -A -- ':!.vercel' ':!node_modules' ':!.env' ':!.env.*'
  if git diff --cached --quiet; then
    echo "==> No changes to commit."
  else
    git commit -m "deploy: v${VERSION}"
    git push origin main
    echo "==> Pushed v${VERSION} to origin/main."
  fi
}

# Deploy the collab Worker
worker() {
  echo "==> Deploying Worker (lixsketch-collab)..."
  sudo npx wrangler deploy
  echo "==> Worker deploy complete."
}

# ── Entrypoint ───────────────────────────────────────────────

usage() {
  echo "Usage: ./deploy.sh [command ...]"
  echo ""
  echo "Commands:"
  echo "  deploy    Build & deploy Next.js to Cloudflare Pages"
  echo "  worker    Deploy the collab Worker"
  echo "  secrets   Upload .env vars to Worker + Pages"
  echo "  build     Build Pages only (no deploy)"
  echo "  all       secrets + worker + deploy"
  echo ""
  echo "Multiple commands can be chained: ./deploy.sh build deploy"
  echo "Default: deploy"
}

run_command() {
  case "$1" in
    deploy)  deploy ;;
    worker)  worker ;;
    secrets) secrets ;;
    build)   build ;;
    all)     secrets; worker; deploy ;;
    -h|--help|help) usage ;;
    *)
      echo "Unknown command: $1"
      usage
      exit 1
      ;;
  esac
}

# Default to deploy if no args
if [ $# -eq 0 ]; then
  deploy
else
  for cmd in "$@"; do
    run_command "$cmd"
  done
fi
