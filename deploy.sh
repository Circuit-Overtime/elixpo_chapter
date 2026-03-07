#!/usr/bin/env bash
# Usage:
#   ./deploy.sh              — runs all steps: secrets + build + deploy
#   ./deploy.sh secrets      — push .env secrets to Cloudflare
#   ./deploy.sh build        — build for Cloudflare Pages
#   ./deploy.sh deploy       — deploy built output to Cloudflare Pages
#   ./deploy.sh build deploy — build then deploy (skip secrets)

set -euo pipefail

PROJECT="elixpo-accounts"
ENV_FILE=".env"

# ── Commands ──────────────────────────────────────────────────────────

push_secrets() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
  fi

  echo "=== Pushing secrets to Cloudflare Pages ==="
  count=0
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue

    key="${line%%=*}"
    value="${line#*=}"

    # Strip surrounding quotes
    value="${value#\"}"
    value="${value%\"}"

    # NEXT_PUBLIC_ vars are baked at build time, not runtime secrets
    [[ "$key" == NEXT_PUBLIC_* ]] && continue

    echo "  Setting: $key"
    echo "$value" | npx wrangler pages secret put "$key" --project-name "$PROJECT" 2>&1
    count=$((count + 1))
  done < "$ENV_FILE"
  echo "Pushed $count secrets."
  echo ""
}

do_build() {
  echo "=== Building for Cloudflare Pages ==="
  sudo npm run build
  echo "Build complete."
  echo ""
}

do_deploy() {
  if [ ! -d ".vercel/output/static" ]; then
    echo "Error: .vercel/output/static not found. Run './deploy.sh build' first."
    exit 1
  fi

  echo "=== Deploying to Cloudflare Pages ==="
  npx wrangler pages deploy ./.vercel/output/static --project-name "$PROJECT"
  echo "Deploy complete."
  echo ""
}

# ── Entry point ───────────────────────────────────────────────────────

# No args = run everything
if [ $# -eq 0 ]; then
  push_secrets
  do_build
  do_deploy
  exit 0
fi

# Run only the requested steps, in order
for cmd in "$@"; do
  case "$cmd" in
    secrets) push_secrets ;;
    build)   do_build ;;
    deploy)  do_deploy ;;
    *)
      echo "Unknown command: $cmd"
      echo "Usage: ./deploy.sh [secrets] [build] [deploy]"
      exit 1
      ;;
  esac
done
