"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { id: "cart", label: "Giỏ hàng", path: "/quan-ly-don-hang/cart" },
  { id: "orders", label: "Đơn hàng", path: "/quan-ly-don-hang/orders" },
  { id: "profile", label: "Thông tin cá nhân", path: "/quan-ly-don-hang/profile" },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--text-soft,#4a4034)]">Quản lý</p>
        <span className="text-[0.6rem] uppercase tracking-[0.4em] text-[var(--text-soft,#4a4034)]">24h</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 md:flex-col md:gap-0">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.path);
          return (
            <Link
              key={item.id}
              href={item.path}
              className={`flex min-w-[120px] items-center justify-center rounded-full px-4 py-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] transition md:w-full ${
                isActive
                  ? "bg-[var(--accent,#b46a2f)]/20 text-[var(--text-main,#1f1b16)] shadow-inner"
                  : "text-[var(--text-soft,#4a4034)] hover:bg-[var(--accent,#b46a2f)]/[0.08]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
