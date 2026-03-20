#!/usr/bin/env bash
set -euo pipefail

PROJECT="elixpourl"
OUTDIR=".vercel/output/static"

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
  exit 1
}

log()  { echo -e "${GREEN}▸${RESET} $1"; }
dim()  { echo -e "${DIM}  $1${RESET}"; }
err()  { echo -e "${RED}✗${RESET} $1" >&2; }

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
  sudo npx @cloudflare/next-on-pages
  log "Build complete → ${DIM}$OUTDIR${RESET}"
}

do_deploy() {
  if [ ! -d "$OUTDIR" ]; then
    log "No build output found, building first..."
    do_build
  fi
  log "Deploying to Cloudflare Pages..."
  sudo npx wrangler pages deploy "$OUTDIR" --project-name="$PROJECT"
  log "Deploy complete"
}

do_migrate() {
  log "Running D1 migrations (remote)..."
  sudo npx wrangler d1 migrations apply "$PROJECT" --remote
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

check_deps

if [ $# -eq 0 ]; then
  usage
fi

for cmd in "$@"; do
  run_cmd "$cmd"
done
