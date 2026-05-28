"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import type { Category, SiteSetting } from "../lib/content";
import { normalizeImageUrl, shouldSkipImageOptimization } from "../lib/image";
import { toHtmlPath } from "../lib/paths";

type FooterSectionProps = {
  categories: Category[];
  settings: SiteSetting | null;
};

export default function FooterSection({ categories, settings }: FooterSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const logoSrc = settings?.logo_url ? normalizeImageUrl(settings.logo_url) : "/Inanh/logo_inanh24h.jpg";
  const copyrightText = settings?.footer?.trim() || "© 2026 In ảnh 24h. All rights reserved.";

  return (
    <motion.footer
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="panel-plain rounded-none border-t border-[var(--line)] px-4 py-10 md:px-8"
    >
      <div className="grid w-full gap-7 md:grid-cols-[1.2fr_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-3"
        >
          <Link href="/" aria-label="Về trang chủ" className="block md:max-w-[180px]">
            <Image
              src={logoSrc}
              alt="Logo Inanh24h"
              width={180}
              height={60}
              className="h-auto w-full object-contain"
              unoptimized={shouldSkipImageOptimization(logoSrc)}
            />
          </Link>
          {settings?.address && <p className="text-sm leading-7 text-[var(--text-soft)]">Địa chỉ: {settings.address}</p>}
          {settings?.hotline_zalo && <p className="text-sm text-[var(--text-soft)]">Hotline/Zalo: {settings.hotline_zalo}</p>}
          {settings?.email && <p className="text-sm text-[var(--text-soft)]">Email: {settings.email}</p>}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-5"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">Danh mục sản phẩm</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((item, idx) => (
                <motion.div
                  key={`${item.slug}-footer`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.3, delay: 0.3 + idx * 0.06 }}
                  whileHover={{ scale: 1.08, transition: { type: "spring", stiffness: 400 } }}
                >
                  <Link
                    href={toHtmlPath(item.slug)}
                    className="rounded-none border border-[var(--line)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold hover:border-[var(--accent)] block"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">Chính sách</p>
            <div className="mt-3 flex flex-col gap-1">
              {[
                { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
                { href: "/chinh-sach-giao-hang", label: "Chính sách giao hàng" },
                { href: "/chinh-sach-thanh-toan", label: "Chính sách thanh toán" },
                { href: "/chinh-sach-doi-tra", label: "Chính sách đổi trả" },
                { href: "/lien-he", label: "Liên hệ & Hỗ trợ" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-[var(--text-soft)] hover:text-[var(--accent)] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <div className="mt-8 border-t border-[var(--line)] px-6 pt-4 space-y-2">
        <p className="text-center text-xs text-[var(--text-soft)]">{copyrightText}</p>
        {/* Thông tin pháp lý — tạm ẩn
        <p className="text-center text-[10px] leading-5 text-[var(--text-soft)] opacity-60">
          Đơn vị vận hành: <span className="font-medium">Hộ Kinh Doanh Nguyễn Thị Thanh Mừng</span>
          {" "}·{" "}MST: 8568913418-001
          {" "}·{" "}Số ĐKKD: 01R8017431, cấp ngày 27/02/2025 tại UBND Huyện Phúc Thọ
        </p>
        <p className="text-center text-[10px] leading-5 text-[var(--text-soft)] opacity-60">
          Địa chỉ: Số 50, Xóm Sen, Thôn Bắc Võng Ngoại, Xã Võng Xuyên, Huyện Phúc Thọ, TP. Hà Nội
        </p>
        */}
        {/* TODO: Sau khi đăng ký Bộ Công Thương được duyệt, thêm logo BCT vào đây:
            <a href="https://online.gov.vn/..." target="_blank" rel="noopener noreferrer">
              <Image src="/bct-logo.png" alt="Đã thông báo Bộ Công Thương" width={110} height={40} />
            </a>
        */}
      </div>
    </motion.footer>
  );
}
