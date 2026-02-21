export type AdminLoginResponse = {
  access_token: string;
  token_type: string;
  expires_at: number;
};

export type AdminProfile = {
  username: string;
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
  order: number;
  is_active: boolean;
  is_featured: boolean;
  extra_options: string[];
  allow_online_order: boolean;
  min_images?: number | null;
  max_images?: number | null;
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
  order: number;
  is_active: boolean;
  is_featured: boolean;
  extra_options: string[];
  allow_online_order: boolean;
  min_images?: number | null;
  max_images?: number | null;
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
};
