import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AmbientGlow from "../../components/AmbientGlow";
import FooterSection from "../../components/FooterSection";
import HeaderBar from "../../components/HeaderBar";
import ScrollProgress from "../../components/ScrollProgress";
import { getCategories, getMenuItems, getProductDetail, getSiteSettings } from "../../lib/api";
import { toHtmlPath } from "../../lib/paths";
import ProductImageGallery from "./ProductImageGallery";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://inanh24h.com").replace(/\/+$/, "");
const ZALO_URL = "https://zalo.me/0877226644";
const LOGIN_URL = toHtmlPath("/dang-nhap");

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function toCurrencyVnd(value: number): string {
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}

function categoryLabel(categorySlug: string): string {
  return categorySlug.replace(/-/g, " ").trim();
}

function normalizeDescription(value: string, categorySlug: string): string {
  const text = value.trim();
  if (text) return text;
  const category = categoryLabel(categorySlug);
  return category ? `Sản phẩm thuộc danh mục ${category}.` : "Sản phẩm in ảnh chất lượng cao.";
}

function productUrl(slug: string): string {
  return `${SITE_URL}${toHtmlPath(`/san-pham/${encodeURIComponent(slug)}`)}`;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) {
    return {
      title: "Không tìm thấy sản phẩm",
      robots: { index: false, follow: false },
    };
  }

  const description = normalizeDescription(product.short_description, product.category_slug);
  const allowOnlineOrder = product.allow_online_order !== false;
  const minImages = product.min_images ?? null;
  const maxImages = product.max_images ?? null;
  const title = `${product.name} | In ảnh 24h`;
  const image = product.image_url || product.image_urls[0] || "";
  const url = productUrl(product.slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      locale: "vi_VN",
      images: image ? [{ url: image, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const [menuItems, categories, siteSettings, product] = await Promise.all([
    getMenuItems(),
    getCategories(),
    getSiteSettings(),
    getProductDetail(slug),
  ]);

  if (!product) {
    notFound();
  }

  const images = product.image_urls.length > 0 ? product.image_urls : product.image_url ? [product.image_url] : [];
  const hasSale = product.sale_price !== null && product.sale_price > 0 && product.sale_price < product.price;
  const effectivePrice = hasSale && product.sale_price !== null ? product.sale_price : product.price;
  const description = normalizeDescription(product.short_description, product.category_slug);
  const allowOnlineOrder = product.allow_online_order !== false;
  const minImages = product.min_images ?? null;
  const maxImages = product.max_images ?? null;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Sản phẩm", item: productUrl("") },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl(product.slug) },
    ],
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description,
    sku: product.slug,
    category: categoryLabel(product.category_slug),
    brand: {
      "@type": "Brand",
      name: "In ảnh 24h",
    },
    offers: {
      "@type": "Offer",
      url: productUrl(product.slug),
      priceCurrency: "VND",
      price: String(Math.round(effectivePrice)),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="relative min-h-screen">
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />

      <main className="w-full pb-12 pt-8">
        <article className="panel-plain w-full rounded-none px-4 py-6 md:px-8 md:py-8">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--text-soft)]">
            <Link href="/" className="hover:text-[var(--accent-strong)]">
              Trang chủ
            </Link>
            <span>/</span>
            <Link href={toHtmlPath("/san-pham")} className="hover:text-[var(--accent-strong)]">
              Sản phẩm
            </Link>
            <span>/</span>
            <span className="text-[var(--text-main)]">{product.name}</span>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)] lg:items-start">
            <ProductImageGallery productName={product.name} images={images} />

            <section className="space-y-4 lg:sticky lg:top-20">
              <h1 className="font-display text-3xl font-semibold leading-tight md:text-5xl">{product.name}</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Danh mục: {categoryLabel(product.category_slug) || "Sản phẩm"}
              </p>

              <div className="flex flex-wrap items-end gap-3">
                {hasSale && <span className="text-sm text-[var(--text-soft)] line-through">{toCurrencyVnd(product.price)}</span>}
                <span className="font-display text-4xl font-semibold text-[var(--accent-strong)]">{toCurrencyVnd(effectivePrice)}</span>
              </div>

              <p className="text-sm leading-7 text-[var(--text-soft)]">{description}</p>
              {(minImages || maxImages) && (
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-soft)]">
                  Gioi han anh:{" "}
                  {minImages ? `toi thieu ${minImages}` : "khong gioi han toi thieu"}
                  {maxImages ? `, toi da ${maxImages}` : ""}.
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-3 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                <span className="rounded-none border border-[var(--line)] px-2 py-1">In ảnh 24h</span>
                {categoryLabel(product.category_slug) && (
                  <Link
                    href={toHtmlPath(`/${product.category_slug}`)}
                    className="rounded-none border border-[var(--line)] px-2 py-1 hover:text-[var(--accent-strong)]"
                  >
                    {categoryLabel(product.category_slug)}
                  </Link>
                )}
                <Link
                  href={toHtmlPath("/in-anh")}
                  className="rounded-none border border-[var(--line)] px-2 py-1 hover:text-[var(--accent-strong)]"
                >
                  In ảnh lấy ngay
                </Link>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={toHtmlPath("/san-pham")}
                  className="rounded-none border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text-soft)] hover:bg-white"
                >
                  Xem sản phẩm khác
                </Link>
                {allowOnlineOrder ? (
                  <a
                    href={LOGIN_URL}
                    className="rounded-none bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-sm hover:brightness-110"
                  >
                    {"\u0110\u0103ng nh\u1eadp \u0111\u1ec3 \u0111\u1eb7t h\u00e0ng"}
                  </a>
                ) : (
                  <div className="rounded-none border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-amber-900">
                    {"Ch\u1ec9 nh\u1eadn \u0111\u1eb7t qua Zalo"}
                  </div>
                )}
                <a
                  href={ZALO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-none border border-[var(--accent-strong)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
                >
                  Nhắn Zalo báo giá
                </a>
              </div>
            </section>
          </div>
        </article>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
