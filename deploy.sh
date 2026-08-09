#!/usr/bin/env bash
# Usage:
#   ./deploy.sh              — runs all steps: secrets + build + deploy
#   ./deploy.sh secrets      — push plaintext .env.local secrets to Cloudflare
#   ./deploy.sh check-env    — verify deployment values are plaintext
#   ./deploy.sh build        — build for Cloudflare Pages
#   ./deploy.sh deploy       — deploy built output to Cloudflare Pages
#   ./deploy.sh build deploy — build then deploy (skip secrets)

set -euo pipefail

PROJECT="elixpo-accounts"
# `.env` is the tracked SOPS-encrypted source of truth. Cloudflare and the
# production build must receive plaintext values, which live only in the
# gitignored `.env.local` file after `sops decrypt`.
ENV_FILE="${DEPLOY_ENV_FILE:-.env.local}"

is_skipped_runtime_key() {
  local key="$1"

  # These are declared as non-secret vars in wrangler.toml. Uploading them as
  # secrets would conflict with their existing bindings.
  [[ "$key" == "ENVIRONMENT" || \
     "$key" == "JWT_EXPIRATION_MINUTES" || "$key" == "REFRESH_TOKEN_EXPIRATION_DAYS" ]]
}

validate_plaintext_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    echo "Create it with: sops decrypt .env > .env.local"
    exit 1
  fi

  local line key value
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    key="${line%%=*}"
    key="${key#export }"
    value="${line#*=}"

    if [[ "$value" == ENC\[* || "$value" == \"ENC\[* || "$key" == sops_* ]]; then
      echo "Error: $ENV_FILE contains SOPS-encrypted data ($key)."
      echo "Cloudflare secrets must be loaded from the decrypted .env.local file."
      exit 1
    fi
  done < "$ENV_FILE"
}

# ── Commands ──────────────────────────────────────────────────────────

push_secrets() {
  validate_plaintext_env

  echo "=== Pushing plaintext secrets from $ENV_FILE to Cloudflare Pages ==="
  count=0
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    key="${line%%=*}"
    key="${key#export }"
    value="${line#*=}"

    # Strip one matching pair of surrounding quotes. Keep embedded `=` and
    # escaped newlines intact (JWT PEM values depend on both behaviours).
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    # `.env.local` correctly uses development locally. A production Pages
    # deployment must never inherit that value, so override this one binding
    # explicitly while keeping every credential sourced from the local file.
    [[ "$key" == "NODE_ENV" ]] && value="production"

    is_skipped_runtime_key "$key" && continue

    echo "  Setting: $key"
    printf '%s' "$value" | npx wrangler pages secret put "$key" \
      --project-name "$PROJECT" 2>&1
    count=$((count + 1))
  done < "$ENV_FILE"
  echo "Pushed $count secrets."
  echo ""
}

do_build() {
  # Prevent Next.js from falling back to the tracked encrypted `.env` and
  # compiling ENC[...] placeholders into NEXT_PUBLIC_* browser values.
  validate_plaintext_env
  echo "=== Building for Cloudflare Pages ==="
  npm run pages:build
  echo "Build complete."
  echo ""
}

do_deploy() {
  if [ ! -d ".vercel/output/static" ]; then
    echo "Error: .vercel/output/static not found. Run './deploy.sh build' first."
    exit 1
  fi

  echo "=== Deploying to Cloudflare Pages ==="
  # CF Pages treats `main` as Production. Without --branch, wrangler tags the
  # deploy as Preview for whatever git branch you're on — which won't update
  # accounts.elixpo.com. Override with DEPLOY_BRANCH=<branch> if you really
  # want a preview from CLI.
  BRANCH="${DEPLOY_BRANCH:-main}"
  echo "  Branch: $BRANCH"
  npx wrangler pages deploy ./.vercel/output/static \
    --project-name "$PROJECT" \
    --branch "$BRANCH"
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
    check-env) validate_plaintext_env ;;
    secrets) push_secrets ;;
    build)   do_build ;;
    deploy)  do_deploy ;;
    *)
      echo "Unknown command: $cmd"
      echo "Usage: ./deploy.sh [check-env] [secrets] [build] [deploy]"
      exit 1
      ;;
  esac
done
