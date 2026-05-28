#!/bin/bash
# Re-encrypt secrets for THIS project (the directory this script lives in).
# Encrypts .env.local → .env (committed, SOPS-encrypted) and back.
#
# Usage:
#   ./sops-reencrypt.sh            # encrypt .env.local → .env  (after editing .env.local)
#   ./sops-reencrypt.sh --decrypt  # decrypt  .env → .env.local (to start editing)
#
# Requires:
#   - sops installed
#   - a .sops.yaml in this dir defining the AGE recipient(s)
#   - the AGE private key at ~/.sops/elixpo-age-key.txt, or exported as SOPS_AGE_KEY

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGE_KEY_FILE="$HOME/.sops/elixpo-age-key.txt"

# Load AGE key
if [ -z "${SOPS_AGE_KEY:-}" ]; then
  if [ -f "$AGE_KEY_FILE" ]; then
    export SOPS_AGE_KEY="$(grep 'AGE-SECRET-KEY' "$AGE_KEY_FILE" | head -1)"
  else
    echo "ERROR: No AGE key found. Set SOPS_AGE_KEY or create $AGE_KEY_FILE"
    exit 1
  fi
fi

cd "$SCRIPT_DIR"
project="$(basename "$SCRIPT_DIR")"

if [ "${1:-}" = "--decrypt" ]; then
  if [ ! -f .env ]; then
    echo "ERROR: no .env to decrypt in $project"
    exit 1
  fi
  echo -n "$project: decrypting .env → .env.local... "
  sops decrypt .env > .env.local
  echo "✓"
else
  if [ ! -f .env.local ]; then
    echo "ERROR: no .env.local to encrypt in $project"
    exit 1
  fi
  echo -n "$project: encrypting .env.local → .env... "
  cp .env.local .env
  sops encrypt -i .env
  echo "✓"
fi

echo "Done."
