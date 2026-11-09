"""Tests for AI-generated post endpoint (/admin/ai/generate-post).

These tests mock the Vertex Key chat + image clients so they run offline.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from app.db.mongo import get_db
from app.main import app
from app.api.v1 import ai_assistant
from tests.auth_helpers import login_headers, seed_admin
from tests.fakes import FakeDB


client = TestClient(app)


def _fake_chat_client() -> AsyncMock:
    """Return an AsyncOpenAI-like client whose chat.completions.create returns JSON."""
    json_payload = {
        "title": "Cách chọn khổ ảnh canvas phù hợp",
        "summary": "Hướng dẫn chọn khổ ảnh canvas chuẩn nhất cho phòng khách.",
        "content": (
            "<h2>Giới thiệu</h2><p>Noi dung mau.</p>"
            '<img data-ai-img="1" alt="canvas 1">'
            "<h2>Chi tiet</h2><p>Thong tin.</p>"
            '<img data-ai-img="2" alt="canvas 2">'
            "<h2>Ket luan</h2><p>Ket luan.</p>"
            '<img data-ai-img="3" alt="canvas 3">'
        ),
        "tags": ["in ảnh canvas", "khổ ảnh"],
        "seo_title": "Chọn khổ ảnh canvas chuẩn",
        "seo_description": "Hướng dẫn chọn khổ ảnh canvas phù hợp nhất.",
        "focus_keyword": "khổ ảnh canvas",
        "cover_image_prompt": "canvas photo print on wooden frame studio",
        "section_image_prompts": [
            {"prompt": "canvas print living room", "alt": "Phòng khách treo ảnh canvas"},
            {"prompt": "canvas print detail", "alt": "Chi tiết ảnh canvas"},
            {"prompt": "canvas print gift", "alt": "Ảnh canvas làm quà"},
        ],
    }
    message = SimpleNamespace(content=f"```json\n{__import__('json').dumps(json_payload, ensure_ascii=False)}\n```")
    choice = SimpleNamespace(message=message)
    response = SimpleNamespace(choices=[choice])
    fake_client = AsyncMock()
    fake_client.chat.completions.create = AsyncMock(return_value=response)
    return fake_client


def _install_mocks(monkeypatch: object) -> None:
    mp = monkeypatch  # type: ignore[assignment]
    # The endpoint checks configuration before calling the mocked clients.
    # Keep success tests independent of local .env files and CI secrets.
    mp.setattr(ai_assistant.settings, "ai_api_key", "test-only-ai-api-key")
    mp.setattr(ai_assistant, "_make_client", lambda: _fake_chat_client())
    mp.setattr(
        ai_assistant,
        "_generate_image_via_vertex",
        AsyncMock(side_effect=lambda prompt, model=None, size="1536x1024": f"https://img.test/{abs(hash(prompt)) % 10000}.webp"),
    )


def test_generate_post_builds_draft_with_images(monkeypatch) -> None:
    _install_mocks(monkeypatch)
    fake_db = FakeDB()
    seed_admin(fake_db)
    app.dependency_overrides[get_db] = lambda: fake_db
    try:
        headers = login_headers(client)
        resp = client.post(
            "/api/v1/admin/ai/generate-post",
            json={"topic": "Cách chọn khổ ảnh canvas", "keywords": ["in ảnh"], "tone": "thân thiện"},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        post = data["post"]
        assert post["title"]
        assert post["is_published"] is False
        assert post["cover_image"] and post["cover_image"].startswith("https://img.test/")
        # All 3 inline placeholders replaced with real URLs, no data-ai-img left.
        assert "data-ai-img" not in post["content"]
        assert post["content"].count("<img src=") == 3
        assert data["image_count"] == 4  # 1 cover + 3 inline
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_generate_post_unconfigured_returns_503(monkeypatch) -> None:
    _install_mocks(monkeypatch)
    from app.core.config import settings

    original = settings.ai_api_key
    settings.ai_api_key = ""
    try:
        fake_db = FakeDB()
        seed_admin(fake_db)
        app.dependency_overrides[get_db] = lambda: fake_db
        try:
            headers = login_headers(client)
            resp = client.post(
                "/api/v1/admin/ai/generate-post",
                json={"topic": "test"},
                headers=headers,
            )
            assert resp.status_code == 503
            assert resp.json()["detail"] == "AI service is not configured (missing ai_api_key)."
            ai_assistant._generate_image_via_vertex.assert_not_awaited()
        finally:
            app.dependency_overrides.pop(get_db, None)
    finally:
        settings.ai_api_key = original
