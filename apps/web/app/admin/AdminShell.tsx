"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Tổng quan" },
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

type AdminShellProps = {
  title: string;
  subtitle: string;
  onLogout: () => void;
  children: ReactNode;
  actions?: ReactNode;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ title, subtitle, onLogout, children, actions }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="mx-auto flex w-full max-w-[1440px] gap-4 p-4 md:gap-6 md:p-6">
        <aside className="hidden w-64 shrink-0 flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:flex">
          <div className="border-b border-stone-200 pb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Inanh24h</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">Admin Panel</p>
          </div>
          <nav className="mt-4 grid gap-2">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-emerald-100 text-emerald-800"
                      : "border border-stone-200 bg-white text-stone-700 hover:border-emerald-300"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm md:hidden">
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {NAV_ITEMS.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={`mobile-${item.href}`}
                    href={item.href}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${
                      active ? "bg-emerald-100 text-emerald-800" : "border border-stone-200 text-stone-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <header className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
                <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {actions}
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
