import type {
  Banner,
  Category,
  DynamicPage,
  HeroStatement,
  MenuItem,
  ProductCard,
  ProductDetail,
  SiteSetting,
} from "./content";
import { normalizePath, stripHtmlSuffix } from "./paths";

const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ??
  (backendBase ? `${backendBase}/api/v1` : "http://localhost:8000/api/v1")
).replace(/\/+$/, "");

async function fetchFromApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

export async function getMenuItems(): Promise<MenuItem[]> {
  return fetchFromApi<MenuItem[]>("/menu");
}

export async function getCategories(): Promise<Category[]> {
  return fetchFromApi<Category[]>("/categories");
}

export async function getHeroStatements(): Promise<HeroStatement[]> {
  return fetchFromApi<HeroStatement[]>("/hero");
}

export async function getBanners(): Promise<Banner[]> {
  return fetchFromApi<Banner[]>("/banners");
}

export async function getSiteSettings(): Promise<SiteSetting | null> {
  const response = await fetch(`${API_BASE}/settings`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for /settings`);
  }

  return (await response.json()) as SiteSetting;
}

export async function getPageByPath(path: string): Promise<DynamicPage | null> {
  const normalized = normalizePath(path);
  const candidates = [normalized];
  const stripped = stripHtmlSuffix(normalized);
  if (stripped !== normalized) {
    candidates.push(stripped);
  }

  for (const candidate of candidates) {
    const encoded = encodeURIComponent(candidate);
    const response = await fetch(`${API_BASE}/pages/by-path?path=${encoded}`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      continue;
    }

    if (!response.ok) {
      throw new Error(`API request failed (${response.status}) for /pages/by-path`);
    }

    return (await response.json()) as DynamicPage;
  }

  return null;
}
export async function getBestSellers(limit = 6): Promise<ProductCard[]> {
  const items = await fetchFromApi<ProductCard[]>(
    `/products/best-sellers?${new URLSearchParams({ featured_only: "true", limit: String(limit) })}`
  );
  return items;
}

export async function getAllProducts(limit = 200): Promise<ProductCard[]> {
  return fetchFromApi<ProductCard[]>(
    `/products/best-sellers?${new URLSearchParams({ featured_only: "false", limit: String(limit) })}`
  );
}

export async function getProductDetail(slug: string): Promise<ProductDetail | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return null;
  }

  const response = await fetch(`${API_BASE}/products/${encodeURIComponent(normalizedSlug)}`, {
    next: { revalidate: 60 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for /products/${normalizedSlug}`);
  }

  return (await response.json()) as ProductDetail;
}

export async function searchProducts(query: string, limit = 6): Promise<ProductCard[]> {
  const encoded = new URLSearchParams({ q: query, limit: String(limit) });
  return fetchFromApi<ProductCard[]>(`/products/search?${encoded}`);
}


