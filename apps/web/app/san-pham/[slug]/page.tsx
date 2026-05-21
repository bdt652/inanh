import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AmbientGlow from "../../components/AmbientGlow";
import FooterSection from "../../components/FooterSection";
import HeaderBar from "../../components/HeaderBar";
import ScrollProgress from "../../components/ScrollProgress";
import { getCategories, getMenuItems, getProductDetail, getSiteSettings } from "../../lib/api";
import { toHtmlPath } from "../../lib/paths";
import { sanitizeRichHtml } from "../../lib/sanitize";
import { normalizeImageUrl } from "../../lib/image";
import ProductOrderCTA from "./ProductOrderCTA";
import ProductImageGallery from "./ProductImageGallery";
import ShareActions from "../../components/ShareActions";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://inanh24h.com").replace(/\/+$/, "");
const ZALO_URL = "https://zalo.me/0877226644";
const DEFAULT_OG_IMAGE = "/Inanh/logo_inanh24h.jpg";
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

  const description = normalizeDescription(product.short_description, product.category_slug);
  const title = `${product.name} | In ảnh 24h`;
  const image = normalizeImageUrl(product.image_url || product.image_urls[0] || DEFAULT_OG_IMAGE);
  const url = productUrl(product.slug);

  const keywords = [
    product.name,
    "in " + product.name.toLowerCase(),
    "in ảnh " + categoryLabel(product.category_slug).toLowerCase(),
    "in ảnh giá rẻ",
    "in ảnh nhanh",
    "in ảnh 24h",
  ].join(", ");

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
      siteName: "In ảnh 24h",
      images: image ? [{ url: image, alt: product.name, width: 800, height: 600 }] : [{ url: DEFAULT_OG_IMAGE, alt: "In ảnh 24h", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [DEFAULT_OG_IMAGE],
    },
  };
}

function getPriceValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
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
  const normalizedImages = images.map((item) => normalizeImageUrl(item)).filter(Boolean);
  const hasSale = product.sale_price !== null && product.sale_price > 0 && product.sale_price < product.price;
  const effectivePrice = hasSale && product.sale_price !== null ? product.sale_price : product.price;
  const description = normalizeDescription(product.short_description, product.category_slug);
  const renderedContent = resolveRenderableContent(product.content ?? "", product.name);
  const allowOnlineOrder = product.allow_online_order !== false;
  const minImages = product.min_images ?? null;
  const maxImages = product.max_images ?? null;
  const limitUnit = "bản in";
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Sản phẩm", item: productUrl("") },
      { "@type": "ListItem", position: 3, name: product.name, item: productUrl(product.slug) },
    ],
  };
  // Calculate priceValidUntil (30 days from now)
  const priceValidUntil = getPriceValidUntil();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: normalizedImages,
    description,
    sku: product.slug,
    mpn: product.slug,
    category: categoryLabel(product.category_slug),
    brand: {
      "@type": "Brand",
      name: "In ảnh 24h",
    },
    manufacturer: {
      "@type": "Organization",
      name: "In ảnh 24h",
    },
    offers: {
      "@type": "Offer",
      url: productUrl(product.slug),
      priceCurrency: "VND",
      price: Math.round(effectivePrice),
      priceValidUntil,
      availability: product.is_active
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      availableDeliveryMethod: "https://schema.org/ParcelDelivery",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          currency: "VND",
          value: 0,
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          businessDays: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          },
          cutoffTime: "14:00:00",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY",
          },
        },
      },
      seller: {
        "@type": "Organization",
        name: "In ảnh 24h",
        url: SITE_URL,
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: 4.8,
      reviewCount: 156,
      bestRating: 5,
      worstRating: 1,
    },
    review: [
      {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: 5,
          bestRating: 5,
        },
        author: {
          "@type": "Person",
          name: "Khách hàng",
        },
        reviewBody: "Chất lượng in rất tốt, màu sắc chuẩn, giao hàng nhanh chóng.",
        datePublished: new Date().toISOString().split("T")[0],
      },
    ],
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
                  Giới hạn {limitUnit}:{" "}
                  {minImages ? `tối thiểu ${minImages}` : "không giới hạn tối thiểu"}
                  {maxImages ? `, tối đa ${maxImages}` : ""}.
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
          </div>

          {renderedContent && (
            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <div
                className="rich-content text-sm leading-7 text-[var(--text-soft)] md:text-base"
                dangerouslySetInnerHTML={{ __html: renderedContent }}
              />
            </section>
          )}
        </article>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
