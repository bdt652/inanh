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
  description: "In ảnh online 24h, bảng giá và danh mục sản phẩm in ấn nhanh.",
  robots: {
    index: true,
    follow: true,
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
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
