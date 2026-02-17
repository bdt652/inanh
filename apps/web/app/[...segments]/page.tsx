import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import ScrollProgress from "../components/ScrollProgress";
import { getCategories, getMenuItems, getPageByPath, getSiteSettings } from "../lib/api";
import { normalizePath, stripHtmlSuffix, toHtmlPath } from "../lib/paths";

const SITE_NAME = "In ảnh 24h";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const dynamic = "force-dynamic";

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

function resolveLegacyRedirect(rawPath: string): string | null {
  const lowered = rawPath.toLowerCase();
  if (lowered === "/san-pham.html") return "/san-pham";
  if (lowered.startsWith("/san-pham/") && lowered.endsWith(".html")) return rawPath.slice(0, -5);
  if (lowered === "/admin.html") return "/admin";
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
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Trang chủ",
      item: SITE_URL,
    },
  ];
  let current = "";
  parts.forEach((part, idx) => {
    current += `/${part}`;
    items.push({
      "@type": "ListItem",
      position: idx + 2,
      name: idx === parts.length - 1 ? title : part.replace(/-/g, " "),
      item: absoluteUrl(current),
    });
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
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

function resolveFallbackContent(categoryLabel?: string): string {
  if (categoryLabel) {
    return `Bạn có thể bổ sung nội dung SEO chi tiết cho danh mục ${categoryLabel} trong phần Pages để cải thiện khả năng tìm kiếm.`;
  }
  return "Bạn có thể bổ sung nội dung trang này trong phần Pages để hiển thị thông tin đầy đủ cho người dùng và công cụ tìm kiếm.";
}

function sanitizeHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
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

function resolveRenderableContent(rawContent: string): string {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return "";
  }
  const hasHtmlTag = /<[a-z][\s\S]*>/i.test(trimmed);
  return hasHtmlTag ? sanitizeHtml(trimmed) : plainTextToHtml(trimmed);
}

export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { segments } = await params;
  const rawPath = toRawPath(segments);
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { segments } = await params;
  const rawPath = toRawPath(segments);
  const redirectPath = resolveLegacyRedirect(rawPath);
  if (redirectPath) {
    redirect(redirectPath);
  }
  const path = toPath(segments);

  const [settings, context] = await Promise.all([getSiteSettings(), resolveDynamicContext(path)]);
  const { page, categories, menuItems, categoryMatch, menuMatch } = context;

  if (!page && !categoryMatch && !menuMatch) {
    notFound();
  }

  const title = page?.title ?? categoryMatch?.label ?? menuMatch?.label ?? "Trang";
  const summary = page?.summary ?? resolveFallbackSummary(categoryMatch?.label);
  const content = page?.content ?? resolveFallbackContent(categoryMatch?.label);
  const renderedContent = resolveRenderableContent(content);
  const description = toMetaDescription(summary || content);
  const breadcrumb = buildBreadcrumb(path, title);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    inLanguage: "vi-VN",
    url: absoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <div className="relative min-h-screen">
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={settings?.logo_url} />
      <ScrollProgress />

      <main className="w-full pb-14 pt-8">
        <article className="panel-plain w-full rounded-none px-4 py-6 md:px-10 md:py-10">
          <h1 className="font-display text-4xl font-semibold md:text-5xl">{title}</h1>
          {summary && <p className="mt-4 text-sm text-[var(--text-soft)] md:text-base">{summary}</p>}
          {categoryMatch?.img && (
            <div className="photo-frame mt-6 overflow-hidden rounded-none">
              <img src={categoryMatch.img} alt={categoryMatch.label} className="h-full max-h-[360px] w-full object-cover" />
            </div>
          )}
          {renderedContent && (
            <div
              className="rich-content mt-6 text-sm leading-7 text-[var(--text-soft)] md:text-base"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          )}
        </article>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <FooterSection categories={categories} settings={settings} />
    </div>
  );
}
