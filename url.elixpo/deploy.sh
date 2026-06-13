#!/usr/bin/env bash
set -euo pipefail

PROJECT="elixpourl"
OUTDIR=".vercel/output/static"

# CF Pages treats `main` as Production. Without --branch, wrangler tags the
# deploy as Preview for whatever git branch you're on — which never updates
# url.elixpo.com. Override with DEPLOY_BRANCH=<branch> for a preview from CLI.
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
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh build deploy"
  echo "  ./deploy.sh migrate build deploy"
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
    dim "Production deploy — will update url.elixpo.com on success."
  else
    dim "Preview deploy — production URL stays on whatever's deployed to main."
  fi
  npx wrangler pages deploy "$OUTDIR" \
    --project-name="$PROJECT" \
    --branch="$BRANCH"
  log "Deploy complete"
}

do_migrate() {
  log "Running D1 migrations (remote) for ${BOLD}$PROJECT${RESET}..."
  npx wrangler d1 migrations apply "$PROJECT" --remote
  log "Migrations applied"
}

run_cmd() {
  case "$1" in
    build)   do_build ;;
    deploy)  do_deploy ;;
    all)     do_build && do_deploy ;;
    migrate) do_migrate ;;
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
