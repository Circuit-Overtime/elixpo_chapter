#!/bin/bash

set -e

usage() {
  echo "Usage: ./deploy.sh [build] [deploy]"
  echo "  build   - Run next build (static export to out/)"
  echo "  deploy  - Deploy out/ to Cloudflare Pages via wrangler"
  echo "  Both can be combined: ./deploy.sh build deploy"
  exit 1
}

if [ $# -eq 0 ]; then
  usage
fi

for cmd in "$@"; do
  case "$cmd" in
    build)
      echo ">> Building Next.js static export..."
      sudo npx next build
      echo ">> Build complete. Output in out/"
      ;;
    deploy)
      if [ ! -d "out" ]; then
        echo "Error: out/ directory not found. Run ./deploy.sh build first."
        exit 1
      fi
      echo ">> Deploying to Cloudflare Pages..."
      sudo npx wrangler pages deploy out
      echo ">> Deploy complete."
      ;;
    *)
      echo "Unknown command: $cmd"
      usage
      ;;
  esac
done
