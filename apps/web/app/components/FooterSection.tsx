import Link from "next/link";

import Image from "next/image";
import type { Category, SiteSetting } from "../lib/content";
import { normalizeImageUrl, shouldSkipImageOptimization } from "../lib/image";
import { toHtmlPath } from "../lib/paths";

type FooterSectionProps = {
  categories: Category[];
  settings: SiteSetting | null;
};

export default function FooterSection({ categories, settings }: FooterSectionProps) {
  const logoSrc = settings?.logo_url ? normalizeImageUrl(settings.logo_url) : "/Inanh/logo_inanh24h.jpg";
  const copyrightText = "© 2026 In ảnh 24h. All rights reserved.";

  return (
    <footer className="panel-plain reveal-up rounded-none border-t border-[var(--line)] px-4 py-10 md:px-8">
      <div className="grid w-full gap-7 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
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
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">Danh mục sản phẩm</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((item) => (
              <Link
                key={`${item.slug}-footer`}
                href={toHtmlPath(item.slug)}
                className="rounded-none border border-[var(--line)] bg-[var(--surface-card)] px-3 py-1 text-xs font-semibold hover:border-[var(--accent)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-8 border-t border-[var(--line)] px-6 pt-4 text-center text-xs text-[var(--text-soft)]">
        {copyrightText}
      </p>
    </footer>
  );
}
