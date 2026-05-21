"use client";

import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/orders", label: "Đơn hàng" },
  { href: "/admin/drafts", label: "Lưu nháp" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/hero", label: "Hero" },
  { href: "/admin/banners", label: "Banner" },
  { href: "/admin/settings", label: "Cài đặt" },
];

type AdminSectionHeaderProps = {
  title: string;
  subtitle: string;
  onLogout: () => void;
};

export default function AdminSectionHeader({ title, subtitle, onLogout }: AdminSectionHeaderProps) {
  return (
    <header className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
          <p className="text-sm text-stone-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
        >
          Đăng xuất
        </button>
      </div>
      <nav className="flex flex-wrap gap-2">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
