#!/usr/bin/env bash
set -euo pipefail

# OreoOS deployment entry point.
#
#   ./deploy.sh --pages [--preview]
#   ./deploy.sh --board [board options]
#
# tools/deploy.py remains the source of truth for version bumping, hash-cache
# handling, free-space checks, Gallery overrides, and Cloudflare configuration.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ -x "$SCRIPT_DIR/.venv/bin/python3" ]]; then
  PYTHON="$SCRIPT_DIR/.venv/bin/python3"
else
  PYTHON="${PYTHON:-python3}"
fi

TARGET=""
PREVIEW=false
BOARD_ARGS=()

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh --pages [--preview]
  ./deploy.sh --board [options]

Targets:
  --pages                 Build and deploy oreo.elixpo to Cloudflare Pages
  --board                 Upload OreoOS to the connected badge

Pages options:
  --preview               Deploy a Cloudflare preview instead of production

Board options:
  --port <device>         Serial port (default: /dev/ttyACM0)
  --override <apps>       Replace comma-separated app trees, e.g. gallery,reader
  --clean                 Wipe and fully reinstall the badge filesystem
  --force                 Ignore the local hash cache and upload every OS file
  --no-bump               Do not increment the OreoOS patch version
  --free-floor <bytes>    Minimum free flash required after deployment
  --no-free-guard         Disable the post-deployment free-space guard

Examples:
  ./deploy.sh --pages
  ./deploy.sh --pages --preview
  ./deploy.sh --board
  ./deploy.sh --board --port /dev/ttyACM1 --no-bump
  ./deploy.sh --board --override gallery --no-bump
EOF
}

fail() {
  printf 'deploy.sh: %s\n\n' "$1" >&2
  usage >&2
  exit 2
}

set_target() {
  local requested="$1"
  if [[ -n "$TARGET" && "$TARGET" != "$requested" ]]; then
    fail "choose exactly one target: --pages or --board"
  fi
  TARGET="$requested"
}

while (($#)); do
  case "$1" in
    --pages)
      set_target pages
      shift
      ;;
    --board)
      set_target board
      shift
      ;;
    --preview)
      PREVIEW=true
      shift
      ;;
    --port)
      [[ $# -ge 2 ]] || fail "--port requires a serial device"
      BOARD_ARGS+=("$2")
      shift 2
      ;;
    --port=*)
      BOARD_ARGS+=("${1#*=}")
      shift
      ;;
    --override)
      [[ $# -ge 2 ]] || fail "--override requires an app name or comma-separated list"
      BOARD_ARGS+=("--override=$2")
      shift 2
      ;;
    --override=*)
      BOARD_ARGS+=("$1")
      shift
      ;;
    --free-floor)
      [[ $# -ge 2 ]] || fail "--free-floor requires a byte count"
      [[ "$2" =~ ^[0-9]+$ ]] || fail "--free-floor must be a non-negative integer"
      BOARD_ARGS+=("--free-floor=$2")
      shift 2
      ;;
    --free-floor=*)
      value="${1#*=}"
      [[ "$value" =~ ^[0-9]+$ ]] || fail "--free-floor must be a non-negative integer"
      BOARD_ARGS+=("--free-floor=$value")
      shift
      ;;
    --clean|--force|--no-bump|--no-free-guard)
      BOARD_ARGS+=("$1")
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown option: $1"
      ;;
  esac
done

[[ -n "$TARGET" ]] || fail "missing target (--pages or --board)"

if [[ "$TARGET" == "pages" ]]; then
  ((${#BOARD_ARGS[@]} == 0)) || fail "board options cannot be used with --pages"
  command=("$PYTHON" tools/deploy.py --website)
  if $PREVIEW; then command+=(--preview); fi
  exec "${command[@]}"
fi

$PREVIEW && fail "--preview is only valid with --pages"
exec "$PYTHON" tools/deploy.py "${BOARD_ARGS[@]}"
