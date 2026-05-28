#!/bin/bash
# Script deploy trên server production
# Cách dùng: ./scripts/deploy.sh [TAG]
# Yêu cầu: đã login registry, có file .env và docker-compose.prod.yml
set -euo pipefail

REGISTRY="registry.nextgentra.com"
PROJECT="inanh24h"
TAG="${1:-latest}"

echo "=========================================="
echo "Deploy inanh24h từ $REGISTRY/$PROJECT:$TAG"
echo "=========================================="

# Pull images mới nhất
echo ""
echo ">> Pulling images..."
docker pull "$REGISTRY/$PROJECT/api:$TAG"
docker pull "$REGISTRY/$PROJECT/web:$TAG"

# Cập nhật tag trong compose nếu không phải latest
if [ "$TAG" != "latest" ]; then
  export API_IMAGE="$REGISTRY/$PROJECT/api:$TAG"
  export WEB_IMAGE="$REGISTRY/$PROJECT/web:$TAG"
fi

# Restart services
echo ""
echo ">> Restarting services..."
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Xóa images cũ không dùng
echo ""
echo ">> Cleaning up old images..."
docker image prune -f

echo ""
echo "=========================================="
echo "Deploy xong! Trạng thái services:"
echo "=========================================="
docker compose -f docker-compose.prod.yml ps
