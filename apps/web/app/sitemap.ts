import type { MetadataRoute } from "next";
import { normalizePath, toHtmlPath } from "./lib/paths";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "");
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ??
  (backendBase ? `${backendBase}/api/v1` : "http://localhost:8000/api/v1")
).replace(/\/+$/, "");

type MenuItem = { path: string };
type Category = { slug: string };
type Product = { slug: string };

function toAbsoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
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
  const staticPaths = ["/in-anh"];
  const [menuItems, categories, products] = await Promise.all([
    safeFetchList<MenuItem>("/menu"),
    safeFetchList<Category>("/categories"),
    safeFetchList<Product>("/products"),
  ]);

  const dynamicPaths = new Set<string>();
  menuItems.forEach((item) => {
    const normalized = normalizePath(item.path);
    if (normalized !== "/admin") dynamicPaths.add(toHtmlPath(normalized));
  });
  categories.forEach((item) => {
    const normalized = normalizePath(item.slug);
    if (normalized !== "/admin") dynamicPaths.add(toHtmlPath(normalized));
  });
  dynamicPaths.add(toHtmlPath("/san-pham"));
  staticPaths.forEach((p) => dynamicPaths.add(toHtmlPath(p)));
  products.forEach((item) => {
    const normalizedSlug = item.slug?.trim();
    if (!normalizedSlug) return;
    dynamicPaths.add(toHtmlPath(normalizePath(`/san-pham/${normalizedSlug}`)));
  });

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
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
  ];
}
