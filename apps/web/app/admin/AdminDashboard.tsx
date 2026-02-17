"use client";

import Link from "next/link";
import { useMemo } from "react";

const sections = [
  {
    group: "Trang động",
    title: "Trang động & nội dung",
    description: "Soạn thảo nội dung để xuất thành các trang `.html` độc lập. Dùng trình soạn thảo Word-like hoặc trang editor full-width.",
    actions: [
      { label: "Danh sách trang", href: "/admin/pages" },
      { label: "Thêm trang mới", href: "/admin/pages/new" },
    ],
  },
  {
    group: "Tùy chỉnh giao diện",
    title: "Menu, danh mục, banner",
    description: "Quản lý thanh điều hướng, danh mục sản phẩm, banner và các phần hiển thị trên home.",
    actions: [{ label: "Điều khiển (tạm)", href: "/admin" }],
  },
  {
    group: "Sản phẩm",
    title: "Sản phẩm & ưu đãi",
    description: "Tạo/sửa sản phẩm, giá sale, ưu điểm nổi bật, sản phẩm nổi bật hiển thị ở trang chủ.",
    actions: [{ label: "Danh sách sản phẩm", href: "/admin" }],
  },
  {
    group: "Cấu hình",
    title: "Thông tin chung & cài đặt",
    description: "Cập nhật logo, hotline, email, hotline, và các block footer/khoảng trắng.",
    actions: [{ label: "Trang cài đặt", href: "/admin" }],
  },
];

export default function AdminDashboard() {
  const cards = useMemo(() => sections, []);

  return (
    <div className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-[32px] border border-stone-200 bg-white p-8 shadow-[0_40px_60px_rgba(15,23,42,0.15)]">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Quản trị In ảnh 24h</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-900">Bảng điều khiển</h1>
          <p className="mt-3 text-sm text-stone-500">
            Chọn khu vực cần thao tác. Tất cả các phần đều hướng tới giao diện full-width: trang động, menu/danh mục,
            sản phẩm, banner và cài đặt chung.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((section) => (
            <article
              key={section.title}
              className="group rounded-[28px] border border-stone-200 bg-white p-6 shadow transition hover:border-emerald-300"
            >
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">{section.group}</p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{section.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {section.actions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
