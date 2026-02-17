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
ADMIN_TOKEN_SECRET=change-this-secret
ADMIN_TOKEN_TTL_SECONDS=86400
STORAGE_BACKEND=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_BUCKET_NAME=inanh24h-media
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## API Endpoints
- `GET /health` -> health check with MongoDB ping (returns `503` when DB unreachable)
- `GET /api/v1/ping` -> ping check with MongoDB ping (returns `503` when DB unreachable)
- `POST /api/v1/admin/bootstrap` -> create first admin account in MongoDB (only works when no admin exists)
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
