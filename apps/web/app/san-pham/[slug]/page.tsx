import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AmbientGlow from "../../components/AmbientGlow";
import FooterSection from "../../components/FooterSection";
import HeaderBar from "../../components/HeaderBar";
import { PageTransition, ScrollReveal } from "../../components/motion";
import ScrollProgress from "../../components/ScrollProgress";
import { getAllProducts, getCategories, getMenuItems, getProductDetail, getProductReviews, getSiteSettings } from "../../lib/api";
import { toHtmlPath } from "../../lib/paths";
import { sanitizeRichHtml } from "../../lib/sanitize";
import { normalizeImageUrl } from "../../lib/image";
import { buildBreadcrumbJsonLd, buildProductJsonLd, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, ZALO_OA_URL } from "../../lib/seo";
import ProductOrderCTA from "./ProductOrderCTA";
import ProductImageGallery from "./ProductImageGallery";
import ProductReviews from "./ProductReviews";
import ShareActions from "../../components/ShareActions";
import RichContentRenderer from "../../components/RichContentRenderer";

const ZALO_URL = ZALO_OA_URL;
export const revalidate = 300;

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

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function ensureImageAlt(html: string, fallbackAlt: string): string {
  const safeAlt = escapeHtmlAttr(fallbackAlt);
  return html.replace(/<img\b([^>]*?)>/gi, (match, attrs) => {
    if (/\balt\s*=/.test(attrs)) return match;
    return `<img${attrs} alt="${safeAlt}">`;
  });
}

function plainTextToHtml(rawText: string): string {
  const escaped = rawText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function resolveRenderableContent(rawContent: string, fallbackAlt?: string): string {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return "";
  }
  const hasHtmlTag = /<[a-z][\s\S]*>/i.test(trimmed);
  if (!hasHtmlTag) {
    return plainTextToHtml(trimmed);
  }
  const sanitized = sanitizeRichHtml(trimmed);
  return fallbackAlt ? ensureImageAlt(sanitized, fallbackAlt) : sanitized;
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

  const description = product.seo_description?.trim()
    || normalizeDescription(product.short_description, product.category_slug);
  const title = product.seo_title?.trim()
    ? `${product.seo_title.trim()} | In ảnh 24h`
    : `${product.name} | In ảnh 24h`;
  const image = normalizeImageUrl(product.image_url || product.image_urls[0] || DEFAULT_OG_IMAGE);
  const url = productUrl(product.slug);

  const baseKeywords = [
    product.name,
    "in " + product.name.toLowerCase(),
    "in ảnh " + categoryLabel(product.category_slug).toLowerCase(),
    "in ảnh giá rẻ",
    "in ảnh nhanh",
    "in ảnh 24h",
    ...(product.tags ?? []),
  ];
  const keywords = product.focus_keyword?.trim()
    ? [product.focus_keyword.trim(), ...baseKeywords].join(", ")
    : baseKeywords.join(", ");

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      locale: "vi_VN",
      siteName: SITE_NAME,
      images: image ? [{ url: image, alt: product.name, width: 800, height: 600 }] : [{ url: DEFAULT_OG_IMAGE, alt: SITE_NAME, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [DEFAULT_OG_IMAGE],
    },
  };
}

export async function generateStaticParams() {
  try {
    const products = await getAllProducts(500);
    return products.filter((p) => p.slug).map((p) => ({ slug: p.slug! }));
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const [menuItems, categories, siteSettings, product, reviewStats] = await Promise.all([
    getMenuItems(),
    getCategories(),
    getSiteSettings(),
    getProductDetail(slug),
    getProductReviews(slug).catch(() => null),
  ]);

  if (!product) {
    notFound();
  }

  const images = product.image_urls.length > 0 ? product.image_urls : product.image_url ? [product.image_url] : [];
  const hasSale = product.sale_price !== null && product.sale_price > 0 && product.sale_price < product.price;
  const effectivePrice = hasSale && product.sale_price !== null ? product.sale_price : product.price;
  const description = normalizeDescription(product.short_description, product.category_slug);
  const renderedContent = resolveRenderableContent(product.content ?? "", product.name);
  const allowOnlineOrder = product.allow_online_order !== false;
  const minImages = product.min_images ?? null;
  const maxImages = product.max_images ?? null;
  const limitUnit = "bản in";
  const url = productUrl(product.slug);

  const approvedReviews = reviewStats?.reviews ?? [];
  const aggregateRating =
    reviewStats && reviewStats.review_count >= 1
      ? { value: reviewStats.average_rating, count: reviewStats.review_count }
      : undefined;
  const jsonLd = buildProductJsonLd(product, url, approvedReviews, aggregateRating);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Sản phẩm", url: `${SITE_URL}/san-pham` },
    { name: product.name, url },
  ]);

  return (
    <div className="relative min-h-screen">
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />

      <main className="w-full pb-12 pt-8">
        <PageTransition>
        <article className="panel-plain w-full rounded-none px-4 py-6 md:px-8 md:py-8">
          <ScrollReveal variant="fadeDown" duration={0.4}>
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
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)] lg:items-start">
            <ScrollReveal variant="zoomIn" delay={0.1}>
            <ProductImageGallery productName={product.name} images={images} />
            </ScrollReveal>

            <ScrollReveal variant="fadeRight" delay={0.2}>
            <section className="space-y-4 lg:sticky lg:top-20">
              <h1 className="font-display text-3xl font-semibold leading-tight md:text-5xl">{product.name}</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                Danh mục: {categoryLabel(product.category_slug) || "Sản phẩm"}
              </p>

              <div className="flex flex-wrap items-end gap-3">
                {hasSale && <span className="text-sm text-[var(--text-soft)] line-through">{toCurrencyVnd(product.price)}</span>}
                <span className="font-display text-4xl font-semibold text-[var(--accent-strong)]">{toCurrencyVnd(effectivePrice)}</span>
                <span className="rounded-none border border-[var(--line)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-soft)]">
                  {product.pricing_mode === "combo" ? "Giá combo" : "Giá theo ảnh"}
                </span>
              </div>

              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-none bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-strong)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-sm leading-7 text-[var(--text-soft)]">{description}</p>
              {(minImages || maxImages) && (
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-soft)]">
                  Giới hạn {limitUnit}:{" "}
                  {minImages ? `tối thiểu ${minImages}` : "không giới hạn tối thiểu"}
                  {maxImages ? `, tối đa ${maxImages}` : ""}.
                </p>
              )}

              {product.extra_options && product.extra_options.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">Tùy chọn in ấn</p>
                  <div className="flex flex-wrap gap-2">
                    {product.extra_options.map((opt) => (
                      <span
                        key={opt}
                        className="rounded-none border border-[var(--line)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
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
                  <ProductOrderCTA slug={product.slug} />
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

              <ShareActions title={product.name} description={description} url={productUrl(product.slug)} />
            </section>
            </ScrollReveal>
          </div>

          {renderedContent && (
            <ScrollReveal variant="fadeUp" delay={0.3}>
            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <RichContentRenderer
                html={renderedContent}
                className="rich-content text-sm leading-7 text-[var(--text-soft)] md:text-base"
              />
            </section>
            </ScrollReveal>
          )}

          <ScrollReveal variant="fadeUp" delay={0.4}>
          <ProductReviews productSlug={product.slug} initialStats={reviewStats} />
          </ScrollReveal>
        </article>
        </PageTransition>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
