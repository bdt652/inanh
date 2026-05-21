export type MenuItem = {
  label: string;
  path: string;
};

export type Category = {
  label: string;
  slug: string;
  img: string;
};

export type HeroStatement = {
  title: string;
  description: string;
};

export type ProductCard = {
  id?: string;
  slug?: string;
  category_slug?: string;
  title: string;
  short: string;
  old_price: string;
  current_price: string;
  description: string;
  image_url?: string;
  highlight?: string;
  tags?: string[];
  extra_options?: string[];
  allow_online_order?: boolean;
  pricing_mode?: "combo" | "retail";
  min_images?: number | null;
  max_images?: number | null;
};

export type ProductDetail = {
  id?: string;
  name: string;
  slug: string;
  category_slug: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  image_urls: string[];
  short_description: string;
  content?: string;
  allow_online_order?: boolean;
  pricing_mode?: "combo" | "retail";
  min_images?: number | null;
  max_images?: number | null;
  is_active?: boolean;
};

export type Banner = {
  alt: string;
  img: string;
};

export type SiteSetting = {
  logo_url: string;
  google_header: string;
  footer: string;
  title: string;
  site_title?: string;
  site_description?: string;
  address: string;
  hotline_zalo: string;
  email: string;
  upload_min_files?: number | null;
  upload_max_files?: number | null;
  upload_max_bytes?: number | null;
  upload_require_verified_phone_threshold?: number | null;
};

export type DynamicPage = {
  slug: string;
  path: string;
  title: string;
  summary: string;
  content: string;
};
