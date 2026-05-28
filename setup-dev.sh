#!/bin/bash
set -e

echo "============================================"
echo "  InAnh24h - Thiết lập môi trường phát triển"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ============================================
# 1. Cài Docker
# ============================================
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}[1/5] Cài đặt Docker...${NC}"
    sudo apt update
    sudo apt install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Thêm user vào group docker (không cần sudo mỗi lần chạy)
    sudo usermod -aG docker "$USER"
    echo -e "${GREEN}[1/5] Docker đã cài xong!${NC}"
    echo -e "${YELLOW}  LƯU Ý: Bạn có thể cần logout/login lại để dùng docker không cần sudo.${NC}"
    echo -e "${YELLOW}  Hiện tại script sẽ dùng sudo docker cho các lệnh tiếp theo.${NC}"
    DOCKER_CMD="sudo docker"
    COMPOSE_CMD="sudo docker compose"
else
    echo -e "${GREEN}[1/5] Docker đã có sẵn: $(docker --version)${NC}"
    if docker ps &> /dev/null; then
        DOCKER_CMD="docker"
        COMPOSE_CMD="docker compose"
    else
        DOCKER_CMD="sudo docker"
        COMPOSE_CMD="sudo docker compose"
    fi
fi

# ============================================
# 2. Cài Node.js (via NodeSource)
# ============================================
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}[2/5] Cài đặt Node.js 22 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}[2/5] Node.js đã cài: $(node --version)${NC}"
else
    echo -e "${GREEN}[2/5] Node.js đã có sẵn: $(node --version)${NC}"
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

# Backup .env hiện tại nếu có
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

# Kiểm tra MongoDB đã chạy chưa
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
echo "Để chạy dự án, mở 2 terminal:"
echo ""
echo "  Terminal 1 (Backend):"
echo "    cd $PROJECT_DIR/apps/api"
echo "    source .venv/bin/activate"
echo "    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "  Terminal 2 (Frontend):"
echo "    cd $PROJECT_DIR/apps/web"
echo "    pnpm dev"
echo ""
echo "  Sau đó truy cập:"
echo "    - Frontend: http://localhost:3000"
echo "    - Admin:    http://localhost:3000/admin"
echo "    - API docs: http://localhost:8000/docs"
echo ""
echo "  Bootstrap admin đầu tiên:"
echo "    curl -X POST http://localhost:8000/api/v1/admin/bootstrap \\"
echo "      -H 'X-Admin-Bootstrap-Secret: dev-bootstrap-secret' \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"username\":\"admin\",\"password\":\"admin123\"}'"
echo ""
