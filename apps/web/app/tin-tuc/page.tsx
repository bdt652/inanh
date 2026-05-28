import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import { PageTransition, ScrollReveal } from "../components/motion";
import ScrollProgress from "../components/ScrollProgress";
import { getCategories, getMenuItems, getPublishedPosts, getSiteSettings } from "../lib/api";
import { buildBreadcrumbJsonLd, SITE_NAME, SITE_URL } from "../lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Tin tức | ${SITE_NAME}`,
  description: "Tổng hợp tin tức về in ảnh, hướng dẫn chọn khổ ảnh, chất liệu in, cách đặt hàng và các tips hữu ích từ In ảnh 24h.",
  alternates: { canonical: `${SITE_URL}/tin-tuc.html` },
  openGraph: {
    title: `Tin tức | ${SITE_NAME}`,
    description: "Tổng hợp tin tức về in ảnh, hướng dẫn chọn khổ ảnh, chất liệu in, cách đặt hàng và các tips hữu ích.",
    url: `${SITE_URL}/tin-tuc.html`,
    siteName: SITE_NAME,
    type: "website",
    locale: "vi_VN",
  },
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function TinTucPage() {
  const [menuItems, categories, siteSettings, posts] = await Promise.all([
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
    safe(getPublishedPosts, []),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Tin tức", url: `${SITE_URL}/tin-tuc` },
  ]);

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `Tin tức | ${SITE_NAME}`,
    url: `${SITE_URL}/tin-tuc`,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.summary,
      url: `${SITE_URL}/tin-tuc/${post.slug}`,
      datePublished: post.created_at ?? undefined,
      dateModified: post.updated_at ?? post.created_at ?? undefined,
    })),
  };

  return (
    <div className="relative min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }} />

      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />

      <main className="w-full pb-12 pt-8 px-4 md:px-8">
        <ScrollReveal variant="fadeUp">
          <nav className="mb-6 text-xs text-[var(--text-soft)]">
            <Link href="/" className="hover:underline">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span>Tin tức</span>
          </nav>

          <h1 className="font-display text-3xl font-semibold">Tin tức</h1>
          <p className="mt-2 text-sm text-[var(--text-soft)]">
            Tips và hướng dẫn chi tiết về chọn khổ ảnh, chất liệu, cách đặt hàng.
          </p>
        </ScrollReveal>

        <PageTransition>
          {posts.length === 0 ? (
            <p className="mt-12 text-center text-sm text-[var(--text-soft)]">Chưa có tin tức nào.</p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, index) => (
                <ScrollReveal key={post.id} variant="fadeUp" delay={index * 0.06}>
                  <Link
                    href={`/tin-tuc/${post.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-none border border-[var(--line)] bg-white transition hover:border-[var(--accent-strong)]"
                  >
                    {post.cover_image && (
                      <div className="relative h-44 w-full overflow-hidden bg-[var(--surface)]">
                        <Image
                          src={post.cover_image}
                          alt={post.title}
                          fill
                          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      {post.tags.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {post.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-none bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <h2 className="text-sm font-semibold leading-snug text-[var(--text)] group-hover:text-[var(--accent-strong)]">
                        {post.title}
                      </h2>
                      {post.summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-soft)]">{post.summary}</p>
                      )}
                      <p className="mt-auto pt-3 text-xs font-semibold text-[var(--accent-strong)]">Đọc thêm →</p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </PageTransition>
      </main>

      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
