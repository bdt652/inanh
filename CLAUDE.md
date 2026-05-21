# CLAUDE.md

File này cung cấp hướng dẫn cho Claude Code (claude.ai/code) khi làm việc với mã nguồn trong repository này.

## Tổng quan dự án

Đây là một monorepo chứa ứng dụng web Next.js 16 và backend FastAPI cho "InAnh24h" - dịch vụ in ảnh online tại Việt Nam.

### Công nghệ sử dụng
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS 4, pnpm
- **Backend**: FastAPI, Python 3.11+, Motor (MongoDB async), Pydantic
- **Hạ tầng**: Docker, MongoDB, MinIO (storage tương thích S3)

### Cấu trúc thư mục
```
apps/
  web/           # Frontend Next.js (port 3000)
  api/           # Backend FastAPI (port 8000)
deploy/          # Cấu hình Docker Compose cho production
```

## Các lệnh thường dùng

### Thiết lập môi trường phát triển
```bash
# Khởi động hạ tầng (MongoDB + MinIO)
docker compose up -d

# Backend (PowerShell)
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd apps/web
pnpm install
pnpm dev
```

### Kiểm tra code & Test

**Backend:**
```bash
cd apps/api
ruff check .                    # Kiểm tra tất cả file Python
pytest                          # Chạy tất cả tests
pytest tests/test_products.py  # Chạy file test cụ thể
pytest tests/test_products.py::test_create_product  # Chạy test cụ thể
pytest -v                      # Output chi tiết
pytest -k "test_admin"         # Chạy tests khớp với pattern
```

**Frontend:**
```bash
cd apps/web
pnpm lint                       # Kiểm tra TypeScript/React
pnpm build                      # Build production
pnpm -C apps/web type-check    # Kiểm tra kiểu TypeScript
```

### Triển khai Production
```bash
cd deploy
docker compose -f compose.yml up -d --build
```

## Kiến trúc hệ thống

### Cấu trúc Backend (`apps/api/app/`)

Backend FastAPI theo mô hình layered architecture:

```
app/
  api/v1/
    routes.py           # Main router tập hợp các sub-router
    auth.py             # Xác thực Admin (JWT)
    customer_auth.py    # Xác thực Khách hàng (phone/OTP, Google OAuth)
    content_admin.py    # Endpoints công khai (banners, categories, etc.)
    admin_manage.py     # CRUD riscontent dành riêng cho Admin
    uploads.py          # Quản lý upload session
    orders.py           # Xử lý đơn hàng khách hàng
    users.py            # Quản lý người dùng khách hàng
    drafts.py           # Chức năng giỏ hàng nháp
    schemas.py          # Pydantic models cho validation request/response
  core/
    config.py           # Settings từ biến môi trường
    security.py         # Password hashing, tạo/xác thực JWT
    storage.py          # Trừu tượng MinIO/local storage
    uploads.py          # Helper validation file upload
  db/
    mongo.py            # Motor client, connection pooling, index management
  main.py                # FastAPI app factory với lifespan hooks
```

**Luồng xử lý request:**
1. `main.py` tạo FastAPI app với CORS và lifespan (khởi tạo index + kiểm tra storage)
2. Routes được đăng ký dưới prefix `/api/v1`
3. Endpoints admin được bảo vệ bởi dependency `require_admin` (JWT từ header `Authorization: Bearer`)
4. Endpoints khách hàng sử dụng phone OTP hoặc Google OAuth
5. Trường `_id` của MongoDB được chuyển thành string `id` trong response models

### Cấu trúc Frontend (`apps/web/app/`)

Next.js 16 với App Router (server components mặc định):

```
app/
  layout.tsx           # Root layout với SEO metadata, JSON-LD, analytics
  page.tsx             # Trang chủ
  globals.css          # Tailwind CSS v4 imports + global styles
  components/          # UI components tái sử dụng (ToastProvider, etc.)
  admin/               # Admin dashboard (nhiều client components)
    AdminShell.tsx     # Layout với sidebar navigation
    api.ts             # Frontend API client với auth headers
    banners/, categories/, hero/, menu/, pages/, products/, settings/  # Pages CRUD
  [...segments]/       # Catch-all cho dynamic pages (legacy pages route)
  dang-ky/             # Đăng ký khách hàng
  dang-nhap/           # Đăng nhập khách hàng
  san-pham/            # Catalog sản phẩm
    [productId]/       # Dynamic product detail page với JSON-LD
  quan-ly-don-hang/    # Quản lý đơn hàng khách hàng
  lib/
    customer-api.ts    # API wrapper cho khách hàng (auth state)
    use-customer-token.ts  # Hook quản lý token
    content.ts         # Fetcher nội dung công khai
    paths.ts           # URL path constants
```

**Mẫu Components:**
- Server components fetch data trực tiếp từ API (không dùng useState/useEffect)
- Client components dùng directive `'use client'` khi cần intertivity
- Admin pages chủ yếu là client components với React state
- Tailwind CSS v4: cấu hình import trong `content` config + styles tùy chỉnh trong `globals.css`

### Các Collection MongoDB

| Collection | Mục đích | Indexes quan trọng |
|------------|----------|-------------------|
| `admins` | Credentials admin | `username` (unique) |
| `users` | Tài khoản khách hàng | `phone` (unique sparse), `google_sub` (unique sparse) |
| `phone_otps` | Mã OTP cho xác thực phone | `expires_at` (TTL) |
| `banners` | Ảnh carousel trang chủ | `img` (unique), `is_active+order` |
| `menu_items` | Links navigation | `path` (unique) |
| `pages` | CMS pages (ví dụ: /gioi-thieu) | `slug`, `path` (cả hai unique) |
| `categories` | Danh mục sản phẩm | `slug` (unique) |
| `hero_statements` | Text blocks hero section | `title` (unique) |
| `products` | Catalog sản phẩm chính | `slug` (unique), `category_slug` |
| `product_views` | Snippets product cho grid nhanh (legacy) | `id` (unique sparse) |
| `settings` | Config site (singleton) | `_id: "main"` |
| `orders` | Đơn hàng khách hàng | `user_id` |
| `upload_sessions` | Batch upload sessions | `expires_at` (TTL) |
| `uploads` | Records file upload cá nhân | auto-id |

Indexes được tạo tự động khi startup qua `ensure_indexes()` trong `mongo.py`.

### Các luồng dữ liệu chính

**1. Quản lý nội dung Admin:**
- Admin đăng nhập tại `/admin` → `POST /api/v1/admin/login` → bearer token
- Token lưu trong browser memory (không localStorage) qua React context
- CRUD operations gọi endpoints `/api/v1/content/*` với header `Authorization: Bearer <token>`
- Upload ảnh: `POST /api/v1/content/uploads/images` → lưu trong MinIO/local → trả về URL

**2. Upload Session khách hàng:**
- Khách hàng xác thực (phone OTP hoặc Google) → nhận customer JWT
- `POST /api/v1/uploads/sessions` → tạo session với expiry, trả về session ID
- Backend tạo presigned URLs cho từng file (MinIO) hoặc chấp nhận direct upload (local)
- Client upload files trực tiếp lên storage
- `POST /api/v1/uploads/sessions/{id}/finalize` → đánh dấu session hoàn thành, tạo order

**3. Render trang công khai:**
- Next.js server components gọi public endpoints (`/api/v1/banners`, `/api/v1/products`, etc.)
- Không cần xác thực
- SEO: Product detail pages (`/san-pham/[slug]`) tạo JSON-LD structured data
- Dynamic CMS pages: `GET /api/v1/pages/by-path?path=/gioi-thieu`

**4. Storage Backend:**
- `STORAGE_BACKEND=minio`: Files lưu trong MinIO bucket, served qua proxy `/uploads/{path}`
- `STORAGE_BACKEND=local`: Files lưu trong volume `apps/api/app/uploads/`, served tương tự
- Cả hai backend trả header `Cache-Control: public, max-age=31536000, immutable`

### Xác thực

| Loại | Endpoints | Cơ chế | Token TTL |
|------|-----------|--------|-----------|
| Admin | `/api/v1/admin/*` | Username + password (bcrypt-scrypt hybrid) | `ADMIN_TOKEN_TTL_SECONDS` (mặc định 24h) |
| Khách hàng | `/api/v1/auth/*`, `/api/v1/users/*` | Phone + OTP HOẶC Google OAuth | `CUSTOMER_TOKEN_TTL_SECONDS` (mặc định 7d) |

Admin tokens là JWT stateless signed với `ADMIN_TOKEN_SECRET`. Customer tokens dùng `CUSTOMER_TOKEN_SECRET`.

## Quy tắc phát triển

- Làm thay đổi nhỏ, có phạm vi - tránh refactor modules không liên quan
- Duy trì backward compatibility cho API routes hiện có
- Giữ behavior deterministic - không có hidden side effects trong startup code
- Thêm explicit type hints cho Python public functions
- Dùng Pydantic models cho request validation
- Trả về uniform responses: `{status, data, error}` (FastAPI đã enforce)
- API endpoints mới cần ít nhất test cho success + failure paths
- Dùng Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`
- Frontend: Ưu tiên server components; dùng `'use client'` chỉ khi cần (interactivity, state)
- Tailwind CSS v4: `@import "tailwindcss"` trong `globals.css`; tùy chỉnh trong `content` array của `tailwind.config`

## Biến môi trường

Xem `.env.example` để danh sách đầy đủ với mô tả. Các biến quan trọng:

**Backend:**
- `MONGODB_URI` - MongoDB connection string
- `DB_NAME` - Tên database (mặc định: `inanh24h`)
- `ADMIN_TOKEN_SECRET` - JWT signing key cho admin tokens (bắt buộc)
- `ADMIN_BOOTSTRAP_SECRET` - Secret để tạo admin đầu tiên (bắt buộc)
- `CUSTOMER_TOKEN_SECRET` - JWT signing key cho customer tokens (bắt buộc)
- `STORAGE_BACKEND` - `minio` (mặc định) hoặc `local`
- `MINIO_*` - MinIO connection settings
- `SMS_PROVIDER_*` - SMS gateway cho OTP (hoặc set `PHONE_OTP_DEBUG=true` cho dev)

**Frontend (NEXT_PUBLIC_* hiển thị ra browser):**
- `NEXT_PUBLIC_API_URL` - API base URL (ví dụ: `http://localhost:8000/api/v1`)
- `NEXT_PUBLIC_BACKEND_URL` - Backend base (ví dụ: `http://localhost:8000`)
- `NEXT_PUBLIC_SITE_URL` - Canonical site URL cho SEO
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID (nếu enable)

**Infrastructure:**
- `CORS_ALLOW_ORIGINS` - Comma-separated allowed origins cho CORS

## Truy cập Admin

1. Khởi động hạ tầng: `docker compose up -d`
2. Bootstrap admin đầu tiên: `POST /api/v1/admin/bootstrap` với header `X-Admin-Bootstrap-Secret`
3. Đăng nhập: `POST /api/v1/admin/login` để nhận bearer token
4. Truy cập admin panel: `http://localhost:3000/admin`

### Test Admin API (cURL examples)

```bash
# Bootstrap (chỉ chạy một lần)
curl -X POST http://localhost:8000/api/v1/admin/bootstrap \
  -H "X-Admin-Bootstrap-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Login
curl -X POST http://localhost:8000/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Get profile (thay TOKEN)
curl http://localhost:8000/api/v1/admin/me \
  -H "Authorization: Bearer TOKEN"

# Create banner
curl -X POST http://localhost:8000/api/v1/content/banners \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alt":"home-banner","img":"http://example.com/banner.jpg","order":1,"is_active":true}'
```

## Ghi chú Testing

**Backend tests (`apps/api/tests/`):**
- Dùng `pytest` với `httpx.AsyncClient` để test async endpoints
- `auth_helpers.py` cung cấp fixtures cho admin/customer auth tokens
- `fakes.py` chứa test data factories
- Tests chạy trên MongoDB thật (cần `MONGODB_URI` set); dùng test database trong CI
- Chạy single test: `pytest tests/test_products.py::test_create_product`

**Frontend:**
- Hiện chưa có unit tests; testing thủ công qua `pnpm dev`
- Chưa có visual regression testing
- Có thể thêm E2E tests với Playwright trong tương lai

## Chi tiết Implementation quan trọng

### Khởi tạo Index
MongoDB indexes được tạo tự động khi app startup (`lifespan` trong `main.py`) qua `ensure_indexes()`. Hàm này idempotent và an toàn để chạy nhiều lần. Unique indexes bao gồm `admins.username`, `pages.slug`, `pages.path`, `products.slug`, etc.

### Mẫu Serialization
MongoDB `_id` (ObjectId) được serialize thành string `id` trong tất cả API responses. Helper functions như `_serialize_product()`, `_serialize_site_setting()` trong `routes.py` xử lý nhất quán.

### Luồng Upload Session
1. Tạo session: `POST /api/v1/uploads/sessions` → trả về `{session_id, expires_at, urls[]}` (presigned nếu dùng MinIO)
2. Upload từng file lên URL được cung cấp (direct to storage)
3. Finalize: `POST /api/v1/uploads/sessions/{id}/finalize` → tạo order nếu files đã upload
4. Thư mục uploads được mount làm Docker volume `api-uploads` cho local storage

### Catalog Sản phẩm
- Collection `products`: Chi tiết sản phẩm đầy đủ (dùng cho admin CRUD và product detail pages)
- Collection `product_views`: Snippets product denormalized/nhẹ cho grid nhanh (legacy)
- Code mới nên dùng `products`; `product_views` giữ lại để backward compatibility với homepage "best sellers" fallback

### Tailwind CSS v4
- Cấu hình dựa trên import: `@import "tailwindcss"` trong `app/globals.css`
- Custom theme extends qua CSS custom properties (xem `:root` trong `globals.css`)
- Không cần nội dung `tailwind.config.js` trong hầu hết trường hợp; `content` array trong `tailwind.config.ts` scan `app/**/*.{ts,tsx}`

## Docker Notes

- `docker-compose.yml` định nghĩa 3 services: `minio`, `api`, `web`
- Named volumes: `minio-data` (lưu objects), `api-uploads` (lưu uploads local)
- Production dùng `deploy/compose.yml` với cấu trúc tương tự nhưng tối ưu cho production domains
- Build args: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `API_INTERNAL_URL`

## API Reference (Selected Endpoints)

**Công khai:**
- `GET /health`, `GET /api/v1/ping` - Health checks (ping MongoDB, return 503 nếu down)
- `GET /api/v1/banners` - Active banners sắp xếp theo `order`
- `GET /api/v1/settings` - Site settings (singleton)
- `GET /api/v1/menu` - Navigation menu items
- `GET /api/v1/pages/by-path?path=/...` - Published CMS page
- `GET /api/v1/categories` - Product categories
- `GET /api/v1/hero` - Hero statements
- `GET /api/v1/products` - Tất cả active products
- `GET /api/v1/products/{slug}` - Product detail
- `GET /api/v1/products/best-sellers` - Featured products (fallback sang `product_views`)
- `GET /api/v1/products/search?q=...` - Tìm kiếm products
- `GET /uploads/{path}` - Serve uploaded media (cached, immutable)

**Admin (cần bearer token):**
- `POST /api/v1/admin/bootstrap` - Tạo admin đầu tiên
- `POST /api/v1/admin/login` - Admin login
- `GET /api/v1/admin/me` - Current admin profile
- Tất cả `/api/v1/content/*` - CRUD cho banners, menu, pages, categories, hero, products, settings
- `POST /api/v1/content/uploads/images` - Upload ảnh (multipart)

**Khách hàng (cần customer bearer token):**
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login` - Phone/password
- `POST /api/v1/auth/verify-otp` - OTP verification
- `POST /api/v1/auth/google` - Google OAuth
- `POST /api/v1/uploads/sessions` - Tạo upload session
- `POST /api/v1/uploads/sessions/{id}/finalize` - Hoàn thành upload, tạo order
- `GET /api/v1/orders` - List customer orders
