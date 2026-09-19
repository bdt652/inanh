from __future__ import annotations

import json
import re
import unicodedata
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from openai import AsyncOpenAI
from pydantic import BaseModel

from app.api.v1.auth import require_admin
from app.core.config import settings
from app.db.mongo import get_db

router = APIRouter(prefix="/admin/ai", tags=["ai-assistant"])


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = text.replace("đ", "d").replace("ð", "d")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:120]


def _pollinations_url(prompt: str, width: int = 1200, height: int = 800) -> str:
    encoded = quote(prompt, safe="")
    return f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true&enhance=true&seed=42"


def _make_client() -> AsyncOpenAI:
    if not settings.ai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured (missing ai_api_key).",
        )
    return AsyncOpenAI(base_url=settings.ai_base_url, api_key=settings.ai_api_key, timeout=90.0)


TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "create_product_draft",
            "description": "Tạo draft sản phẩm in ảnh đầy đủ thông tin (chưa active, admin xem và duyệt)",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Tên sản phẩm đầy đủ"},
                    "price": {"type": "number", "description": "Giá bán (VND)"},
                    "sale_price": {"type": "number", "description": "Giá sale nếu có khuyến mãi"},
                    "category_slug": {"type": "string", "description": "Slug danh mục, ví dụ: canvas, lich-anh, photobook, khung-anh"},
                    "short_description": {"type": "string", "description": "Mô tả ngắn 1-2 câu hấp dẫn"},
                    "content": {"type": "string", "description": "Nội dung HTML đầy đủ: công dụng, chất liệu, kích thước, quy trình in, ưu điểm"},
                    "seo_title": {"type": "string", "description": "Tiêu đề SEO tối đa 60 ký tự"},
                    "seo_description": {"type": "string", "description": "Mô tả SEO tối đa 160 ký tự"},
                    "image_prompt": {"type": "string", "description": "English prompt for product photo, e.g. 'canvas photo print 20x30cm wooden frame high quality photography studio'},"},
                },
                "required": ["name", "price", "category_slug", "short_description", "content", "image_prompt"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_post_draft",
            "description": "Tạo draft bài viết / tin tức đầy đủ nội dung (chưa publish)",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Tiêu đề bài viết hấp dẫn"},
                    "summary": {"type": "string", "description": "Tóm tắt 2-3 câu"},
                    "content": {"type": "string", "description": "Nội dung HTML đầy đủ với đủ đoạn, heading, danh sách"},
                    "tags": {"type": "array", "items": {"type": "string"}, "description": "Tags liên quan"},
                    "seo_title": {"type": "string", "description": "Tiêu đề SEO tối đa 60 ký tự"},
                    "seo_description": {"type": "string", "description": "Mô tả SEO tối đa 160 ký tự"},
                    "image_prompt": {"type": "string", "description": "English prompt for cover image"},
                },
                "required": ["title", "summary", "content", "image_prompt"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_page_draft",
            "description": "Tạo draft trang CMS đầy đủ nội dung (chưa publish)",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "path": {"type": "string", "description": "URL path, ví dụ: /gioi-thieu"},
                    "summary": {"type": "string", "description": "Tóm tắt ngắn"},
                    "content": {"type": "string", "description": "Nội dung HTML đầy đủ"},
                },
                "required": ["title", "path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_category_draft",
            "description": "Tạo danh mục sản phẩm mới",
            "parameters": {
                "type": "object",
                "properties": {
                    "label": {"type": "string", "description": "Tên danh mục hiển thị"},
                    "slug": {"type": "string", "description": "Slug URL"},
                    "image_prompt": {"type": "string", "description": "English prompt for category image"},
                },
                "required": ["label", "image_prompt"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_banner_draft",
            "description": "Tạo banner quảng cáo (chưa active)",
            "parameters": {
                "type": "object",
                "properties": {
                    "alt": {"type": "string", "description": "Mô tả / alt text banner"},
                    "order": {"type": "integer", "description": "Thứ tự hiển thị"},
                    "image_prompt": {"type": "string", "description": "English prompt for banner image, wide format"},
                },
                "required": ["alt", "image_prompt"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_hero_draft",
            "description": "Tạo hero statement (text nổi bật trang chủ)",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Tiêu đề ngắn gọn, ấn tượng"},
                    "description": {"type": "string", "description": "Mô tả 1-2 câu bổ sung"},
                    "order": {"type": "integer"},
                },
                "required": ["title", "description"],
            },
        },
    },
]

SYSTEM_PROMPT = """Bạn là trợ lý AI chuyên nghiệp cho website InAnh24h.vn — dịch vụ in ảnh online hàng đầu Việt Nam.
Các sản phẩm chính: in ảnh canvas, lịch ảnh, photobook, ảnh passport, in ảnh khung, in ảnh pha lê.

QUAN TRỌNG — Quy tắc tạo nội dung:
1. Luôn tạo nội dung ĐẦY ĐỦ, CHUYÊN NGHIỆP ngay trong tool call — không tạo stub hay placeholder
2. Nội dung HTML phải có heading (<h2>, <h3>), đoạn văn (<p>), danh sách (<ul><li>)
3. image_prompt phải bằng tiếng Anh, mô tả chi tiết sản phẩm/ảnh cần tạo
4. Giá cả tính bằng VND, phù hợp thị trường Việt Nam
5. SEO title và description phải tối ưu cho từ khóa in ảnh
6. Mọi nội dung là DRAFT — admin xem xét trước khi đăng

Ví dụ image_prompt tốt:
- "professional canvas photo print 20x30cm stretched on wooden frame, vibrant colors, studio photography"
- "beautiful photo calendar 2026 Vietnamese style, desk calendar, high quality print"
- "photo book hardcover album wedding memories, luxury print quality"

Sau khi tạo xong, trả lời ngắn gọn bằng tiếng Việt xác nhận đã tạo."""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class CreatedItem(BaseModel):
    type: str
    id: str
    name: str
    admin_url: str
    draft_data: dict


class ChatResponse(BaseModel):
    reply: str
    created_items: list[CreatedItem] = []


async def _execute_tool(tool_name: str, args: dict[str, Any], db: AsyncIOMotorDatabase) -> CreatedItem | None:
    now = datetime.now(UTC)

    if tool_name == "create_product_draft":
        name = str(args.get("name", "")).strip()
        slug = _slugify(name)
        image_prompt = str(args.get("image_prompt", f"product photo {name} Vietnamese print shop"))
        image_url = _pollinations_url(image_prompt)
        doc = {
            "name": name,
            "slug": slug,
            "category_slug": str(args.get("category_slug", "san-pham")).strip(),
            "price": float(args.get("price", 0)),
            "sale_price": float(args["sale_price"]) if args.get("sale_price") else None,
            "image_url": image_url,
            "image_urls": [image_url],
            "short_description": str(args.get("short_description", "")),
            "content": str(args.get("content", "")),
            "is_active": False,
            "is_featured": False,
            "order": 0,
            "extra_options": [],
            "tags": [],
            "seo_title": str(args.get("seo_title", ""))[:70],
            "seo_description": str(args.get("seo_description", ""))[:160],
            "focus_keyword": "",
            "allow_online_order": True,
            "pricing_mode": "retail",
            "created_at": now,
        }
        result = await db["products"].insert_one(doc)
        doc["_id"] = result.inserted_id
        return CreatedItem(
            type="product", id=str(result.inserted_id), name=name,
            admin_url="/admin/products",
            draft_data={
                "id": str(result.inserted_id),
                "name": doc["name"], "slug": doc["slug"],
                "category_slug": doc["category_slug"],
                "price": doc["price"], "sale_price": doc["sale_price"],
                "image_url": doc["image_url"], "image_urls": doc["image_urls"],
                "short_description": doc["short_description"],
                "content": doc["content"],
                "is_active": False, "is_featured": False, "order": 0,
                "extra_options": [], "tags": [],
                "seo_title": doc["seo_title"], "seo_description": doc["seo_description"],
                "focus_keyword": "", "allow_online_order": True, "pricing_mode": "retail",
            },
        )

    if tool_name == "create_post_draft":
        title = str(args.get("title", "")).strip()
        slug = _slugify(title)
        image_prompt = str(args.get("image_prompt", f"blog post cover {title}"))
        cover_image = _pollinations_url(image_prompt)
        doc = {
            "title": title, "slug": slug,
            "summary": str(args.get("summary", "")),
            "content": str(args.get("content", "")),
            "cover_image": cover_image,
            "tags": [str(t) for t in args.get("tags", [])],
            "is_published": False, "order": 0,
            "seo_title": str(args.get("seo_title", ""))[:70],
            "seo_description": str(args.get("seo_description", ""))[:160],
            "focus_keyword": "",
            "created_at": now, "updated_at": now,
        }
        result = await db["posts"].insert_one(doc)
        return CreatedItem(
            type="post", id=str(result.inserted_id), name=title,
            admin_url="/admin/tin-tuc",
            draft_data={
                "id": str(result.inserted_id),
                "slug": slug, "title": title,
                "summary": doc["summary"], "content": doc["content"],
                "cover_image": cover_image,
                "tags": doc["tags"], "is_published": False, "order": 0,
                "seo_title": doc["seo_title"], "seo_description": doc["seo_description"],
                "focus_keyword": "",
            },
        )

    if tool_name == "create_page_draft":
        title = str(args.get("title", "")).strip()
        path = str(args.get("path", "")).strip()
        if not path.startswith("/"):
            path = f"/{path}"
        slug = _slugify(title)
        doc = {
            "title": title, "slug": slug, "path": path,
            "summary": str(args.get("summary", "")),
            "content": str(args.get("content", "")),
            "is_published": False, "order": 0,
            "created_at": now,
        }
        result = await db["pages"].insert_one(doc)
        return CreatedItem(
            type="page", id=str(result.inserted_id), name=title,
            admin_url="/admin/pages",
            draft_data={
                "id": str(result.inserted_id),
                "slug": slug, "path": path, "title": title,
                "summary": doc["summary"], "content": doc["content"],
                "is_published": False, "order": 0,
            },
        )

    if tool_name == "create_category_draft":
        label = str(args.get("label", "")).strip()
        slug = str(args.get("slug", "")).strip() or _slugify(label)
        image_prompt = str(args.get("image_prompt", f"product category {label} Vietnamese print shop"))
        img = _pollinations_url(image_prompt, width=400, height=300)
        doc = {"label": label, "slug": slug, "img": img, "order": 0, "created_at": now}
        result = await db["categories"].insert_one(doc)
        return CreatedItem(
            type="category", id=str(result.inserted_id), name=label,
            admin_url="/admin/categories",
            draft_data={"id": str(result.inserted_id), "label": label, "slug": slug, "img": img, "order": 0},
        )

    if tool_name == "create_banner_draft":
        alt = str(args.get("alt", "")).strip()
        image_prompt = str(args.get("image_prompt", f"banner {alt} Vietnamese print shop promotional"))
        img = _pollinations_url(image_prompt, width=1920, height=600)
        doc = {"alt": alt, "img": img, "order": int(args.get("order", 99)), "is_active": False, "created_at": now}
        result = await db["banners"].insert_one(doc)
        return CreatedItem(
            type="banner", id=str(result.inserted_id), name=alt,
            admin_url="/admin/banners",
            draft_data={"id": str(result.inserted_id), "alt": alt, "img": img, "order": doc["order"], "is_active": False},
        )

    if tool_name == "create_hero_draft":
        title = str(args.get("title", "")).strip()
        doc = {
            "title": title,
            "description": str(args.get("description", "")),
            "order": int(args.get("order", 99)),
            "created_at": now,
        }
        result = await db["hero_statements"].insert_one(doc)
        return CreatedItem(
            type="hero", id=str(result.inserted_id), name=title,
            admin_url="/admin/hero",
            draft_data={"id": str(result.inserted_id), "title": title, "description": doc["description"], "order": doc["order"]},
        )

    return None


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    payload: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _current_admin: str = Depends(require_admin),
) -> ChatResponse:
    if not payload.messages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="messages cannot be empty.")

    client = _make_client()
    openai_messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in payload.messages:
        if msg.role in ("user", "assistant"):
            openai_messages.append({"role": msg.role, "content": msg.content})

    created_items: list[CreatedItem] = []
    reply = ""

    try:
        response = await client.chat.completions.create(
            model=settings.ai_model,
            messages=openai_messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=4000,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI service error: {exc}") from exc

    message = response.choices[0].message

    if message.tool_calls:
        tool_results: list[dict] = []
        for tool_call in message.tool_calls:
            try:
                args = json.loads(tool_call.function.arguments)
            except json.JSONDecodeError:
                args = {}
            item = await _execute_tool(tool_call.function.name, args, db)
            if item:
                created_items.append(item)
            tool_results.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps({"success": True, "id": item.id if item else None}, ensure_ascii=False),
            })

        assistant_msg: dict = {"role": "assistant", "content": message.content or ""}
        if message.tool_calls:
            assistant_msg["tool_calls"] = [
                {"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                for tc in message.tool_calls
            ]
        follow_up_messages = openai_messages + [assistant_msg] + tool_results
        try:
            follow_up = await client.chat.completions.create(
                model=settings.ai_model,
                messages=follow_up_messages,
                max_tokens=300,
            )
            reply = follow_up.choices[0].message.content or ""
        except Exception:
            reply = f"Đã tạo {len(created_items)} mục thành công. Xem bên dưới để chỉnh sửa và đăng."
    else:
        reply = message.content or ""

    return ChatResponse(reply=reply, created_items=created_items)
