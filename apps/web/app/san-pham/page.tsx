import type { Metadata } from "next";
import Link from "next/link";

import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import ProductGrid from "../components/ProductGrid";
import ScrollProgress from "../components/ScrollProgress";
import { getAllProducts, getCategories, getMenuItems, getSiteSettings } from "../lib/api";
import type { ProductCard } from "../lib/content";
import { toHtmlPath } from "../lib/paths";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://inanh24h.com").replace(/\/+$/, "");
const DEFAULT_OG_IMAGE = "/Inanh/logo_inanh24h.jpg";

export const metadata: Metadata = {
  title: "Sản phẩm | In ảnh 24h",
  description: "Danh sách sản phẩm in ảnh, ảnh gỗ, album ảnh với báo giá minh bạch tại In ảnh 24h.",
  alternates: {
    canonical: `${SITE_URL}/san-pham`,
    languages: {
      "vi-VN": `${SITE_URL}/san-pham`,
    },
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    alternateLocale: "en_US",
    title: "Sản phẩm | In ảnh 24h",
    description: "Xem toàn bộ sản phẩm và tìm kiếm nhanh theo từ khóa.",
    url: `${SITE_URL}/san-pham`,
    images: [{ url: DEFAULT_OG_IMAGE, alt: "In ảnh 24h" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sản phẩm | In ảnh 24h",
    description: "Xem toàn bộ sản phẩm và tìm kiếm nhanh theo từ khóa.",
    images: [DEFAULT_OG_IMAGE],
  },
};

type ProductsPageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isMatchProduct(product: ProductCard, query: string): boolean {
  const normalizedQuery = normalizeToken(query);
  if (!normalizedQuery) return true;

  const candidates = [
    product.title,
    product.short,
    product.description,
    ...(product.tags ?? []),
  ].map((item) => normalizeToken(item ?? ""));

  return candidates.some((item) => item.includes(normalizedQuery));
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const queryRaw = Array.isArray(resolvedSearchParams.q)
    ? (resolvedSearchParams.q[0] ?? "")
    : (resolvedSearchParams.q ?? "");
  const query = queryRaw.trim();

  const [menuItems, categories, products, siteSettings] = await Promise.all([
    getMenuItems(),
    getCategories(),
    getAllProducts(),
    getSiteSettings(),
  ]);

  const filteredProducts = query ? products.filter((item) => isMatchProduct(item, query)) : products;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sản phẩm",
    description: "Danh sách sản phẩm tại In ảnh 24h",
    url: `${SITE_URL}/san-pham`,
    about: "In ảnh, ảnh gỗ, album ảnh, quà tặng in ấn",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/san-pham?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Sản phẩm", item: `${SITE_URL}/san-pham` },
    ],
  };

  return (
    <div className="relative min-h-screen">
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />
      <main className="w-full px-4 pb-12 pt-6 md:px-8">
        {query && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-none border border-[var(--line)] bg-white/80 px-4 py-3 text-sm text-[var(--text-soft)]">
            <p>
              Kết quả tìm kiếm cho: <span className="font-semibold text-[var(--text-main)]">&quot;{query}&quot;</span>
            </p>
            <Link
              href={toHtmlPath("/san-pham")}
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]"
            >
              Xóa bộ lọc
            </Link>
          </div>
        )}

        <ProductGrid
          header={query ? "Kết quả tìm kiếm" : "Tất cả sản phẩm"}
          subtitle={query ? `Từ khóa: ${query}` : "Danh mục đầy đủ"}
          highlight={`Tổng: ${filteredProducts.length}`}
          products={filteredProducts}
        />

        {query && filteredProducts.length === 0 && (
          <div className="mt-4 rounded-none border border-[var(--line)] bg-white/80 px-4 py-6 text-sm text-[var(--text-soft)]">
            Không tìm thấy sản phẩm phù hợp. Bạn thử từ khóa khác nhé.
          </div>
        )}
      </main>
      <FooterSection categories={categories} settings={siteSettings} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    </div>
  );
}
