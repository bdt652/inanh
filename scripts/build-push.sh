#!/bin/bash
# Build và push images lên registry.nextgentra.com
# Cách dùng: ./scripts/build-push.sh [TAG]
# Mặc định TAG=latest, luôn tag thêm commit hash
set -euo pipefail

REGISTRY="registry.nextgentra.com"
PROJECT="inanh24h"
TAG="${1:-latest}"
COMMIT=$(git rev-parse --short HEAD)

# Load .env để lấy build args cho Next.js
set -a
[ -f .env ] && source .env
set +a

echo "=========================================="
echo "Build & Push: $REGISTRY/$PROJECT"
echo "Tag: $TAG | Commit: $COMMIT"
echo "=========================================="

# ---------- API ----------
echo ""
echo ">> Building API..."
docker build \
  -t "$REGISTRY/$PROJECT/api:$TAG" \
  -t "$REGISTRY/$PROJECT/api:$COMMIT" \
  -f apps/api/Dockerfile \
  .

echo ">> Pushing API..."
docker push "$REGISTRY/$PROJECT/api:$TAG"
docker push "$REGISTRY/$PROJECT/api:$COMMIT"

# ---------- Web ----------
echo ""
echo ">> Building Web (Next.js)..."
docker build \
  -t "$REGISTRY/$PROJECT/web:$TAG" \
  -t "$REGISTRY/$PROJECT/web:$COMMIT" \
  --build-arg NEXT_PUBLIC_BACKEND_URL="${NEXT_PUBLIC_BACKEND_URL:-}" \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}" \
  --build-arg NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-}" \
  --build-arg NEXT_PUBLIC_UPLOAD_MODE="${NEXT_PUBLIC_UPLOAD_MODE:-presigned}" \
  --build-arg NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL="${NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL:-}" \
  --build-arg API_INTERNAL_URL="${API_INTERNAL_URL:-}" \
  -f apps/web/Dockerfile \
  .

echo ">> Pushing Web..."
docker push "$REGISTRY/$PROJECT/web:$TAG"
docker push "$REGISTRY/$PROJECT/web:$COMMIT"

echo ""
echo "=========================================="
echo "Done! Images pushed:"
echo "  $REGISTRY/$PROJECT/api:$TAG"
echo "  $REGISTRY/$PROJECT/api:$COMMIT"
echo "  $REGISTRY/$PROJECT/web:$TAG"
echo "  $REGISTRY/$PROJECT/web:$COMMIT"
echo "=========================================="
