#!/usr/bin/env bash
set -euo pipefail

# LixSketch deploy script
# Usage: ./deploy.sh [command]
#
# Commands:
#   deploy      Build & deploy Next.js to Cloudflare Pages
#   worker      Deploy the collab Worker
#   secrets     Upload all non-public .env vars as Worker secrets
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

# ── Commands ─────────────────────────────────────────────────

# Upload every non-NEXT_PUBLIC_ var from .env as a Worker secret
secrets() {
  echo "==> Uploading secrets from .env..."
  load_env

  while IFS='=' read -r key value; do
    # Skip blanks, comments, and NEXT_PUBLIC_ vars
    [[ -z "$key" || "$key" =~ ^# || "$key" =~ ^NEXT_PUBLIC_ ]] && continue
    # Skip infra IDs that aren't secrets
    [[ "$key" =~ ^(CLOUDFLARE_ACCOUNT|D1_DATABASE_ID|KV_NAMESPACE_ID)$ ]] && continue

    echo "  -> $key"
    echo "$value" | sudo npx wrangler secret put "$key" 2>/dev/null
  done < "$ENV_FILE"

  echo "==> Secrets uploaded."
}

# Build Next.js for Cloudflare Pages
build() {
  echo "==> Building for Cloudflare Pages..."
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
}

# Deploy the collab Worker
worker() {
  echo "==> Deploying Worker (lixsketch-collab)..."
  sudo npx wrangler deploy
  echo "==> Worker deploy complete."
}

# ── Entrypoint ───────────────────────────────────────────────

usage() {
  echo "Usage: ./deploy.sh [command]"
  echo ""
  echo "Commands:"
  echo "  deploy    Build & deploy Next.js to Cloudflare Pages"
  echo "  worker    Deploy the collab Worker"
  echo "  secrets   Upload .env vars as Worker secrets"
  echo "  build     Build Pages only (no deploy)"
  echo "  all       secrets + worker + deploy"
  echo ""
  echo "Default: deploy"
}

case "${1:-deploy}" in
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
