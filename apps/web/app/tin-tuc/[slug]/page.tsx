import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import AmbientGlow from "../../components/AmbientGlow";
import FooterSection from "../../components/FooterSection";
import HeaderBar from "../../components/HeaderBar";
import { PageTransition, ScrollReveal } from "../../components/motion";
import ScrollProgress from "../../components/ScrollProgress";
import { getCategories, getMenuItems, getPostBySlug, getPublishedPosts, getSiteSettings } from "../../lib/api";
import { buildBreadcrumbJsonLd, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "../../lib/seo";
import RichContentRenderer from "../../components/RichContentRenderer";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function generateStaticParams() {
  try {
    const posts = await getPublishedPosts();
    return posts.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy tin tức", robots: { index: false, follow: false } };

  const url = `${SITE_URL}/tin-tuc/${post.slug}.html`;
  const image = post.cover_image ?? `${SITE_URL}${DEFAULT_OG_IMAGE}`;

  const metaTitle = post.seo_title?.trim() || post.title;
  const metaDesc = post.seo_description?.trim() || post.summary || undefined;

  return {
    title: `${metaTitle} | ${SITE_NAME}`,
    description: metaDesc,
    keywords: post.focus_keyword?.trim() ? [post.focus_keyword.trim(), ...post.tags] : post.tags,
    alternates: { canonical: url },
    openGraph: {
      title: metaTitle,
      description: metaDesc,
      url,
      siteName: SITE_NAME,
      type: "article",
      locale: "vi_VN",
      images: [{ url: image }],
      publishedTime: post.created_at ?? undefined,
      modifiedTime: post.updated_at ?? post.created_at ?? undefined,
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const [post, menuItems, categories, siteSettings] = await Promise.all([
    getPostBySlug(slug),
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
  ]);

  if (!post) notFound();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Tin tức", url: `${SITE_URL}/tin-tuc.html` },
    { name: post.title, url: `${SITE_URL}/tin-tuc/${post.slug}.html` },
  ]);

  const image = post.cover_image ?? `${SITE_URL}${DEFAULT_OG_IMAGE}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary || undefined,
    image,
    url: `${SITE_URL}/tin-tuc/${post.slug}.html`,
    datePublished: post.created_at ?? undefined,
    dateModified: post.updated_at ?? post.created_at ?? undefined,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="relative min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />

      <main className="w-full pb-12 pt-8">
        <PageTransition>
        <article className="panel-plain w-full rounded-none px-4 py-6 md:px-8 md:py-8">
          <ScrollReveal variant="fadeUp">
            <nav className="mb-6 text-xs text-[var(--text-soft)]">
              <Link href="/" className="hover:underline">Trang chủ</Link>
              <span className="mx-2">/</span>
              <Link href="/tin-tuc" className="hover:underline">Tin tức</Link>
              <span className="mx-2">/</span>
              <span className="line-clamp-1">{post.title}</span>
            </nav>

            {post.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-none bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-strong)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">{post.title}</h1>

            {post.summary && (
              <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-soft)]">{post.summary}</p>
            )}
          </ScrollReveal>

          {post.content && (
            <section className="mt-8 border-t border-[var(--line)] pt-8">
              <RichContentRenderer
                html={post.content}
                className="rich-content text-sm leading-7 text-[var(--text-soft)] md:text-base"
              />
            </section>
          )}

          <ScrollReveal variant="fadeUp" delay={0.15}>
            <div className="mt-12 border-t border-[var(--line)] pt-6">
              <Link href="/tin-tuc" className="text-sm font-semibold text-[var(--accent-strong)] hover:underline">
                ← Xem tất cả tin tức
              </Link>
            </div>
          </ScrollReveal>
        </article>
        </PageTransition>
      </main>

      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
