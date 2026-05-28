#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  InAnh24h - Khởi động Development"
echo "============================================"
echo ""

# Load .env
set -a
source "$PROJECT_DIR/.env"
set +a

# ============================================
# 1. Kiểm tra MongoDB remote
# ============================================
MONGO_HOST=$(echo "$MONGODB_URI" | python3 -c "import sys,re; m=re.search(r'@([^:/]+):(\d+)', sys.stdin.read()); print(m.group(1) if m else 'localhost')")
MONGO_PORT=$(echo "$MONGODB_URI" | python3 -c "import sys,re; m=re.search(r'@([^:/]+):(\d+)', sys.stdin.read()); print(m.group(2) if m else '27017')")
echo -e "${YELLOW}[1/3] Kiểm tra kết nối MongoDB ($MONGO_HOST:$MONGO_PORT)...${NC}"
if python3 -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(3)
try:
    s.connect(('$MONGO_HOST', $MONGO_PORT))
    s.close()
    print('OK')
except:
    print('FAIL')
    exit(1)
" 2>/dev/null; then
    echo -e "${GREEN}  MongoDB remote sẵn sàng!${NC}"
else
    echo -e "${RED}  Không kết nối được MongoDB tại $MONGO_HOST:$MONGO_PORT${NC}"
    echo -e "${RED}  Kiểm tra mạng hoặc máy chủ MongoDB.${NC}"
    echo -e "${YELLOW}  Tiếp tục khởi động Backend (sẽ retry khi có request)...${NC}"
fi

# ============================================
# 2. Khởi động Backend
# ============================================
echo ""
echo -e "${YELLOW}[2/3] Khởi động Backend (FastAPI port 8000)...${NC}"

cd "$PROJECT_DIR/apps/api"
source .venv/bin/activate

# Kill process cũ trên port 8000 nếu có
kill $(lsof -t -i:8000) 2>/dev/null || true
sleep 1

echo "  Chạy uvicorn..."
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$PROJECT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Chờ backend sẵn sàng
for i in {1..15}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}  Backend sẵn sàng!${NC}"
        break
    fi
    if [ $i -eq 15 ]; then
        echo -e "${YELLOW}  Backend đang khởi động... kiểm tra log: tail -f $PROJECT_DIR/backend.log${NC}"
    fi
    sleep 1
done

deactivate

# ============================================
# 3. Khởi động Frontend
# ============================================
echo ""
echo -e "${YELLOW}[3/3] Khởi động Frontend (Next.js port 3000)...${NC}"

cd "$PROJECT_DIR/apps/web"

# Kill process cũ trên port 3000 nếu có
kill $(lsof -t -i:3000) 2>/dev/null || true
sleep 1

echo "  Chạy pnpm dev..."
nohup pnpm dev > "$PROJECT_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

# Chờ frontend sẵn sàng
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}  Frontend sẵn sàng!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}  Frontend đang build... kiểm tra log: tail -f $PROJECT_DIR/frontend.log${NC}"
    fi
    sleep 1
done

# ============================================
# Tổng kết
# ============================================
echo ""
echo "============================================"
echo -e "${GREEN}  Services đang chạy!${NC}"
echo "============================================"
echo ""
echo "  Frontend:  http://localhost:3000"
echo "  Admin:     http://localhost:3000/admin"
echo "  API docs:  http://localhost:8000/docs"
echo ""
echo "  Logs:"
echo "    tail -f $PROJECT_DIR/backend.log"
echo "    tail -f $PROJECT_DIR/frontend.log"
echo ""
echo "  Dừng tất cả:"
echo "    kill $BACKEND_PID $FRONTEND_PID"
echo ""
