from __future__ import annotations

from pydantic import BaseModel, Field, model_validator


class HealthResponse(BaseModel):
    ok: bool


class PingResponse(BaseModel):
    pong: bool


class MenuItem(BaseModel):
    label: str
    path: str


class MenuItemUpsert(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    path: str = Field(min_length=1, max_length=200)
    order: int = Field(default=0, ge=0)


class MenuItemRecord(MenuItem):
    id: str
    order: int = 0


class DynamicPage(BaseModel):
    slug: str
    path: str
    title: str
    summary: str = ""
    content: str = ""


class DynamicPageUpsert(BaseModel):
    slug: str = Field(min_length=1, max_length=120)
    path: str = Field(min_length=1, max_length=240)
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(default="", max_length=2000)
    content: str = Field(default="", max_length=20000)
    is_published: bool = True
    order: int = Field(default=0, ge=0)


class DynamicPageRecord(DynamicPage):
    id: str
    is_published: bool = True
    order: int = 0


class Category(BaseModel):
    label: str
    slug: str
    img: str = ""


class CategoryUpsert(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    slug: str = Field(min_length=1, max_length=120)
    img: str = Field(default="", max_length=1000)
    order: int = Field(default=0, ge=0)


class CategoryRecord(Category):
    id: str
    order: int = 0


class HeroStatement(BaseModel):
    title: str
    description: str


class HeroStatementUpsert(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    description: str = Field(min_length=1, max_length=800)
    order: int = Field(default=0, ge=0)


class HeroStatementRecord(HeroStatement):
    id: str
    order: int = 0


class Banner(BaseModel):
    alt: str
    img: str


class BannerUpsert(BaseModel):
    alt: str = Field(min_length=1, max_length=180)
    img: str = Field(min_length=1, max_length=500)
    order: int = Field(default=0, ge=0)
    is_active: bool = True


class BannerRecord(Banner):
    id: str
    order: int = 0
    is_active: bool = True


class SiteSetting(BaseModel):
    logo_url: str = ""
    google_header: str
    footer: str
    title: str
    address: str
    hotline_zalo: str
    email: str


class SiteSettingUpsert(BaseModel):
    logo_url: str = Field(default="", max_length=1000)
    google_header: str = Field(default="")
    footer: str = Field(default="", max_length=2000)
    title: str = Field(default="", max_length=200)
    address: str = Field(min_length=1, max_length=500)
    hotline_zalo: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=1, max_length=200)


class SiteSettingRecord(SiteSetting):
    id: str


class AdminLoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)


class AdminBootstrapRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=200)


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: int


class AdminProfile(BaseModel):
    username: str


class DeleteResult(BaseModel):
    deleted: bool
    id: str


class UploadImageResponse(BaseModel):
    url: str


class ProductView(BaseModel):
    id: str | None = Field(None, description="Product id or slug for frontend usage.")
    title: str
    short: str
    old_price: str
    current_price: str
    description: str
    image_url: str = ""
    highlight: str | None = None
    tags: list[str] = Field(default_factory=list)


class Product(BaseModel):
    id: str | None = None
    name: str
    price: float
    slug: str


class ProductDetail(Product):
    category_slug: str = ""
    sale_price: float | None = None
    image_url: str = ""
    image_urls: list[str] = Field(default_factory=list)
    short_description: str = ""


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    price: float = Field(ge=0)
    slug: str = Field(min_length=1, max_length=180)


class ProductUpsert(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    slug: str = Field(min_length=1, max_length=180)
    category_slug: str = Field(min_length=1, max_length=120)
    price: float = Field(ge=0)
    sale_price: float | None = Field(default=None, ge=0)
    image_url: str = Field(default="", max_length=1000)
    image_urls: list[str] = Field(default_factory=list, max_length=30)
    short_description: str = Field(default="", max_length=1200)
    order: int = Field(default=0, ge=0)
    is_active: bool = True
    is_featured: bool = False

    @model_validator(mode="after")
    def normalize_images(self) -> "ProductUpsert":
        normalized_urls = [url.strip() for url in self.image_urls if url.strip()]
        if not normalized_urls and self.image_url.strip():
            normalized_urls = [self.image_url.strip()]
        self.image_urls = normalized_urls
        self.image_url = normalized_urls[0] if normalized_urls else ""
        if self.sale_price is not None and self.sale_price <= 0:
            self.sale_price = None
        return self


class ProductRecord(BaseModel):
    id: str
    name: str
    slug: str
    category_slug: str
    price: float
    sale_price: float | None = None
    image_url: str = ""
    image_urls: list[str] = Field(default_factory=list)
    short_description: str = ""
    order: int = 0
    is_active: bool = True
    is_featured: bool = False
