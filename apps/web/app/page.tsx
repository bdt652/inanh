import type { Metadata } from "next";
export const dynamic = "force-dynamic";

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
import { normalizeImageUrl } from "./lib/image";
import { toHtmlPath } from "./lib/paths";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://inanh24h.com").replace(/\/+$/, "");
const SITE_NAME = "In ảnh 24h";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.warn("Fallback data used due to fetch error:", error);
    return fallback;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await safe(getSiteSettings, null);
  const title = settings?.site_title || "In ảnh 24h - In nhanh, đúng màu";
  const description =
    settings?.site_description ||
    "In ảnh online 24h, in nhanh chuẩn màu, báo giá minh bạch, hỗ trợ giao đúng hẹn.";
  const logoUrl = normalizeImageUrl(settings?.logo_url ?? "/Inanh/logo_inanh24h.jpg");
  const ogImage = logoUrl ? [{ url: logoUrl, alt: title }] : [];

  return {
    title,
    description,
    keywords: "in ảnh, in ảnh nhanh, in ảnh online, in ảnh giá rẻ, in ảnh lấy ngay, in album, in ảnh cưới, in ảnh khổ lớn, in tranh treo tường, in ảnh gỗ, in ảnh Hà Nội",
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
    safe(getMenuItems, []),
    safe(getHeroStatements, []),
    safe(getCategories, []),
    safe(getBestSellers, []),
    safe(getBanners, []),
    safe(getSiteSettings, null),
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
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_URL,
      },
    ],
  };
  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Quy trình đặt in ảnh tại In ảnh 24h",
    description: "Gửi file, duyệt màu nhanh và in giao trong 24h.",
    step: [
      {
        "@type": "HowToStep",
        name: "Gửi file",
        text: "Bạn gửi file qua Zalo/Email hoặc form Liên hệ, nêu khổ in và vật liệu.",
      },
      {
        "@type": "HowToStep",
        name: "Duyệt màu",
        text: "Kỹ thuật so khớp màu với file gốc/palette, gửi bạn duyệt nhanh.",
      },
      {
        "@type": "HowToStep",
        name: "In và giao 24h",
        text: "In theo lịch đã xác nhận, đóng gói và giao tận nơi đúng hẹn.",
      },
    ],
    supply: [
      { "@type": "HowToSupply", name: "File ảnh gốc" },
      { "@type": "HowToSupply", name: "Yêu cầu khổ in/vật liệu" },
    ],
    tool: [{ "@type": "HowToTool", name: "Máy in ảnh chuyên dụng" }],
  };

  const qaJsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: "In ảnh ở đâu chất lượng và giá rẻ?",
      answer: {
        "@type": "Answer",
        text: "In ảnh 24h là địa chỉ in ảnh uy tín tại Hà Nội với hơn 10 năm kinh nghiệm. Chúng tôi cung cấp dịch vụ in ảnh chất lượng cao, giá cạnh tranh với nhiều kích thước và chất liệu đa dạng. Đặc biệt, in nhanh trong ngày, giao hàng tận nơi.",
      },
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
            header=""
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(qaJsonLd) }} />
    </div>
  );
}

