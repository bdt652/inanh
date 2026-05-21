# Inanh24h Monorepo

This repo contains a Next.js web app and a FastAPI backend using MongoDB (Motor) and MinIO for dev.

## Prerequisites (Windows)
- Node.js 20+
- pnpm
- Python 3.11+
- Docker Desktop

## Setup (PowerShell)
1) Create `.env` from example:
```powershell
Copy-Item .env.example .env
```

2) Start infrastructure:
```powershell
docker compose up -d
```

### Triển khai production (copy/paste)
- Thư mục `deploy/` chứa sẵn `compose.yml` và `.env.prod.example` tối ưu cho domain thật (`inanh24h.com`, `api.inanh24h.com`).
- Trên server: copy toàn bộ repo, `cd deploy`, tạo `.env` từ mẫu, rồi `docker compose -f compose.yml up -d --build`.
- Volumes đặt tên (`mongo-data`, `minio-data`, `api-uploads`) đảm bảo không mất dữ liệu khi redeploy.

## Docker (đóng gói & chạy trên máy chủ)
- Các service chạy trong container: `web` (Next.js, port 3000), `api` (FastAPI, port 8000), `mongo` (27017), `minio` (9000, console 9001).
- Dữ liệu được giữ bằng các volume đặt tên: `mongo-data`, `minio-data`, `api-uploads` (lưu file nếu `STORAGE_BACKEND=local`); update/redeploy sẽ không xoá dữ liệu.
- Triển khai:
  1. Sao chép repo, tạo `.env` từ `.env.example` và điều chỉnh biến (ít nhất `ADMIN_TOKEN_SECRET`, domain API nếu dùng reverse proxy).
  2. Build & khởi động: `docker compose up -d --build`.
  3. Truy cập: web `http://localhost:3000`, API `http://localhost:8000`, MinIO console `http://localhost:9001`.
- Nâng cấp phiên bản: pull/replace mã nguồn mới, giữ nguyên `.env` và các volume, sau đó `docker compose up -d --build` (containers mới dùng lại volume -> không mất dữ liệu).

3) Backend (FastAPI):
```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
If activation is blocked:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

4) Frontend (Next.js):
```powershell
cd apps/web
pnpm install
pnpm dev
```

Required environment variables:
```env
MONGODB_URI=mongodb://mongo:27017
DB_NAME=inanh24h
ADMIN_TOKEN_SECRET=change-this-secret
ADMIN_BOOTSTRAP_SECRET=change-this-bootstrap-secret
ADMIN_TOKEN_TTL_SECONDS=86400
CUSTOMER_TOKEN_SECRET=change-this-customer-secret
CUSTOMER_TOKEN_TTL_SECONDS=604800
GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
SMS_PROVIDER_URL=
SMS_PROVIDER_TOKEN=
SMS_SENDER_ID=InAnh24h
PHONE_OTP_TTL_SECONDS=300
PHONE_OTP_DEBUG=false
UPLOAD_MIN_FILES=1
UPLOAD_MAX_FILES=10000
UPLOAD_MAX_BYTES=20000000000
UPLOAD_REQUIRE_VERIFIED_PHONE_THRESHOLD=100
STORAGE_BACKEND=minio # hoặc local nếu muốn lưu file trên đĩa container (volume api-uploads)
MINIO_ENDPOINT=http://minio:9000
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_BUCKET_NAME=inanh24h-media
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
API_INTERNAL_URL=http://api:8000/api/v1
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=https://inanh24h.com
```

### Luồng đăng nhập khách hàng & tải nhiều ảnh
- Đăng ký/đăng nhập bằng số điện thoại + mật khẩu (`/api/v1/auth/register`, `/api/v1/auth/login`); OTP theo `PHONE_OTP_*` (dev có thể bật `PHONE_OTP_DEBUG=true`).
- Đăng nhập Google qua `/api/v1/auth/google` (cần `GOOGLE_CLIENT_ID`).
- Nếu bật Google login trên web, cung cấp `NEXT_PUBLIC_GOOGLE_CLIENT_ID` và cấu hình SMS (`SMS_PROVIDER_URL`, `SMS_PROVIDER_TOKEN`, `SMS_SENDER_ID`) để gửi OTP khi cần xác thực số điện thoại.
- Tải ảnh số lượng lớn bằng phiên upload: tạo phiên `/api/v1/uploads/sessions`, nhận presigned URL, hoàn tất batch, rồi `/finalize`. Ngưỡng bắt buộc xác thực số điện thoại điều chỉnh qua `UPLOAD_REQUIRE_VERIFIED_PHONE_THRESHOLD` hoặc trong trang Admin Settings.

## API Endpoints
- `GET /health` -> health check with MongoDB ping (returns `503` when DB unreachable)
- `GET /api/v1/ping` -> ping check with MongoDB ping (returns `503` when DB unreachable)
- `POST /api/v1/admin/bootstrap` -> create first admin account in MongoDB (only works when no admin exists, requires `X-Admin-Bootstrap-Secret`)
- `POST /api/v1/admin/login` -> get admin bearer token
- `GET /api/v1/admin/me` -> get current admin profile (requires bearer token)
- `GET /api/v1/banners` (reads active banners from MongoDB `banners`, sorted by `order`)
- `GET /api/v1/settings` (reads singleton settings from MongoDB `settings` with `_id=main`)
- `GET /api/v1/menu` (reads from MongoDB `menu_items`)
- `GET /api/v1/pages/by-path?path=/gioi-thieu` (reads published dynamic page from MongoDB `pages`)
- `GET /api/v1/categories` (reads from MongoDB `categories`)
- `GET /api/v1/hero` (reads from MongoDB `hero_statements`)
- `GET /api/v1/products` (reads from MongoDB `products`)
- `GET /api/v1/products/{slug}` (reads active product detail by slug from MongoDB `products`)
- `POST /api/v1/products` (create from request body, writes MongoDB `products`, requires admin bearer token)
- `GET /api/v1/products/best-sellers` (reads featured products from MongoDB `products`; fallback to `product_views` when needed)
- `GET /api/v1/products/search` (searches MongoDB `product_views`)
- `POST /api/v1/content/uploads/images` (upload image bytes to configured storage backend, requires admin bearer token)
- `GET /uploads/{path}` (serve uploaded images from configured storage backend: MinIO or local)
- `GET /robots.txt` (web crawler rules, disallow `/admin`)
- `GET /sitemap.xml` (SEO sitemap generated from menu + categories)

MongoDB example for `banners`:
```json
{
  "alt": "banner-trang-chu",
  "img": "http://localhost:8000/uploads/banners/example.jpg",
  "order": 1,
  "is_active": true
}
```

MongoDB example for `settings`:
```json
{
  "_id": "main",
  "logo_url": "http://localhost:8000/uploads/logos/main.png",
  "google_header": "<meta name='google-site-verification' content='your-code'/>",
  "footer": "In anh online 24h",
  "title": "In anh online 24h",
  "address": "85 Pho Gach, TT Phuc Tho, huyen Phuc Tho, TP. Ha Noi",
  "hotline_zalo": "0877.22.66.44 - 0868.321.320",
  "email": "Inanhonline24h@gmail.com"
}
```

MongoDB example for `admins`:
```json
{
  "username": "admin",
  "password_salt": "base64url-salt",
  "password_hash": "base64url-hash",
  "is_active": true
}
```

MongoDB example for `menu_items`:
```json
{
  "label": "TRANG CHU",
  "path": "/",
  "order": 1
}
```

MongoDB example for `pages`:
```json
{
  "slug": "gioi-thieu",
  "path": "/gioi-thieu",
  "title": "Gioi thieu",
  "summary": "Thong tin tong quan",
  "content": "Noi dung trang dong",
  "is_published": true,
  "order": 1
}
```

MongoDB example for `categories`:
```json
{
  "label": "ALBUM ANH",
  "slug": "album-anh",
  "img": "http://localhost:8000/uploads/categories/album-anh.jpg",
  "order": 1
}
```

MongoDB example for `hero_statements`:
```json
{
  "title": "In nhanh trong ngay",
  "description": "Xu ly va giao nhanh",
  "order": 1
}
```

MongoDB example for `products`:
```json
{
  "name": "Album Da Cao Cap",
  "slug": "album-da-cao-cap",
  "category_slug": "album-anh",
  "price": 259000,
  "sale_price": 199000,
  "image_url": "http://localhost:8000/uploads/banners/album-da-thumb.jpg",
  "image_urls": [
    "http://localhost:8000/uploads/banners/album-da-thumb.jpg",
    "http://localhost:8000/uploads/banners/album-da-detail.jpg"
  ],
  "short_description": "Album cao cap cho anh cuoi",
  "order": 1,
  "is_active": true,
  "is_featured": true
}
```

MongoDB example for `product_views`:
```json
{
  "id": "best-13x18",
  "title": "Anh in 13x18",
  "short": "In nhanh",
  "old_price": "8000d",
  "current_price": "6000d",
  "description": "Chat luong cao",
  "highlight": "Sale",
  "tags": ["plastic"],
  "order": 1
}
```

Content admin CRUD endpoints:
- `GET /api/v1/content/banners`
- `POST /api/v1/content/banners`
- `PUT /api/v1/content/banners/{id}`
- `DELETE /api/v1/content/banners/{id}`
- `POST /api/v1/content/uploads/images` (`Content-Type: image/*`, optional `X-File-Name` header)
- `GET /api/v1/content/settings`
- `PUT /api/v1/content/settings`
- `GET /api/v1/content/menu`
- `POST /api/v1/content/menu`
- `PUT /api/v1/content/menu/{id}`
- `DELETE /api/v1/content/menu/{id}`
- `GET /api/v1/content/pages`
- `POST /api/v1/content/pages`
- `PUT /api/v1/content/pages/{id}`
- `DELETE /api/v1/content/pages/{id}`
- `GET /api/v1/content/categories`
- `POST /api/v1/content/categories`
- `PUT /api/v1/content/categories/{id}`
- `DELETE /api/v1/content/categories/{id}`
- `GET /api/v1/content/hero`
- `POST /api/v1/content/hero`
- `PUT /api/v1/content/hero/{id}`
- `DELETE /api/v1/content/hero/{id}`
- `GET /api/v1/content/products`
- `POST /api/v1/content/products`
- `PUT /api/v1/content/products/{id}`
- `DELETE /api/v1/content/products/{id}`

All `/api/v1/content/*` endpoints require admin bearer token from `/api/v1/admin/login`.

MongoDB unique indexes are initialized automatically on backend startup:
- `admins.username`
- `banners.img`
- `menu_items.path`
- `pages.slug`
- `pages.path`
- `categories.slug`
- `hero_statements.title`
- `products.slug`
- `products.category_slug`
- `product_views.id` (sparse unique)

## API Docs (Swagger)
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## MinIO Notes
- MinIO Console: `http://localhost:9001`
- Default credentials (from `.env.example`):
  - Username: `minio`
  - Password: `minio123`
- Uploaded media is stored in bucket `inanh24h-media` by default.

## Admin Web UI
- Admin page: `http://localhost:3000/admin`
- Login with admin credentials stored in MongoDB (`admins` collection).
- After login, dashboard supports CRUD for:
  - `menu`
  - `pages`
  - `categories`
  - `products` (multi-image upload, reorder images, first image is thumbnail, auto-generated slug, optional `sale_price`, checkbox `is_featured` for homepage)
  - `hero`
  - `banners` (`is_active`, `order`)
  - `settings`
- Public products page: `http://localhost:3000/san-pham` (shows full product list).
- Product detail page: `http://localhost:3000/san-pham/{slug}` (SEO page with metadata + JSON-LD Product).

## Checks
Backend:
```powershell
cd apps/api
ruff check .
pytest
```

Frontend:
```powershell
cd apps/web
pnpm lint
pnpm build
```
