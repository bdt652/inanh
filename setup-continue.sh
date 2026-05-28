#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Docker đã cài, kiểm tra quyền
if docker ps &> /dev/null; then
    DOCKER_CMD="docker"
else
    DOCKER_CMD="sudo docker"
fi

# ============================================
# 3. Cài pnpm
# ============================================
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}[3/5] Cài đặt pnpm...${NC}"
    sudo npm install -g pnpm
    echo -e "${GREEN}[3/5] pnpm đã cài: $(pnpm --version)${NC}"
else
    echo -e "${GREEN}[3/5] pnpm đã có sẵn: $(pnpm --version)${NC}"
fi

# ============================================
# 4. Cài pip và Python venv
# ============================================
if ! python3 -m pip --version &> /dev/null; then
    echo -e "${YELLOW}[4/5] Cài đặt pip...${NC}"
    sudo apt install -y python3-pip python3-venv
    echo -e "${GREEN}[4/5] pip đã cài: $(python3 -m pip --version)${NC}"
else
    echo -e "${GREEN}[4/5] pip đã có sẵn: $(python3 -m pip --version)${NC}"
fi

# ============================================
# 5. Thiết lập .env cho development
# ============================================
echo -e "${YELLOW}[5/5] Thiết lập biến môi trường cho development...${NC}"

if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$PROJECT_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
    echo "  Đã backup .env hiện tại"
fi

cat > "$PROJECT_DIR/.env" << 'ENVEOF'
# ============================================
# Development Environment - InAnh24h
# ============================================

# MongoDB (chạy local via Docker)
MONGODB_URI=mongodb://localhost:27017/inanh24h
DB_NAME=inanh24h

# Admin Auth
ADMIN_TOKEN_SECRET=dev-admin-secret-change-in-production
ADMIN_BOOTSTRAP_SECRET=dev-bootstrap-secret
ADMIN_TOKEN_TTL_SECONDS=86400

# Customer Auth
CUSTOMER_TOKEN_SECRET=dev-customer-secret-change-in-production
CUSTOMER_TOKEN_TTL_SECONDS=604800

# OTP Debug mode (không cần SMS gateway)
PHONE_OTP_DEBUG=true

# Storage: dùng local cho development (không cần MinIO)
STORAGE_BACKEND=local
NEXT_PUBLIC_UPLOAD_MODE=direct

# MinIO (nếu muốn dùng MinIO thay local)
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET_NAME=inanh24h-media
MINIO_SECURE=false

# Frontend URLs
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# CORS
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:8000
ENVEOF

echo -e "${GREEN}[5/5] File .env đã được tạo cho development${NC}"

# ============================================
# 6. Cài dependencies
# ============================================
echo ""
echo -e "${YELLOW}Cài đặt Backend dependencies...${NC}"
cd "$PROJECT_DIR/apps/api"
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
echo -e "${GREEN}Backend dependencies đã cài xong!${NC}"

echo ""
echo -e "${YELLOW}Cài đặt Frontend dependencies...${NC}"
cd "$PROJECT_DIR/apps/web"
pnpm install
echo -e "${GREEN}Frontend dependencies đã cài xong!${NC}"

# ============================================
# 7. Khởi động MongoDB via Docker
# ============================================
echo ""
echo -e "${YELLOW}Khởi động MongoDB via Docker...${NC}"
$DOCKER_CMD run -d \
    --name inanh24h-mongo \
    -p 27017:27017 \
    -v inanh24h-mongo-data:/data/db \
    --restart unless-stopped \
    mongo:7 \
    2>/dev/null || echo "MongoDB container có thể đã tồn tại, kiểm tra..."

if $DOCKER_CMD ps | grep -q inanh24h-mongo; then
    echo -e "${GREEN}MongoDB đang chạy trên port 27017${NC}"
else
    echo -e "${YELLOW}Khởi động lại MongoDB container...${NC}"
    $DOCKER_CMD start inanh24h-mongo 2>/dev/null || true
fi

echo ""
echo "============================================"
echo -e "${GREEN}  Thiết lập hoàn tất!${NC}"
echo "============================================"
echo ""
echo "Quay lại Claude Code, gõ 'xong' để Claude khởi động Backend + Frontend."
echo ""
