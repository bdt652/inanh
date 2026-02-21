import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản trị | In ảnh 24h",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
