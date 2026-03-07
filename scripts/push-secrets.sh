#!/usr/bin/env bash
# Reads every KEY=VALUE pair from .env and pushes them as Cloudflare Pages secrets.
# Usage: ./scripts/push-secrets.sh [project-name]

set -euo pipefail

PROJECT="${1:-elixpo-accounts}"
ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# Skip NEXT_PUBLIC_* vars — they are baked in at build time, not runtime secrets
# Skip blank lines and comments
count=0
while IFS= read -r line; do
  # Skip empty lines, comments
  [[ -z "$line" || "$line" =~ ^# ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Strip surrounding quotes from value if present
  value="${value#\"}"
  value="${value%\"}"

  # Skip NEXT_PUBLIC_ vars (client-side only, embedded at build time)
  [[ "$key" == NEXT_PUBLIC_* ]] && continue

  echo "Setting secret: $key"
  echo "$value" | npx wrangler pages secret put "$key" --project-name "$PROJECT" 2>&1
  count=$((count + 1))
done < "$ENV_FILE"

echo ""
echo "Done — pushed $count secrets to project '$PROJECT'"
