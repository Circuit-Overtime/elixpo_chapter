#!/usr/bin/env bash
set -euo pipefail

# LixSketch Cloudflare Worker deploy script
# Usage: ./deploy [upload|build|deploy|all]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Load .env
load_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
  fi
  set -a
  source "$ENV_FILE"
  set +a
}

# Upload all secrets to Cloudflare
upload() {
  echo "==> Uploading secrets to Cloudflare..."
  load_env

  echo "$ELIXPO_AUTH_CLIENT_ID"   | npx wrangler secret put ELIXPO_CLIENT_ID
  echo "$ELIXPO_AUTH_CLIENT_SECRET" | npx wrangler secret put ELIXPO_CLIENT_SECRET
  echo "$CLOUDINARY_KEY_"          | npx wrangler secret put CLOUDINARY_KEY
  echo "$CLOUDINARY_KEY_SECRET"    | npx wrangler secret put CLOUDINARY_SECRET
  echo "$SESSION_SECRET"           | npx wrangler secret put SESSION_SECRET

  echo "==> All secrets uploaded."
}

# Build the worker
build() {
  echo "==> Building worker..."
  npx wrangler deploy --dry-run --outdir=dist
  echo "==> Build complete. Output in dist/"
}

# Deploy to Cloudflare
deploy() {
  echo "==> Deploying to Cloudflare..."
  npx wrangler deploy
  echo "==> Deploy complete."
}

# Run D1 migrations
migrate() {
  echo "==> Running D1 migrations..."
  for f in "$SCRIPT_DIR"/worker/migrations/*.sql; do
    echo "    Applying $(basename "$f")..."
    npx wrangler d1 execute lixsketch --remote --file="$f"
  done
  echo "==> Migrations complete."
}

# Show usage
usage() {
  echo "Usage: ./deploy [command]"
  echo ""
  echo "Commands:"
  echo "  upload    Upload all secrets from .env to Cloudflare"
  echo "  build     Build the worker (dry-run)"
  echo "  deploy    Deploy worker to Cloudflare"
  echo "  migrate   Run D1 database migrations"
  echo "  all       upload + build + deploy"
  echo ""
  echo "No argument defaults to 'deploy'."
}

case "${1:-deploy}" in
  upload)  upload ;;
  build)   build ;;
  deploy)  deploy ;;
  migrate) migrate ;;
  all)     upload; build; deploy ;;
  -h|--help|help) usage ;;
  *)
    echo "Unknown command: $1"
    usage
    exit 1
    ;;
esac
