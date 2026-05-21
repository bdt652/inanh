import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "./components/ToastProvider";

function resolveMetadataBase(): URL {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://inanh24h.com";
  try {
    return new URL(rawSiteUrl);
  } catch {
    return new URL("https://inanh24h.com");
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "In ảnh 24h",
    template: "%s | In ảnh 24h",
  },
  description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
  keywords: [
    "in ảnh",
    "in ảnh nhanh",
    "in ảnh online",
    "in ảnh giá rẻ",
    "in ảnh lấy ngay",
    "in album",
    "in album ảnh cưới",
    "in ảnh cưới",
    "in ảnh khổ lớn",
    "in tranh treo tường",
    "in ảnh gỗ",
    "in ảnh canvas",
    "in ảnh PP",
    "in ảnh bạt",
    "in ảnh 24h",
    "địa chỉ in ảnh",
    "cửa hàng in ảnh",
    "in ảnh Hà Nội",
  ].join(", "),
  authors: [{ name: "In ảnh 24h" }],
  creator: "In ảnh 24h",
  publisher: "In ảnh 24h",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: resolveMetadataBase().toString(),
    languages: {
      "vi-VN": resolveMetadataBase().toString(),
      "en-US": `${resolveMetadataBase().toString()}/en`,
    },
  },
  verification: {
    google: "google286cec79b1ba2250",
    yandex: "yandex-verification-code",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    alternateLocale: "en_US",
    siteName: "In ảnh 24h",
    title: "In ảnh 24h - In nhanh, đúng màu",
    description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
    url: resolveMetadataBase().toString(),
    images: [
      {
        url: "/Inanh/logo_inanh24h.jpg",
        alt: "In ảnh 24h",
        width: 1200,
        height: 630,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "In ảnh 24h - In nhanh, đúng màu",
    description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
    images: ["/Inanh/logo_inanh24h.jpg"],
    creator: "@inanh24h",
    site: "@inanh24h",
  },
  facebook: {
    appId: "1234567890",
  },
  appleWebApp: {
    capable: true,
    title: "In Ảnh 24h",
    statusBarStyle: "default",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/Inanh/favicon_inanh24h.png",
    shortcut: "/Inanh/favicon_inanh24h.png",
    apple: "/Inanh/favicon_inanh24h.png",
  },
  other: {
    "theme-color": "#ffffff",
    "revisit-after": "7 days",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = resolveMetadataBase().toString().replace(/\/+$/, "");
  const analyticsJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "In ảnh 24h",
    url: siteUrl,
  };
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Dịch vụ in ảnh 24h",
    provider: {
      "@type": "Organization",
      name: "In ảnh 24h",
      url: siteUrl,
      logo: `${siteUrl}/Inanh/logo_inanh24h.jpg`,
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Hà Nội, Việt Nam",
    },
    url: siteUrl,
    serviceType: "In ảnh lấy ngay, in ảnh gỗ, album ảnh",
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${siteUrl}/lien-he`,
      availableLanguage: ["vi-VN"],
      name: "Đặt in trực tuyến",
    },
  };
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${siteUrl}/#organization`,
    name: "In ảnh 24h",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/Inanh/logo_inanh24h.jpg`,
      width: 200,
      height: 200,
    },
    image: `${siteUrl}/Inanh/logo_inanh24h.jpg`,
    email: "Inanhonline24h@gmail.com",
    telephone: "+84877226644",
    priceRange: "₫₫",
    currenciesAccepted: "VND",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "08:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "09:00",
        closes: "18:00",
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "85 Phố Gạch, TT Phúc Thọ",
      addressLocality: "Phúc Thọ",
      addressRegion: "Hà Nội",
      postalCode: "100000",
      addressCountry: "VN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "21.0285",
      longitude: "105.8542",
    },
    hasMap: "https://maps.google.com/?q=85+Phố+Gạch+Phúc+Thọ+Hà+Nội",
    sameAs: [
      "https://www.facebook.com/inanh24h",
      "https://zalo.me/0877226644",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+84877226644",
        contactType: "customer service",
        areaServed: "VN",
        availableLanguage: "Vietnamese",
      },
    ],
  };

  return (
    <html lang="vi">
      <head>
        <Script strategy="lazyOnload" src="https://www.googletagmanager.com/gtag/js?id=G-7QR8VEN14X" />
        <Script id="google-analytics" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-7QR8VEN14X');`}
        </Script>
      </head>
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(analyticsJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      </body>
    </html>
  );
}
