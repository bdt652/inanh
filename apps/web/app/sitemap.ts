import type { MetadataRoute } from "next";
import { normalizePath, toHtmlPath } from "./lib/paths";
import { resolveApiBase } from "./lib/api-base";
import { SITE_LAUNCH_DATE, SITE_URL } from "./lib/seo";

const API_BASE = resolveApiBase();
const DISALLOWED_PREFIXES = ["/admin", "/dang-nhap", "/dang-ky", "/quan-ly-don-hang"];

type MenuItem = { path: string };
type Category = { slug: string };
type Product = { slug: string };
type Post = { slug: string; updated_at: string | null };

function toAbsoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

function stripQueryAndHash(value: string): string {
  const [withoutHash] = value.split("#");
  return withoutHash.split("?")[0];
}

function normalizeCandidatePath(rawPath: string): string | null {
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return null;
  return normalizePath(stripQueryAndHash(trimmed));
}

function isDisallowed(path: string): boolean {
  return DISALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function safeFetchList<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${API_BASE}${path}`, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    return (await response.json()) as T[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Static pages with SEO content
  const staticPaths = [
    "/san-pham",
    "/lien-he",
    "/gioi-thieu",
    "/faq",
    "/chinh-sach-bao-mat",
    "/chinh-sach-giao-hang",
    "/chinh-sach-thanh-toan",
    "/chinh-sach-doi-tra",
  ];
  const [menuItems, categories, products, posts] = await Promise.all([
    safeFetchList<MenuItem>("/menu"),
    safeFetchList<Category>("/categories"),
    safeFetchList<Product>("/products"),
    safeFetchList<Post>("/posts"),
  ]);

  const dynamicPaths = new Set<string>();
  menuItems.forEach((item) => {
    const normalized = normalizeCandidatePath(item.path);
    if (!normalized || isDisallowed(normalized)) return;
    dynamicPaths.add(toHtmlPath(normalized));
  });
  categories.forEach((item) => {
    const normalized = normalizeCandidatePath(item.slug);
    if (!normalized || isDisallowed(normalized)) return;
    dynamicPaths.add(toHtmlPath(normalized));
  });
  dynamicPaths.add(toHtmlPath("/san-pham"));
  staticPaths.forEach((p) => dynamicPaths.add(toHtmlPath(p)));
  products.forEach((item) => {
    const normalizedSlug = item.slug?.trim();
    if (!normalizedSlug) return;
    dynamicPaths.add(toHtmlPath(normalizePath(`/san-pham/${normalizedSlug}`)));
  });
  dynamicPaths.add(toHtmlPath("/tin-tuc"));
  posts.forEach((post) => {
    const normalizedSlug = post.slug?.trim();
    if (!normalizedSlug) return;
    dynamicPaths.add(toHtmlPath(normalizePath(`/tin-tuc/${normalizedSlug}`)));
  });

  const productSlugs = new Set(
    products.map((p) => toHtmlPath(normalizePath(`/san-pham/${p.slug?.trim()}`))).filter(Boolean),
  );
  const categorySlugs = new Set(
    categories.map((c) => toHtmlPath(normalizeCandidatePath(c.slug) ?? "")).filter(Boolean),
  );
  const staticPagePaths = new Set(staticPaths.map((p) => toHtmlPath(p)));
  const postSlugs = new Set(
    posts.map((p) => toHtmlPath(normalizePath(`/tin-tuc/${p.slug?.trim()}`))).filter(Boolean),
  );
  const postLastModified = new Map(
    posts.map((p) => [
      toHtmlPath(normalizePath(`/tin-tuc/${p.slug?.trim()}`)),
      p.updated_at ? new Date(p.updated_at) : now,
    ]),
  );

  function getPriority(path: string): number {
    if (productSlugs.has(path)) return 0.9;
    if (path === "/san-pham") return 0.85;
    if (categorySlugs.has(path)) return 0.8;
    if (postSlugs.has(path)) return 0.75;
    if (path === toHtmlPath("/tin-tuc")) return 0.75;
    if (staticPagePaths.has(path)) return 0.7;
    return 0.6;
  }

  function getChangeFrequency(path: string): MetadataRoute.Sitemap[number]["changeFrequency"] {
    if (productSlugs.has(path)) return "weekly";
    if (path === "/san-pham") return "daily";
    if (categorySlugs.has(path)) return "weekly";
    if (postSlugs.has(path) || path === toHtmlPath("/tin-tuc")) return "monthly";
    return "monthly";
  }

  const STATIC_PATHS = new Set([
    toHtmlPath("/faq"),
    toHtmlPath("/gioi-thieu"),
    toHtmlPath("/lien-he"),
    toHtmlPath("/chinh-sach-bao-mat"),
    toHtmlPath("/chinh-sach-doi-tra"),
  ]);

  function getLastModified(path: string): Date {
    if (STATIC_PATHS.has(path)) return SITE_LAUNCH_DATE;
    if (postSlugs.has(path)) return postLastModified.get(path) ?? now;
    return now;
  }

  return [
    {
      url: toAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...Array.from(dynamicPaths)
      .filter((path) => path !== "/")
      .sort()
      .map((path) => ({
        url: toAbsoluteUrl(path),
        lastModified: getLastModified(path),
        changeFrequency: getChangeFrequency(path),
        priority: getPriority(path),
      })),
  ];
}
