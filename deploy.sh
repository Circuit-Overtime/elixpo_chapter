#!/bin/bash

set -e

ASSETS_DIR="public/assets"
CONTENT_DIR="content"
SRC_DIRS=("app" "components")

usage() {
  echo "Usage: ./deploy.sh [optimize] [build] [deploy]"
  echo "  optimize - Compress images in $ASSETS_DIR to .webp and update references"
  echo "  build    - Run optimize + next build (static export to out/)"
  echo "  deploy   - Deploy out/ to Cloudflare Pages via wrangler"
  echo "  Commands can be combined: ./deploy.sh build deploy"
  exit 1
}

optimize_assets() {
  echo ">> Optimizing assets..."

  # Install cwebp if not available
  if ! command -v cwebp &>/dev/null; then
    echo ">> Installing webp tools..."
    sudo apt-get update -qq && sudo apt-get install -y -qq webp
  fi

  # Convert png, jpg, jpeg to webp (skip files already having a .webp counterpart)
  local count=0
  while IFS= read -r -d '' img; do
    webp_path="${img%.*}.webp"
    if [ ! -f "$webp_path" ]; then
      cwebp -q 80 -quiet "$img" -o "$webp_path"
      count=$((count + 1))
    fi
  done < <(find "$ASSETS_DIR" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) -print0)

  echo ">> Converted $count images to .webp"

  # Update local asset references (skip external URLs like https://)
  # Only replace .png/.jpg/.jpeg that follow /assets/ paths
  find "$CONTENT_DIR" -type f -name '*.json' -exec \
    sed -i -E 's|(/assets/[^"]*)\.(png|jpg|jpeg)|\1.webp|g' {} +

  # Update references in source files (app/, components/)
  for dir in "${SRC_DIRS[@]}"; do
    if [ -d "$dir" ]; then
      find "$dir" -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' \) -exec \
        sed -i -E 's|(/assets/[^")\x27 ]*)\.(png|jpg|jpeg)|\1.webp|g' {} +
    fi
  done

  # Remove original files now that .webp versions exist
  find "$ASSETS_DIR" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) -delete

  echo ">> Asset optimization complete."
}

if [ $# -eq 0 ]; then
  usage
fi

for cmd in "$@"; do
  case "$cmd" in
    optimize)
      optimize_assets
      ;;
    build)
      optimize_assets
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
