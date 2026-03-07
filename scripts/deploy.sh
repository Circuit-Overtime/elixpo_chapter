#!/usr/bin/env bash
# Pushes .env secrets to Cloudflare, builds, and deploys.
# Usage: ./scripts/push-secrets.sh

set -euo pipefail

PROJECT="elixpo-accounts"
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# ── 1. Push secrets ──────────────────────────────────────────────────
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

# ── 2. Build ─────────────────────────────────────────────────────────
echo "=== Building for Cloudflare Pages ==="
npm run pages:build
echo "Build complete."
echo ""

# ── 3. Deploy ─────────────────────────────────────────────────────────
echo "=== Deploying to Cloudflare Pages ==="
npx wrangler pages deploy .vercel/output/static --project-name "$PROJECT"
echo ""
echo "Deploy complete."
