from __future__ import annotations

from pydantic import BaseModel, Field, field_validator, model_validator


class HealthResponse(BaseModel):
    ok: bool


class PingResponse(BaseModel):
    pong: bool


class UserRegisterRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=8, max_length=200)
    email: str | None = Field(default=None, max_length=200)


class UserLoginRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=1, max_length=200)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=10, max_length=4000)
    phone: str | None = Field(default=None, max_length=20, description="Tùy chọn: bắt buộc nếu muốn in nhiều.")

class RequestOtpResponse(BaseModel):
    sent: bool
    debug_otp: str | None = None


class UserTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: int
    phone_verified: bool = False
    debug_otp: str | None = None


class PhoneOtpRequest(BaseModel):
    code: str = Field(min_length=4, max_length=10)


class UserProfile(BaseModel):
    phone: str
    email: str | None = None
    phone_verified: bool = False

class OrderProductPayload(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    quantity: int = Field(gt=0, le=10_000)
    notes: str | None = Field(default=None, max_length=1000)
    images: list[str] = Field(default_factory=list, max_length=30)
    options: list[str] = Field(default_factory=list, max_length=20)
    selected_product_slug: str | None = Field(default=None, max_length=200)

    @field_validator("images", mode="before")
    @classmethod
    def _normalize_images(cls, value: list[str] | tuple[str, ...] | str | None) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            iterator = [value]
        else:
            iterator = list(value)
        cleaned = []
        for item in iterator:
            if item is None:
                continue
            text = str(item).strip()
            if text:
                cleaned.append(text)
        return cleaned

    @field_validator("options", mode="before")
    @classmethod
    def _normalize_options(cls, value: list[str] | tuple[str, ...] | str | None) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            iterator = [value]
        else:
            iterator = list(value)
        cleaned = []
        for item in iterator:
            text = str(item).strip()
            if text:
                cleaned.append(text)
        return cleaned


class OrderProduct(OrderProductPayload):
    id: str


class OrderCreateRequest(BaseModel):
    products: list[OrderProductPayload] = Field(min_length=1, max_length=50)
    status: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=2000)


class OrderUpdateRequest(BaseModel):
    products: list[OrderProductPayload] | None = Field(default=None, max_length=50)
    status: str | None = Field(default=None, max_length=100)
    note: str | None = Field(default=None, max_length=2000)


class OrderSummary(BaseModel):
    order_id: str
    status: str
    total_products: int
    total_images: int
    updated_at: int


class OrderDetail(OrderSummary):
    products: list[OrderProduct]
    note: str | None = None
    created_at: int

class CartDraftProductPreview(BaseModel):
    id: str
    name: str
    key: str
    size: int | None = None
    status: str = "ready"


class CartDraftProduct(BaseModel):
    name: str
    notes: str | None = None
    price_per_image: int = Field(ge=0)
    selected_product_slug: str | None = None
    selected_options: list[str] = Field(default_factory=list)
    previews: list[CartDraftProductPreview] = Field(default_factory=list)

    @field_validator("selected_options", mode="before")
    @classmethod
    def _normalize_options(cls, value: list[str] | tuple[str, ...] | str | None) -> list[str]:
        if not value:
            return []
        if isinstance(value, str):
            iterator = [value]
        else:
            iterator = list(value)
        cleaned = []
        for item in iterator:
            text = str(item).strip()
            if text:
                cleaned.append(text)
        return cleaned


class CartDraftPayload(BaseModel):
    products: list[CartDraftProduct] = Field(min_length=1, max_length=30)
    note: str | None = Field(default=None, max_length=2000)


class CartDraftResponse(CartDraftPayload):
    saved_at: int


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
    upload_min_files: int | None = None
    upload_max_files: int | None = None
    upload_max_bytes: int | None = None
    upload_require_verified_phone_threshold: int | None = None


class SiteSettingUpsert(BaseModel):
    logo_url: str = Field(default="", max_length=1000)
    google_header: str = Field(default="")
    footer: str = Field(default="", max_length=2000)
    title: str = Field(default="", max_length=200)
    address: str = Field(min_length=1, max_length=500)
    hotline_zalo: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=1, max_length=200)
    upload_min_files: int | None = Field(default=None, ge=1, le=50_000)
    upload_max_files: int | None = Field(default=None, ge=1, le=50_000)
    upload_max_bytes: int | None = Field(default=None, ge=1, le=200_000_000_000)
    upload_require_verified_phone_threshold: int | None = Field(default=None, ge=1, le=50_000)

    @model_validator(mode="after")
    def validate_upload_limits(self) -> "SiteSettingUpsert":
        if self.upload_min_files is not None and self.upload_max_files is not None:
            if self.upload_min_files > self.upload_max_files:
                raise ValueError("upload_min_files must be <= upload_max_files.")
        return self


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


class UploadSessionCreateRequest(BaseModel):
    total_files: int = Field(gt=0, le=50_000)
    total_bytes: int | None = Field(default=None, ge=0)


class UploadPresignFile(BaseModel):
    filename: str = Field(min_length=1, max_length=500)
    size: int | None = Field(default=None, ge=0)
    content_type: str | None = Field(default=None, max_length=200)


class UploadPresignRequest(BaseModel):
    files: list[UploadPresignFile] = Field(min_length=1, max_length=500)


class UploadPresignResponseItem(BaseModel):
    key: str
    url: str
    expires_at: int
    content_type: str | None = None


class UploadDirectResponse(BaseModel):
    key: str
    size: int
    content_type: str | None = None


class UploadSessionResponse(BaseModel):
    session_id: str
    expires_at: int
    max_files: int
    max_bytes: int
    require_verified_phone: bool = False


class UploadBatchCompleteRequest(BaseModel):
    keys: list[str] = Field(min_length=1, max_length=500)


class UploadSessionSummary(BaseModel):
    session_id: str
    total_keys: int
    valid_images: int
    rejected: int
    total_bytes: int


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
    extra_options: list[str] = Field(default_factory=list)
    allow_online_order: bool = True
    min_images: int | None = None
    max_images: int | None = None


class Product(BaseModel):
    id: str | None = None
    name: str
    price: float
    slug: str
    extra_options: list[str] = Field(default_factory=list)
    allow_online_order: bool = True
    min_images: int | None = None
    max_images: int | None = None


class ProductDetail(Product):
    category_slug: str = ""
    sale_price: float | None = None
    image_url: str = ""
    image_urls: list[str] = Field(default_factory=list)
    short_description: str = ""
    allow_online_order: bool = True
    min_images: int | None = None
    max_images: int | None = None


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    price: float = Field(ge=0)
    slug: str = Field(min_length=1, max_length=180)
    allow_online_order: bool = True
    min_images: int | None = Field(default=None, ge=1, le=50_000)
    max_images: int | None = Field(default=None, ge=1, le=50_000)

    @model_validator(mode="after")
    def validate_image_limits(self) -> "ProductCreate":
        if self.min_images is not None and self.max_images is not None:
            if self.min_images > self.max_images:
                raise ValueError("min_images must be <= max_images.")
        return self


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
    extra_options: list[str] = Field(default_factory=list, max_length=20)
    allow_online_order: bool = True
    min_images: int | None = Field(default=None, ge=1, le=50_000)
    max_images: int | None = Field(default=None, ge=1, le=50_000)

    @model_validator(mode="after")
    def normalize_images(self) -> "ProductUpsert":
        normalized_urls = [url.strip() for url in self.image_urls if url.strip()]
        if not normalized_urls and self.image_url.strip():
            normalized_urls = [self.image_url.strip()]
        self.image_urls = normalized_urls
        self.image_url = normalized_urls[0] if normalized_urls else ""
        if self.sale_price is not None and self.sale_price <= 0:
            self.sale_price = None
        if self.min_images is not None and self.max_images is not None:
            if self.min_images > self.max_images:
                raise ValueError("min_images must be <= max_images.")
        return self

    @field_validator("extra_options", mode="after")
    def normalize_extra_options(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        for option in value:
            text = str(option).strip()
            if not text:
                continue
            if text not in normalized:
                normalized.append(text)
        return normalized


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
    extra_options: list[str] = Field(default_factory=list)
    allow_online_order: bool = True
    min_images: int | None = None
    max_images: int | None = None
