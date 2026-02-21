# Triển khai nhanh (copy thư mục `deploy/` lên server)

Thư mục này chứa sẵn cấu hình Docker Compose và file `.env` mẫu cho production.

## Bước 1: Copy
- Sao chép toàn bộ thư mục `deploy/` cùng cây mã nguồn lên máy chủ (giữ nguyên cấu trúc thư mục gốc).

## Bước 2: Chuẩn bị môi trường
- Cài Docker + Docker Compose v2.
- Tạo file `.env` trong `deploy/`:
  ```bash
  cp deploy/.env.prod.example deploy/.env
  ```
  Sau đó chỉnh các biến:
  - `ADMIN_TOKEN_SECRET`: chuỗi bí mật ngẫu nhiên.
  - `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_API_URL`: đặt theo domain (ví dụ đã điền sẵn `https://api.inanh24h.com`).
  - Giữ `API_INTERNAL_URL=http://api:8000/api/v1` để web gọi API qua mạng docker nội bộ.
  - Cập nhật `CORS_ALLOW_ORIGINS` nếu thêm domain mới.

## Bước 3: Build & chạy
```bash
cd deploy
docker compose -f compose.yml up -d --build
```
- Web: http://localhost:3000 (đặt reverse proxy tới domain `inanh24h.com`).
- API: http://localhost:8000 (reverse proxy tới `api.inanh24h.com`).
- MinIO: http://localhost:9000 (console: 9001).

## Biến môi trường mới cho khách hàng tải ảnh
- `CUSTOMER_TOKEN_SECRET`, `CUSTOMER_TOKEN_TTL_SECONDS`
- `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `PHONE_OTP_TTL_SECONDS`, `PHONE_OTP_DEBUG`
- `UPLOAD_MAX_FILES`, `UPLOAD_MAX_BYTES`, `UPLOAD_REQUIRE_VERIFIED_PHONE_THRESHOLD`
- SMS: `SMS_PROVIDER_URL`, `SMS_PROVIDER_TOKEN`, `SMS_SENDER_ID`

## Bước 4: Nâng cấp phiên bản
```bash
cd deploy
docker compose -f compose.yml pull    # nếu push image lên registry
docker compose -f compose.yml up -d --build
```
- Dữ liệu an toàn trên volumes: `mongo-data`, `minio-data`, `api-uploads`.

## Ghi chú reverse proxy
- Trỏ `inanh24h.com` → service `web` cổng 3000.
- Trỏ `api.inanh24h.com` → service `api` cổng 8000.
- Bật HTTPS (Let's Encrypt) tại reverse proxy/nginx/traefik, không cần đổi config ứng dụng.

## Cloudflare Tunnel (inanh24h.com)
1. Đảm bảo domain `inanh24h.com` đang dùng DNS của Cloudflare.
2. Cài `cloudflared` trên máy thao tác tunnel.
3. Tạo tunnel và DNS record:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create inanh24h
   cloudflared tunnel route dns inanh24h inanh24h.com
   cloudflared tunnel route dns inanh24h api.inanh24h.com
   ```
4. Copy file credentials về server: file nằm ở `%USERPROFILE%\.cloudflared\<TUNNEL_ID>.json`, đặt tên `deploy/cloudflared/credentials.json`.
5. Sửa `deploy/cloudflared/config.yml` và thay `YOUR_TUNNEL_ID` bằng đúng `TUNNEL_ID`.
6. Chạy deploy:
   ```bash
   cd deploy
   docker compose -f compose.yml up -d --build
   ```

## Kiểm tra nhanh
- `docker compose -f compose.yml ps`
- `curl http://localhost:8000/health`
- Mở http://localhost:3000 thử duyệt trang.
