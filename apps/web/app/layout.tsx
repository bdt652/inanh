import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import LayoutTransition from "./components/motion/LayoutTransition";
import { ToastProvider } from "./components/ToastProvider";
import { buildLocalBusinessJsonLd, SITE_NAME, SITE_URL } from "./lib/seo";
import { getSiteSettings } from "./lib/api";

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
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
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
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
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
  verification: {
    google: "google286cec79b1ba2250",
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
    title: `${SITE_NAME} - In nhanh, đúng màu`,
    description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
    url: SITE_URL,
    images: [
      {
        url: "/Inanh/logo_inanh24h.jpg",
        alt: SITE_NAME,
        width: 1200,
        height: 630,
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - In nhanh, đúng màu`,
    description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
    images: ["/Inanh/logo_inanh24h.jpg"],
    creator: "@inanh24h",
    site: "@inanh24h",
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
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

function extractInlineScript(html: string): string {
  const match = /<script[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  return match ? match[1].trim() : html.trim();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings().catch(() => null);
  const googleHeader = settings?.google_header?.trim() ?? "";
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Dịch vụ in ảnh 24h`,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/Inanh/logo_inanh24h.jpg`,
    },
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Hà Nội, Việt Nam",
    },
    url: SITE_URL,
    serviceType: "In ảnh lấy ngay, in ảnh gỗ, album ảnh",
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${SITE_URL}/lien-he`,
      availableLanguage: ["vi-VN"],
      name: "Đặt in trực tuyến",
    },
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
        {googleHeader && (
          <Script
            id="custom-google-header"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: extractInlineScript(googleHeader) }}
          />
        )}
        <ToastProvider>
          <LayoutTransition>{children}</LayoutTransition>
        </ToastProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildLocalBusinessJsonLd()) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      </body>
    </html>
  );
}
