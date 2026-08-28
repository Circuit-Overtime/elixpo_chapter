#!/usr/bin/env bash
set -euo pipefail

# Lixrl deploy and release utility.
#
# Target syntax:
#   ./deploy.sh --package build deploy [--no-bump|--patch|--minor|--major]
#   ./deploy.sh --worker build deploy
#   ./deploy.sh --pages build deploy
#   ./deploy.sh --github build deploy
#
# Legacy syntax remains available:
#   ./deploy.sh migrate build deploy
#   ./deploy.sh secrets deploy
#   ./deploy.sh all

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAGES_PROJECT="elixpourl"
PAGES_OUTDIR="$SCRIPT_DIR/.vercel/output/static"
PAGES_BRANCH="${DEPLOY_BRANCH:-main}"
WRANGLER_CONFIG="$SCRIPT_DIR/wrangler.toml"
SUBDOMAIN_CONFIG="$SCRIPT_DIR/wrangler.subdomains.toml"
CLI_DIR="$SCRIPT_DIR/packages/lixrl-cli"
CLI_PACKAGE="@elixpo/lixrl-cli"
PUBLISH_WORKFLOW="publish-lixrl-cli.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

DRY_RUN=false
BUMP="patch"
NO_BUMP=false

log() { echo -e "${GREEN}▸${RESET} $1"; }
dim() { echo -e "${DIM}  $1${RESET}"; }
err() { echo -e "${RED}✗${RESET} $1" >&2; }

usage() {
  echo -e "${BOLD}Usage:${RESET} ./deploy.sh TARGET PHASE... [options]"
  echo ""
  echo "Targets:"
  echo "  --package           $CLI_PACKAGE on npm"
  echo "  --worker            *.lixrl.com redirect Worker"
  echo "  --pages             Lixrl Cloudflare Pages site"
  echo "  --github            CLI GitHub release/package artifact"
  echo ""
  echo "Phases:"
  echo "  build               Build, test, or package the target"
  echo "  deploy              Deploy or publish the target"
  echo ""
  echo "Options:"
  echo "  --patch             Patch package version bump (default)"
  echo "  --minor             Minor package version bump"
  echo "  --major             Major package version bump"
  echo "  --no-bump           Keep the current package version"
  echo "  --dry-run           Print actions without executing them"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh --package build deploy"
  echo "  ./deploy.sh --package build deploy --no-bump"
  echo "  ./deploy.sh --worker build deploy"
  echo "  ./deploy.sh --pages build deploy"
  echo "  ./deploy.sh migrate build deploy"
  echo "  DEPLOY_BRANCH=feat/demo ./deploy.sh --pages deploy"
  echo ""
  echo "Legacy commands: build, deploy, all, migrate, secrets"
}

check_not_root() {
  if [ "$(id -u)" = "0" ]; then
    err "Refusing to run as root. Run as your normal user."
    exit 1
  fi
}

check_layout() {
  for file in "$WRANGLER_CONFIG" "$SUBDOMAIN_CONFIG" "$CLI_DIR/package.json"; do
    if [ ! -f "$file" ]; then
      err "Required file not found: $file"
      exit 1
    fi
  done
}

run_in_dir() {
  local directory="$1"
  shift
  if $DRY_RUN; then
    printf '[dry-run] cd %q &&' "$directory"
    printf ' %q' "$@"
    printf '\n'
  else
    (cd "$directory" && "$@")
  fi
}

cli_version() {
  sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' "$CLI_DIR/package.json" | head -1
}

load_cloudflare_auth() {
  if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [[ "$CLOUDFLARE_API_TOKEN" != ENC\[* ]]; then
    return
  fi
  if ! command -v sops >/dev/null 2>&1; then
    err "sops is required to decrypt Cloudflare credentials from .env"
    exit 1
  fi
  local encrypted="$SCRIPT_DIR/.env"
  if [ ! -f "$encrypted" ]; then
    err ".env (sops-encrypted) not found"
    exit 1
  fi
  if [ -z "${SOPS_AGE_KEY:-}" ]; then
    local keyfile="$HOME/.config/sops/age/keys.txt"
    if [ ! -f "$keyfile" ]; then
      err "No AGE key. Set SOPS_AGE_KEY or create $keyfile"
      exit 1
    fi
    SOPS_AGE_KEY="$(grep 'AGE-SECRET-KEY' "$keyfile" | head -1)"
    export SOPS_AGE_KEY
  fi

  local decrypted token="" account_id=""
  decrypted="$(sops decrypt "$encrypted")"
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

pages_build() {
  log "Building ${BOLD}$PAGES_PROJECT${RESET} with @cloudflare/next-on-pages..."
  run_in_dir "$SCRIPT_DIR" npm run pages:build
}

pages_deploy() {
  if ! $DRY_RUN && [ ! -d "$PAGES_OUTDIR" ]; then
    err "Pages output is missing. Run './deploy.sh --pages build deploy'."
    exit 1
  fi
  if ! $DRY_RUN; then load_cloudflare_auth; fi
  log "Deploying Pages project ${BOLD}$PAGES_PROJECT${RESET} on ${BOLD}$PAGES_BRANCH${RESET}..."
  # Running at the repository root makes Wrangler load wrangler.toml.
  run_in_dir "$SCRIPT_DIR" npx wrangler pages deploy .vercel/output/static \
    --project-name "$PAGES_PROJECT" --branch "$PAGES_BRANCH"
}

worker_build() {
  log "Validating the ${BOLD}*.lixrl.com${RESET} Worker bundle..."
  run_in_dir "$SCRIPT_DIR" npx wrangler deploy --config "$SUBDOMAIN_CONFIG" \
    --dry-run --outdir .wrangler/deploy/subdomains
}

worker_deploy() {
  if ! $DRY_RUN; then load_cloudflare_auth; fi
  log "Deploying the ${BOLD}*.lixrl.com${RESET} redirect Worker..."
  run_in_dir "$SCRIPT_DIR" npx wrangler deploy --config "$SUBDOMAIN_CONFIG"
}

package_bump() {
  if $NO_BUMP; then
    dim "Keeping $CLI_PACKAGE at $(cli_version)."
    return
  fi
  log "Bumping $CLI_PACKAGE ($BUMP)..."
  run_in_dir "$CLI_DIR" npm version "$BUMP" --no-git-tag-version
}

package_build() {
  log "Installing and testing ${BOLD}$CLI_PACKAGE${RESET}..."
  run_in_dir "$CLI_DIR" npm ci
  run_in_dir "$CLI_DIR" npm test
  run_in_dir "$CLI_DIR" npm pack --dry-run
}

package_deploy() {
  local version
  version="$(cli_version)"
  log "Publishing ${BOLD}$CLI_PACKAGE@$version${RESET} to npm..."
  run_in_dir "$CLI_DIR" npm publish --access public
  dim "Commit the package.json and package-lock.json version change after publication."
}

github_deploy() {
  if ! command -v gh >/dev/null 2>&1; then
    err "gh is required to start the protected GitHub release workflow"
    exit 1
  fi
  local version
  version="$(cli_version)"
  log "Dispatching the ${BOLD}$CLI_PACKAGE@$version${RESET} GitHub release workflow..."
  if $DRY_RUN; then
    echo "[dry-run] gh workflow run $PUBLISH_WORKFLOW --ref main -f publish=true"
  else
    gh workflow run "$PUBLISH_WORKFLOW" --ref main -f publish=true
  fi
  dim "The workflow will test, pack, attest, publish, and create the GitHub release from main."
}

do_migrate() {
  load_cloudflare_auth
  log "Applying remote D1 migrations with ${BOLD}wrangler.toml${RESET}..."
  run_in_dir "$SCRIPT_DIR" npx wrangler d1 migrations apply "$PAGES_PROJECT" \
    --config "$WRANGLER_CONFIG" --remote
}

do_secrets() {
  if ! command -v sops >/dev/null 2>&1; then
    err "sops is required for the secrets command"
    exit 1
  fi
  local encrypted="$SCRIPT_DIR/.env"
  if [ ! -f "$encrypted" ]; then
    err ".env (sops-encrypted) not found"
    exit 1
  fi
  load_cloudflare_auth

  local decrypted
  decrypted="$(sops decrypt "$encrypted")"
  declare -A vars=()
  while IFS= read -r line || [ -n "$line" ]; do
    [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
    local key="${line%%=*}" value="${line#*=}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    vars["$key"]="$value"
  done <<< "$decrypted"

  local count=0 key
  log "Uploading runtime secrets to ${BOLD}$PAGES_PROJECT${RESET}..."
  for key in "${!vars[@]}"; do
    case "$key" in
      CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|DEV_TIER_OVERRIDE|BASE_URL)
        dim "skip $key"
        continue
        ;;
    esac
    if $DRY_RUN; then
      echo "[dry-run] wrangler pages secret put $key --project-name $PAGES_PROJECT"
    else
      printf '%s' "${vars[$key]}" | npx wrangler pages secret put "$key" \
        --config "$WRANGLER_CONFIG" --project-name "$PAGES_PROJECT" >/dev/null
    fi
    dim "set $key"
    count=$((count + 1))
  done
  log "Uploaded $count Pages secrets."
}

run_target_standard() {
  local target="" action_build=false action_deploy=false
  BUMP="patch"
  NO_BUMP=false
  DRY_RUN=false

  while [ $# -gt 0 ]; do
    case "$1" in
      --package|--worker|--pages|--github)
        if [ -n "$target" ]; then
          err "Choose exactly one deployment target."
          exit 1
        fi
        target="${1#--}"
        ;;
      build) action_build=true ;;
      deploy) action_deploy=true ;;
      --patch) BUMP="patch" ;;
      --minor) BUMP="minor" ;;
      --major) BUMP="major" ;;
      --no-bump) NO_BUMP=true ;;
      --dry-run) DRY_RUN=true ;;
      -h|--help|help) usage; return ;;
      *) err "Unknown argument: $1"; usage; exit 1 ;;
    esac
    shift
  done

  if [ -z "$target" ] || { ! $action_build && ! $action_deploy; }; then
    err "Choose one target and at least one build or deploy phase."
    usage
    exit 1
  fi

  case "$target" in
    package)
      package_bump
      if $action_build; then package_build; fi
      if $action_deploy; then package_deploy; fi
      ;;
    github)
      package_bump
      if $action_build; then package_build; fi
      if $action_deploy; then github_deploy; fi
      ;;
    worker)
      if $action_build; then worker_build; fi
      if $action_deploy; then worker_deploy; fi
      ;;
    pages)
      if $action_build; then pages_build; fi
      if $action_deploy; then pages_deploy; fi
      ;;
  esac
}

run_legacy_command() {
  case "$1" in
    build) pages_build ;;
    deploy)
      if [ ! -d "$PAGES_OUTDIR" ]; then pages_build; fi
      pages_deploy
      if [ "$PAGES_BRANCH" = "main" ]; then worker_deploy; fi
      ;;
    all)
      pages_build
      pages_deploy
      if [ "$PAGES_BRANCH" = "main" ]; then worker_deploy; fi
      ;;
    migrate) do_migrate ;;
    secrets) do_secrets ;;
    -h|--help|help) usage ;;
    *) err "Unknown command: $1"; usage; exit 1 ;;
  esac
}

check_not_root
check_layout

if [ $# -eq 0 ]; then
  usage
  exit 1
fi

if [[ "$1" =~ ^--(package|worker|pages|github)$ ]]; then
  run_target_standard "$@"
else
  for command in "$@"; do
    run_legacy_command "$command"
  done
fi
