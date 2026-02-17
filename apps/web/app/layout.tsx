import type { Metadata } from "next";
import "./globals.css";

function resolveMetadataBase(): URL {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  try {
    return new URL(rawSiteUrl);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "In ảnh 24h",
    template: "%s | In ảnh 24h",
  },
  description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "In ảnh 24h",
    title: "In ảnh 24h - In nhanh, đúng màu",
    description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
    url: resolveMetadataBase().toString(),
    images: [
      {
        url: "/Inanh/logo_inanh24h.jpg",
        alt: "In ảnh 24h",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "In ảnh 24h - In nhanh, đúng màu",
    description: "In ảnh online 24h, in nhanh đúng màu, bảng giá minh bạch và danh mục sản phẩm đa dạng.",
    images: ["/Inanh/logo_inanh24h.jpg"],
  },
  icons: {
    icon: "/Inanh/favicon_inanh24h.png",
    shortcut: "/Inanh/favicon_inanh24h.png",
    apple: "/Inanh/favicon_inanh24h.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = resolveMetadataBase().toString().replace(/\/+$/, "");
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "In ảnh 24h",
    url: siteUrl,
    logo: `${siteUrl}/Inanh/logo_inanh24h.jpg`,
    email: "Inanhonline24h@gmail.com",
    telephone: "0877.22.66.44",
    address: {
      "@type": "PostalAddress",
      streetAddress: "85 Phố Gạch, TT Phúc Thọ",
      addressLocality: "Phúc Thọ",
      addressRegion: "Hà Nội",
      addressCountry: "VN",
    },
    sameAs: [],
  };

  return (
    <html lang="vi">
      <body className="antialiased">
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </body>
    </html>
  );
}
