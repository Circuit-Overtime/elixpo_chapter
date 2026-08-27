#!/usr/bin/env bash
# Usage:
#   ./deploy.sh              — runs all steps: secrets + build + deploy
#   ./deploy.sh secrets      — push plaintext .env.local secrets to Cloudflare
#   ./deploy.sh check-env    — verify deployment values are plaintext
#   ./deploy.sh build        — build for Cloudflare Pages
#   ./deploy.sh deploy       — deploy built output to Cloudflare Pages
#   ./deploy.sh build deploy — build then deploy (skip secrets)
#   ./deploy.sh --package              — build and publish the Developer SDK
#   ./deploy.sh --package build        — build the Developer SDK only
#   ./deploy.sh --package build deploy — build, then publish the Developer SDK

set -euo pipefail

PROJECT="elixpo-accounts"
# `.env` is the tracked SOPS-encrypted source of truth. Cloudflare and the
# production build must receive plaintext values, which live only in the
# gitignored `.env.local` file after `sops decrypt`.
ENV_FILE="${DEPLOY_ENV_FILE:-.env.local}"
PACKAGE_DIR="./packages/accounts"
TEMP_NPMRC=""

cleanup() {
  if [ -n "$TEMP_NPMRC" ] && [ -f "$TEMP_NPMRC" ]; then
    rm -f "$TEMP_NPMRC"
  fi
}

trap cleanup EXIT

is_skipped_runtime_key() {
  local key="$1"

  # npm credentials are local release inputs and must never reach Cloudflare.
  # The remaining values are non-secret vars declared in wrangler.toml;
  # uploading them as secrets would conflict with their existing bindings.
  [[ "$key" == "NPM_TOKEN" || \
     "$key" == "NPM_CONFIG_PROVENANCE" || \
     "$key" == "ENVIRONMENT" || \
     "$key" == "JWT_EXPIRATION_MINUTES" || "$key" == "REFRESH_TOKEN_EXPIRATION_DAYS" ]]
}

read_env_value() {
  local requested_key="$1"
  local line key value

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" != *=* ]] && continue

    key="${line%%=*}"
    key="${key#export }"
    [ "$key" != "$requested_key" ] && continue

    value="${line#*=}"
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf '%s' "$value"
    return 0
  done < "$ENV_FILE"

  return 1
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

build_package() {
  echo "=== Building @elixpo/accounts ==="
  npm run sdk:build
  echo "Package build complete."
  echo ""
}

publish_package() {
  validate_plaintext_env

  local npm_token version tag
  npm_token="$(read_env_value "NPM_TOKEN" || true)"
  if [ -z "$npm_token" ]; then
    echo "Error: NPM_TOKEN is missing from $ENV_FILE."
    echo "Use a granular npm token with package write access and 2FA bypass enabled."
    exit 1
  fi

  version="$(node -p "require('$PACKAGE_DIR/package.json').version")"
  tag="latest"
  [[ "$version" == *-* ]] && tag="beta"

  if npm view "@elixpo/accounts@$version" version >/dev/null 2>&1; then
    echo "@elixpo/accounts@$version is already published; skipping."
    return 0
  fi

  TEMP_NPMRC="$(mktemp)"
  chmod 600 "$TEMP_NPMRC"
  printf '%s\n' \
    'registry=https://registry.npmjs.org/' \
    '//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}' > "$TEMP_NPMRC"

  echo "=== Verifying npm credentials ==="
  NODE_AUTH_TOKEN="$npm_token" \
    NPM_CONFIG_USERCONFIG="$TEMP_NPMRC" \
    npm whoami >/dev/null

  echo "=== Publishing @elixpo/accounts@$version with tag $tag ==="
  NODE_AUTH_TOKEN="$npm_token" \
    NPM_CONFIG_USERCONFIG="$TEMP_NPMRC" \
    NPM_CONFIG_PROVENANCE=false \
    npm publish "$PACKAGE_DIR" \
      --access public \
      --tag "$tag" \
      --provenance=false

  echo "Published @elixpo/accounts@$version."
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

# Package mode gives build/deploy their package-specific meanings and exits
# before the Cloudflare Pages command parser below.
if [[ "${1:-}" == "--package" || "${1:-}" == "package" ]]; then
  shift

  if [ $# -eq 0 ]; then
    build_package
    publish_package
    exit 0
  fi

  for cmd in "$@"; do
    case "$cmd" in
      build) build_package ;;
      deploy|publish) publish_package ;;
      -h|--help|help)
        sed -n '9,11p' "$0"
        exit 0
        ;;
      *)
        echo "Unknown package command: $cmd"
        echo "Usage: ./deploy.sh --package [build] [deploy]"
        exit 1
        ;;
    esac
  done
  exit 0
fi

# Run only the requested Pages steps, in order.
for cmd in "$@"; do
  case "$cmd" in
    check-env) validate_plaintext_env ;;
    secrets) push_secrets ;;
    build)   do_build ;;
    deploy)  do_deploy ;;
    -h|--help|help)
      sed -n '2,11p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown command: $cmd"
      echo "Usage: ./deploy.sh [check-env] [secrets] [build] [deploy]"
      exit 1
      ;;
  esac
done
