export type AdminLoginResponse = {
  access_token: string;
  token_type: string;
  expires_at: number;
};

export type AdminProfile = {
  username: string;
};

export type AdminOrderSummary = {
  order_id: string;
  status: string;
  total_products: number;
  total_images: number;
  updated_at: number;
  user_id: string;
};

export type AdminOrderProduct = {
  id: string;
  name: string;
  quantity: number;
  copies_per_image?: number;
  image_copies?: { key: string; copies: number }[];
  notes?: string | null;
  images: string[];
  options: string[];
  selected_product_slug?: string | null;
};

export type AdminOrderDetail = AdminOrderSummary & {
  created_at: number;
  note?: string | null;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  products: AdminOrderProduct[];
};

export type AdminDraftSummary = {
  user_id: string;
  saved_at: number;
  total_products: number;
  total_images: number;
};

export type AdminDraftProductPreview = {
  id: string;
  name: string;
  key: string;
  size?: number | null;
  status?: "ready" | "duplicate" | string;
  copies?: number;
};

export type AdminDraftProduct = {
  name: string;
  notes?: string | null;
  price_per_image: number;
  copies_per_image?: number;
  selected_product_slug?: string | null;
  selected_options: string[];
  previews: AdminDraftProductPreview[];
};

export type AdminDraftDetail = {
  user_id: string;
  note?: string | null;
  saved_at: number;
  products: AdminDraftProduct[];
};

export type AdminUserRecord = {
  phone: string;
  email?: string | null;
  phone_verified: boolean;
  is_active: boolean;
  created_at: number;
};

export type AdminUserUpdate = {
  email?: string | null;
  phone_verified?: boolean;
  is_active?: boolean;
};

export type MenuRecord = {
  id: string;
  label: string;
  path: string;
  order: number;
};

export type CategoryRecord = {
  id: string;
  label: string;
  slug: string;
  img: string;
  order: number;
};

export type HeroRecord = {
  id: string;
  title: string;
  description: string;
  order: number;
};

export type ProductRecord = {
  id: string;
  name: string;
  slug: string;
  category_slug: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  image_urls: string[];
  short_description: string;
  content: string;
  order: number;
  is_active: boolean;
  is_featured: boolean;
  extra_options: string[];
  allow_online_order: boolean;
  pricing_mode?: "combo" | "retail";
  min_images?: number | null;
  max_images?: number | null;
  tags?: string[];
  seo_title?: string;
  seo_description?: string;
  focus_keyword?: string;
};

export type PageRecord = {
  id: string;
  slug: string;
  path: string;
  title: string;
  summary: string;
  content: string;
  is_published: boolean;
  order: number;
};

export type BannerRecord = {
  id: string;
  alt: string;
  img: string;
  order: number;
  is_active: boolean;
};

export type SettingsRecord = {
  id: string;
  logo_url: string;
  google_header: string;
  footer: string;
  title: string;
  address: string;
  hotline_zalo: string;
  email: string;
  upload_min_files?: number | null;
  upload_max_files?: number | null;
  upload_max_bytes?: number | null;
  upload_require_verified_phone_threshold?: number | null;
  login_phone_enabled?: boolean;
  login_google_enabled?: boolean;
};

export type MenuUpsert = {
  label: string;
  path: string;
  order: number;
};

export type CategoryUpsert = {
  label: string;
  slug: string;
  img: string;
  order: number;
};

export type HeroUpsert = {
  title: string;
  description: string;
  order: number;
};

export type ProductUpsert = {
  name: string;
  slug: string;
  category_slug: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  image_urls: string[];
  short_description: string;
  content: string;
  order: number;
  is_active: boolean;
  is_featured: boolean;
  extra_options: string[];
  allow_online_order: boolean;
  pricing_mode: "combo" | "retail";
  min_images?: number | null;
  max_images?: number | null;
  tags: string[];
  seo_title: string;
  seo_description: string;
  focus_keyword: string;
};

export type PageUpsert = {
  slug: string;
  path: string;
  title: string;
  summary: string;
  content: string;
  is_published: boolean;
  order: number;
};

export type BannerUpsert = {
  alt: string;
  img: string;
  order: number;
  is_active: boolean;
};

export type SettingsUpsert = {
  logo_url: string;
  google_header: string;
  footer: string;
  title: string;
  address: string;
  hotline_zalo: string;
  email: string;
  upload_min_files?: number | null;
  upload_max_files?: number | null;
  upload_max_bytes?: number | null;
  upload_require_verified_phone_threshold?: number | null;
  login_phone_enabled?: boolean;
  login_google_enabled?: boolean;
};

export type PostUpsert = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  cover_image: string | null;
  is_published: boolean;
  tags: string[];
  order: number;
  seo_title: string;
  seo_description: string;
  focus_keyword: string;
};

export type PostRecord = PostUpsert & {
  id: string;
  created_at: string | null;
  updated_at: string | null;
};

export type ReviewRecord = {
  id: string;
  product_slug: string;
  rating: number;
  body: string;
  reviewer_name: string;
  is_approved: boolean;
  created_at: string | null;
};
