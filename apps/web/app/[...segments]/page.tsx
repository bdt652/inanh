import type { Metadata } from "next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import { PageTransition, ScrollReveal } from "../components/motion";
import ProductGrid from "../components/ProductGrid";
import RichContentRenderer from "../components/RichContentRenderer";
import ScrollProgress from "../components/ScrollProgress";
import { getAllProducts, getBestSellers, getCategories, getMenuItems, getPageByPath, getSiteSettings } from "../lib/api";
import type { ProductCard } from "../lib/content";
import { normalizeImageUrl, shouldSkipImageOptimization } from "../lib/image";
import { normalizePath, stripHtmlSuffix, toHtmlPath } from "../lib/paths";
import { sanitizeRichHtml } from "../lib/sanitize";
import { buildBreadcrumbJsonLd, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "../lib/seo";

export const revalidate = 300;

type DynamicPageProps = {
  params: Promise<{ segments: string[] }>;
};

function toPath(segments: string[]): string {
  const joined = segments.map((segment) => segment.trim()).filter(Boolean).join("/");
  return stripHtmlSuffix(normalizePath(joined));
}

function toRawPath(segments: string[]): string {
  const joined = segments.map((segment) => segment.trim()).filter(Boolean).join("/");
  return normalizePath(joined);
}

function hasNonHtmlExtension(rawPath: string): boolean {
  const lastSegment = rawPath.split("/").pop() ?? "";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
  return ext !== "html";
}

function resolveLegacyRedirect(rawPath: string): string | null {
  const lowered = rawPath.toLowerCase();
  if (lowered === "/san-pham.html") return "/san-pham";
  if (lowered.startsWith("/san-pham/") && lowered.endsWith(".html")) return rawPath.slice(0, -5);
  if (lowered === "/admin.html") return "/admin";
  if (lowered.startsWith("/admin/") && lowered.endsWith(".html")) return rawPath.slice(0, -5);
  if (lowered === "/quan-ly-don-hang/cart.html") return "/quan-ly-don-hang/cart";
  if (lowered.startsWith("/quan-ly-don-hang/") && lowered.endsWith(".html")) return rawPath.slice(0, -5);
  if (lowered === "/tin-tuc.html") return "/tin-tuc";
  if (lowered.startsWith("/tin-tuc/") && lowered.endsWith(".html")) return rawPath.slice(0, -5);
  return null;
}

function toMetaDescription(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "In ảnh online 24h với quy trình rõ ràng, nội dung cập nhật đầy đủ cho từng danh mục và dịch vụ.";
  }
  if (normalized.length <= 160) {
    return normalized;
  }
  return `${normalized.slice(0, 157).trimEnd()}...`;
}

function absoluteUrl(path: string): string {
  const htmlPath = toHtmlPath(path);
  return htmlPath === "/" ? SITE_URL : `${SITE_URL}${htmlPath}`;
}

function buildBreadcrumb(path: string, title: string) {
  const parts = path.split("/").filter(Boolean);
  const items: Array<{ name: string; url: string }> = [{ name: "Trang chủ", url: SITE_URL }];
  let current = "";
  parts.forEach((part, idx) => {
    current += `/${part}`;
    items.push({
      name: idx === parts.length - 1 ? title : part.replace(/-/g, " "),
      url: absoluteUrl(current),
    });
  });
  return buildBreadcrumbJsonLd(items);
}

async function resolveDynamicContext(path: string) {
  const [page, categories, menuItems] = await Promise.all([getPageByPath(path), getCategories(), getMenuItems()]);
  const categoryMatch = categories.find((item) => normalizePath(item.slug) === path);
  const menuMatch = menuItems.find((item) => normalizePath(item.path) === path);
  return { page, categories, menuItems, categoryMatch, menuMatch };
}

function resolveFallbackSummary(categoryLabel?: string): string {
  if (categoryLabel) {
    return `Danh mục ${categoryLabel} đang được cập nhật nội dung chi tiết và thông tin dịch vụ mới nhất.`;
  }
  return "Nội dung trang đang được cập nhật, vui lòng quay lại trong thời gian gần nhất.";
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { segments } = await params;
  const rawPath = toRawPath(segments);
  if (hasNonHtmlExtension(rawPath)) {
    return { title: "Không tìm thấy trang", robots: { index: false, follow: false } };
  }
  const redirectPath = resolveLegacyRedirect(rawPath);
  if (redirectPath) {
    return {
      title: "Redirecting",
      robots: { index: false, follow: false },
      alternates: { canonical: redirectPath },
    };
  }
  const path = toPath(segments);
  const { page, categoryMatch, menuMatch } = await resolveDynamicContext(path);

  if (!page && !categoryMatch && !menuMatch) {
    return {
      title: "Không tìm thấy trang",
      robots: { index: false, follow: false },
    };
  }

  const title = page?.title ?? categoryMatch?.label ?? menuMatch?.label ?? "Trang";
  const summary = page?.summary || page?.content || resolveFallbackSummary(categoryMatch?.label);
  const description = toMetaDescription(summary);
  const shouldIndex = Boolean(page || categoryMatch);
  const ogImage = categoryMatch?.img ? normalizeImageUrl(categoryMatch.img) : DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: {
      canonical: toHtmlPath(path),
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
    openGraph: {
      type: "article",
      locale: "vi_VN",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteUrl(path),
      images: [{ url: ogImage, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { segments } = await params;
  const rawPath = toRawPath(segments);
  if (hasNonHtmlExtension(rawPath)) {
    notFound();
  }
  const redirectPath = resolveLegacyRedirect(rawPath);
  if (redirectPath) {
    redirect(redirectPath);
  }
  const path = toPath(segments);

  const [settings, context, products, bestSellers] = await Promise.all([
    getSiteSettings(),
    resolveDynamicContext(path),
    getAllProducts(),
    getBestSellers(6),
  ]);
  const { page, categories, menuItems, categoryMatch, menuMatch } = context;

  if (!page && !categoryMatch && !menuMatch) {
    notFound();
  }

  const title = page?.title ?? categoryMatch?.label ?? menuMatch?.label ?? "Trang";
  const summary = page?.summary ?? "";
  const content = page?.content ?? "";
  const renderedContent = resolveRenderableContent(content, title);
  const description = toMetaDescription(summary || content);
  const breadcrumb = buildBreadcrumb(path, title);

  const normalizedCategoryPath = categoryMatch ? normalizePath(categoryMatch.slug) : null;
  const normalizedCategoryLabel = categoryMatch?.label
    ? normalizePath(categoryMatch.label).replace(/\s+/g, "-")
    : null;
  const categoryProducts: ProductCard[] =
    normalizedCategoryPath && products.length
      ? products.filter((p) => {
          const cat = normalizePath(p.category_slug ?? "");
          const tagMatch = (p.tags ?? []).some((t) => {
            const norm = normalizePath(t);
            return norm === normalizedCategoryPath || norm === normalizedCategoryLabel;
          });
          const textMatch = (() => {
            const labelNorm = normalizeToken(categoryMatch?.label ?? "");
            const tokens = labelNorm ? labelNorm.split(/\s+/).filter(Boolean) : [];
            if (!tokens.length) return false;
            const hay = `${p.title ?? ""} ${p.short ?? ""} ${p.description ?? ""}`
              .split(/\s+/)
              .map(normalizeToken)
              .join(" ");
            return tokens.every((t) => hay.includes(t));
          })();
          return cat === normalizedCategoryPath || tagMatch || textMatch;
        })
      : [];

  const fallbackProducts = bestSellers.length > 0 ? bestSellers : products;
  const displayProducts = categoryProducts.length > 0 ? categoryProducts : fallbackProducts.slice(0, 8);

  const pageUrl = absoluteUrl(path);
  const jsonLd = categoryMatch
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        inLanguage: "vi-VN",
        url: pageUrl,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
        hasPart: categoryProducts.slice(0, 20).map((p) => ({
          "@type": "Product",
          name: p.title,
          url: `${SITE_URL}/san-pham/${encodeURIComponent(p.slug ?? p.id ?? "")}`,
        })),
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        description,
        inLanguage: "vi-VN",
        url: pageUrl,
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
      };

  return (
    <div className="relative min-h-screen">
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={settings?.logo_url} />
      <ScrollProgress />

      <main className="w-full pb-14 pt-8">
        <PageTransition>
        <article className="panel-plain w-full rounded-none px-4 py-6 md:px-10 md:py-10">
          <ScrollReveal variant="bounceIn">
          <h1 className="font-display text-4xl font-semibold md:text-5xl">{title}</h1>
          {summary && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-soft)]">{summary}</p>
          )}
          </ScrollReveal>
          {categoryMatch?.img && (
            <ScrollReveal variant="zoomIn" delay={0.1}>
            <div className="photo-frame mt-6 overflow-hidden rounded-none">
              <Image
                src={normalizeImageUrl(categoryMatch.img)}
                alt={categoryMatch.label}
                width={1200}
                height={360}
                sizes="100vw"
                className="h-auto max-h-[360px] w-full object-cover"
                unoptimized={shouldSkipImageOptimization(categoryMatch.img)}
              />
            </div>
            </ScrollReveal>
          )}
          {renderedContent && (
            <section className="mt-8 border-t border-[var(--line)] pt-8">
              <RichContentRenderer
                html={renderedContent}
                className="rich-content text-sm leading-7 text-[var(--text-soft)] md:text-base"
              />
            </section>
          )}

          {categoryMatch && displayProducts.length > 0 && (
            <ScrollReveal variant="fadeUp" delay={0.3}>
            <section className="mt-10 border-t border-[var(--line)] pt-8">
              <ProductGrid
                header={categoryProducts.length > 0 ? categoryMatch.label : "Gợi ý nổi bật"}
                subtitle="Theo danh mục"
                highlight={`Tổng: ${displayProducts.length}`}
                products={displayProducts}
                viewMoreHref="/san-pham"
                viewMoreLabel="Xem thêm sản phẩm"
              />
            </section>
            </ScrollReveal>
          )}
        </article>
        </PageTransition>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <FooterSection categories={categories} settings={settings} />
    </div>
  );
}
