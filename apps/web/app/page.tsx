import type { Metadata } from "next";

import AmbientGlow from "./components/AmbientGlow";
import BannerSlider from "./components/BannerSlider";
import CategoryGrid from "./components/CategoryGrid";
import FooterSection from "./components/FooterSection";
import HeaderBar from "./components/HeaderBar";
import HeroCards from "./components/HeroCards";
import ProductGrid from "./components/ProductGrid";
import RevealSection from "./components/RevealSection";
import ScrollProgress from "./components/ScrollProgress";
import {
  getBanners,
  getBestSellers,
  getCategories,
  getHeroStatements,
  getMenuItems,
  getSiteSettings,
} from "./lib/api";
import { toHtmlPath } from "./lib/paths";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const SITE_NAME = "In ảnh 24h";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings?.site_title || "In ảnh 24h - In nhanh, đúng màu";
  const description =
    settings?.site_description ||
    "In ảnh online 24h, in nhanh chuẩn màu, báo giá minh bạch, hỗ trợ giao đúng hẹn.";
  const ogImage = settings?.logo_url ? [{ url: settings.logo_url, alt: title }] : [];

  return {
    title,
    description,
    alternates: { canonical: toHtmlPath("/") },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: SITE_NAME,
      title,
      description,
      url: SITE_URL,
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage.map((img) => img.url),
    },
  };
}

export default async function Home() {
  const [menuItems, heroStatements, categories, bestSellers, banners, siteSettings] = await Promise.all([
    getMenuItems(),
    getHeroStatements(),
    getCategories(),
    getBestSellers(),
    getBanners(),
    getSiteSettings(),
  ]);

  const searchUrl = `${SITE_URL}/san-pham`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${searchUrl}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: siteSettings?.logo_url ? { "@type": "ImageObject", url: siteSettings.logo_url } : undefined,
    },
  };

  return (
    <div className="relative min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-none focus:bg-white focus:px-4 focus:py-2"
      >
        Bỏ qua để đến nội dung chính
      </a>
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />
      <BannerSlider slides={banners} />
      <main id="main-content" className="w-full px-4 pb-12 md:px-8">
        <RevealSection delay={100}>
          <HeroCards statements={heroStatements} />
        </RevealSection>
        <RevealSection delay={250}>
          <CategoryGrid categories={categories} />
        </RevealSection>
        <RevealSection delay={350}>
          <ProductGrid
            header="Sản phẩm nổi bật"
            subtitle="Sản phẩm nổi bật"
            highlight="Sale!"
            products={bestSellers}
            viewMoreHref="/san-pham"
            viewMoreLabel="Xem thêm sản phẩm"
          />
        </RevealSection>
      </main>
      <FooterSection categories={categories} settings={siteSettings} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
