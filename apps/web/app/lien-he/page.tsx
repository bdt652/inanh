import type { Metadata } from "next";
import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import { PageTransition, ScrollReveal } from "../components/motion";
import ScrollProgress from "../components/ScrollProgress";
import { getCategories, getMenuItems, getSiteSettings } from "../lib/api";
import { ContactForm } from "./contact-form";
import { buildBreadcrumbJsonLd, SITE_URL, ZALO_OA_URL } from "../lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Liên hệ | In ảnh 24h",
  description: "Liên hệ In ảnh 24h - Địa chỉ in ảnh uy tín tại Hà Nội. Gọi ngay 0877.22.66.44 hoặc 0868.321.320 để được tư vấn miễn phí.",
  keywords: "liên hệ in ảnh, địa chỉ in ảnh, hotline in ảnh, in ảnh liên hệ, in ảnh 24h liên hệ",
  alternates: {
    canonical: `${SITE_URL}/lien-he`,
  },
  openGraph: {
    title: "Liên hệ - In ảnh 24h",
    description: "Liên hệ In ảnh 24h - Địa chỉ in ảnh uy tín tại Hà Nội. Gọi ngay 0877.22.66.44 để được tư vấn miễn phí.",
    url: `${SITE_URL}/lien-he`,
    type: "website",
    locale: "vi_VN",
    siteName: "In ảnh 24h",
  },
  twitter: {
    card: "summary",
    title: "Liên hệ - In ảnh 24h",
    description: "Liên hệ In ảnh 24h - Gọi ngay 0877.22.66.44 để được tư vấn miễn phí.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function LienHePage() {
  const [menuItems, categories, siteSettings] = await Promise.all([
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
  ]);

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Liên hệ In ảnh 24h",
    description: "Liên hệ đặt in ảnh - Dịch vụ in ảnh nhanh chóng, chất lượng cao",
    url: `${SITE_URL}/lien-he`,
    image: `${SITE_URL}/Inanh/logo_inanh24h.jpg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Số 50, Xóm Sen, Thôn Bắc Võng Ngoại, Xã Võng Xuyên",
      addressLocality: "Phúc Thọ",
      addressRegion: "Hà Nội",
      postalCode: "100000",
      addressCountry: "VN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+84877226644",
        contactType: "customer service",
        availableLanguage: "Vietnamese",
        areaServed: "VN",
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "08:00",
          closes: "20:00",
        },
      },
      {
        "@type": "ContactPoint",
        telephone: "+84868321320",
        contactType: "customer service",
        availableLanguage: "Vietnamese",
        areaServed: "VN",
      },
    ],
    openingHours: "Mo-Fr 08:00-20:00, Sa 08:00-20:00, Su 09:00-18:00",
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Liên hệ", url: `${SITE_URL}/lien-he` },
  ]);

  return (
    <div className="relative min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />
      <main className="w-full pb-12 pt-8 px-4 md:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }}
        />
        <ScrollReveal variant="bounceIn">
        <h1 className="text-3xl font-bold mb-8 text-center">Liên hệ</h1>
        </ScrollReveal>
        <PageTransition>
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div>
            <ScrollReveal variant="fadeLeft" delay={0.1}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Thông tin liên hệ</h2>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-600">Địa chỉ:</p>
                  <p>Số 50, Xóm Sen, Thôn Bắc Võng Ngoại, Xã Võng Xuyên, Huyện Phúc Thọ, TP. Hà Nội</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Điện thoại:</p>
                  <p>
                    <a href="tel:0877226644" className="text-blue-600 hover:underline">0877.22.66.44</a>
                    {" "}-{" "}
                    <a href="tel:0868321320" className="text-blue-600 hover:underline">0868.321.320</a>
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Zalo OA:</p>
                  <p>
                    <a href={ZALO_OA_URL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Nhắn tin qua Zalo OA</a>
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Email:</p>
                  <p>
                    <a href="mailto:Inanhonline24h@gmail.com" className="text-blue-600 hover:underline">Inanhonline24h@gmail.com</a>
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Giờ mở cửa:</p>
                  <p>Thứ 2 - Thứ 7: 08:00 - 20:00</p>
                  <p>Chủ nhật: 09:00 - 18:00</p>
                </div>
              </div>
            </div>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.2}>
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Bản đồ</h2>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.657509379298!2d105.65345667507352!3d21.02851148061022!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345c3a5a3d3a3d%3A0x3a3a3a3a3a3a3a3a!2zODUgUGj5IEdhY2gsIFR0IFBo4bq_U29cdCwgSMOgIE7hu5lpLCBIw6AgTuG7mWksIFZpZXRuYW0!5e0!3m2!1sen!2s!4v1700000000000"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Bản đồ In ảnh 24h"
              />
            </div>
            </ScrollReveal>
          </div>

          <div>
            <ScrollReveal variant="fadeRight" delay={0.15}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Gửi tin nhắn</h2>
              <ContactForm />
            </div>
            </ScrollReveal>
          </div>
        </div>
        </PageTransition>
      </main>
      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
