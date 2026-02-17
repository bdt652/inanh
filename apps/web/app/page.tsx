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

export default async function Home() {
  const [menuItems, heroStatements, categories, bestSellers, banners, siteSettings] = await Promise.all([
    getMenuItems(),
    getHeroStatements(),
    getCategories(),
    getBestSellers(),
    getBanners(),
    getSiteSettings(),
  ]);

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
    </div>
  );
}
