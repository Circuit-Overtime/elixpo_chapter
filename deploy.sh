#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="elixpourl"
OUTDIR=".vercel/output/static"
WRANGLER_CONFIG="$SCRIPT_DIR/wrangler.toml"

# CF Pages treats `main` as Production. Without --branch, wrangler tags the
# deploy as Preview for whatever git branch you're on — which never updates
# lixrl.com. Override with DEPLOY_BRANCH=<branch> for a preview from CLI.
BRANCH="${DEPLOY_BRANCH:-main}"

RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

usage() {
  echo -e "${BOLD}Usage:${RESET} ./deploy.sh <command> [command...]"
  echo ""
  echo "Commands (can be chained):"
  echo "  build     Build the Next.js app with @cloudflare/next-on-pages"
  echo "  deploy    Deploy to Cloudflare Pages (builds first if needed)"
  echo "  all       Build and deploy in one step"
  echo "  migrate   Run D1 database migrations (remote)"
  echo "  secrets   Decrypt .env (sops) and upload all secrets to Pages prod"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh build deploy"
  echo "  ./deploy.sh migrate build deploy"
  echo "  ./deploy.sh secrets deploy   # push env secrets, then redeploy"
  echo ""
  echo -e "${DIM}Override the deploy branch:${RESET}"
  echo "  DEPLOY_BRANCH=elixpo/feat-x ./deploy.sh deploy   # preview from a feature branch"
  exit 1
}

log()  { echo -e "${GREEN}▸${RESET} $1"; }
dim()  { echo -e "${DIM}  $1${RESET}"; }
err()  { echo -e "${RED}✗${RESET} $1" >&2; }

# Refuse to run as root. `sudo npx` was the previous footgun: it left
# .vercel/, node_modules/, and .next/ owned by root, which then broke every
# subsequent non-sudo command in the repo until the user manually chowned
# their working tree back. We require ownership of these dirs already, not
# sudo escalation.
check_not_root() {
  if [ "$(id -u)" = "0" ]; then
    err "Refusing to run as root. Run as your normal user."
    err "If npx fails with EACCES, fix node_modules ownership instead:"
    err "  sudo chown -R \"\$(id -u):\$(id -g)\" node_modules .next .vercel"
    exit 1
  fi
}

check_deps() {
  for cmd in npx node; do
    if ! command -v "$cmd" &>/dev/null; then
      err "$cmd is required but not found"
      exit 1
    fi
  done

  if [ ! -f "$WRANGLER_CONFIG" ]; then
    err "Wrangler config not found: $WRANGLER_CONFIG"
    exit 1
  fi
}

# Wrangler automatically reads .env, but this repository stores that file in
# SOPS-encrypted form. Export the decrypted deploy credentials first so
# Wrangler does not mistake an ENC[...] value for an API token. An explicitly
# supplied plaintext token (for example in CI) still takes precedence.
load_cloudflare_auth() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] &&
     [[ "$CLOUDFLARE_API_TOKEN" != ENC\[* ]]; then
    return
  fi

  if ! command -v sops &>/dev/null; then
    err "sops is required to decrypt Cloudflare credentials from .env"
    exit 1
  fi

  local enc="$SCRIPT_DIR/.env"
  if [ ! -f "$enc" ]; then
    err ".env (sops-encrypted) not found"
    exit 1
  fi

  if [ -z "${SOPS_AGE_KEY:-}" ]; then
    local keyfile="$HOME/.config/sops/age/keys.txt"
    if [ -f "$keyfile" ]; then
      SOPS_AGE_KEY="$(grep 'AGE-SECRET-KEY' "$keyfile" | head -1)"
      export SOPS_AGE_KEY
    else
      err "No AGE key. Set SOPS_AGE_KEY or create $keyfile"
      exit 1
    fi
  fi

  local decrypted token="" account_id=""
  decrypted="$(sops decrypt "$enc")"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      CLOUDFLARE_API_TOKEN=*) token="${line#*=}" ;;
      CLOUDFLARE_ACCOUNT_ID=*) account_id="${line#*=}" ;;
    esac
  done <<< "$decrypted"

  if [ -z "$token" ]; then
    err "CLOUDFLARE_API_TOKEN not found in decrypted .env"
    exit 1
  fi

  export CLOUDFLARE_API_TOKEN="$token"
  if [ -n "$account_id" ]; then
    export CLOUDFLARE_ACCOUNT_ID="$account_id"
  fi
}

do_build() {
  log "Building ${BOLD}$PROJECT${RESET} with @cloudflare/next-on-pages..."
  npx @cloudflare/next-on-pages
  log "Build complete → ${DIM}$OUTDIR${RESET}"
}

do_deploy() {
  if [ ! -d "$OUTDIR" ]; then
    log "No build output found, building first..."
    do_build
  fi
  log "Deploying to ${BOLD}Cloudflare Pages${RESET} on branch ${BOLD}$BRANCH${RESET}..."
  if [ "$BRANCH" = "main" ]; then
    dim "Production deploy — will update lixrl.com on success."
  else
    dim "Preview deploy — production URL stays on whatever's deployed to main."
  fi
  load_cloudflare_auth
  npx wrangler pages deploy "$OUTDIR" \
    --config="$WRANGLER_CONFIG" \
    --project-name="$PROJECT" \
    --branch="$BRANCH"
  log "Deploy complete"
}

do_migrate() {
  log "Running D1 migrations (remote) for ${BOLD}$PROJECT${RESET}..."
  load_cloudflare_auth
  npx wrangler d1 migrations apply "$PROJECT" \
    --config="$WRANGLER_CONFIG" \
    --remote
  log "Migrations applied"
}

# Decrypt the sops-managed .env and push every secret to the Pages project's
# production environment. Mirrors sops-reencrypt.sh's AGE-key resolution, but
# decrypts in memory (never writes plaintext to disk, never touches the
# working .env.local). CLOUDFLARE_* are deploy-time creds — used to auth
# wrangler, not pushed to the app runtime.
do_secrets() {
  if ! command -v sops &>/dev/null; then
    err "sops is required for the secrets command but was not found"
    exit 1
  fi

  local enc="$SCRIPT_DIR/.env"
  if [ ! -f "$enc" ]; then
    err ".env (sops-encrypted) not found. Run ./sops-reencrypt.sh first."
    exit 1
  fi

  # Same key resolution as sops-reencrypt.sh.
  if [ -z "${SOPS_AGE_KEY:-}" ]; then
    local keyfile="$HOME/.config/sops/age/keys.txt"
    if [ -f "$keyfile" ]; then
      SOPS_AGE_KEY="$(grep 'AGE-SECRET-KEY' "$keyfile" | head -1)"
      export SOPS_AGE_KEY
    else
      err "No AGE key. Set SOPS_AGE_KEY or create $keyfile"
      exit 1
    fi
  fi

  log "Decrypting ${BOLD}.env${RESET} with sops (in memory)..."
  local decrypted
  decrypted="$(sops decrypt "$enc")"

  # Parse KEY=VALUE into a map (skip blanks, comments, non-identifier keys).
  declare -A vars=()
  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
    local k="${line%%=*}" v="${line#*=}"
    [[ "$k" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    vars["$k"]="$v"
  done <<< "$decrypted"

  # Auth wrangler with the CF creds pulled from the vault.
  export CLOUDFLARE_API_TOKEN="${vars[CLOUDFLARE_API_TOKEN]:-${CLOUDFLARE_API_TOKEN:-}}"
  export CLOUDFLARE_ACCOUNT_ID="${vars[CLOUDFLARE_ACCOUNT_ID]:-${CLOUDFLARE_ACCOUNT_ID:-}}"
  if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    err "CLOUDFLARE_API_TOKEN not found in .env (needed to authenticate wrangler)"
    exit 1
  fi

  log "Uploading secrets to ${BOLD}$PROJECT${RESET} (production)..."
  local count=0
  for k in "${!vars[@]}"; do
    case "$k" in
      CLOUDFLARE_API_TOKEN | CLOUDFLARE_ACCOUNT_ID)
        dim "skip $k (deploy-time credential, not app runtime)"
        continue
        ;;
      DEV_TIER_OVERRIDE)
        # Dev-only: would promote EVERY prod user to that tier. Never ship it.
        dim "skip $k (dev-only — must not reach production)"
        continue
        ;;
      BASE_URL)
        # Environment-specific (vault holds the localhost dev value). Set the
        # prod origin directly on the Pages project, e.g. https://lixrl.com.
        dim "skip $k (env-specific — set prod origin on Pages directly)"
        continue
        ;;
    esac
    printf '%s' "${vars[$k]}" | npx wrangler pages secret put "$k" \
      --config="$WRANGLER_CONFIG" \
      --project-name="$PROJECT" >/dev/null
    dim "set $k"
    count=$((count + 1))
  done
  log "Uploaded $count secrets"
  dim "Secrets apply to the next deploy — run: ./deploy.sh deploy"
}

run_cmd() {
  case "$1" in
    build)   do_build ;;
    deploy)  do_deploy ;;
    all)     do_build && do_deploy ;;
    migrate) do_migrate ;;
    secrets) do_secrets ;;
    *)       err "Unknown command: $1"; usage ;;
  esac
}

check_not_root
check_deps

if [ $# -eq 0 ]; then
  usage
fi

for cmd in "$@"; do
  run_cmd "$cmd"
done
