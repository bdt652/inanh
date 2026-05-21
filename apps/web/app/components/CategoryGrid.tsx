import Image from "next/image";
import Link from "next/link";

import type { Category } from "../lib/content";
import { normalizeImageUrl, shouldSkipImageOptimization } from "../lib/image";
import { toHtmlPath } from "../lib/paths";

type CategoryGridProps = {
  categories: Category[];
};

function toCategoryPath(slug: string): string {
  const trimmed = slug.trim();
  if (!trimmed) return "/";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return toHtmlPath(withLeadingSlash.replace(/\/+$/, "") || "/");
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="panel-plain reveal-up rounded-none p-5 md:p-7">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">DANH MỤC SẢN PHẨM</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((item, idx) => (
          <Link
            key={item.slug}
            href={toCategoryPath(item.slug)}
            aria-label={`Xem danh mục ${item.label}`}
            className="photo-frame reveal-up group relative isolate flex min-h-40 items-center justify-center px-4 text-center"
            style={{ animationDelay: `${Math.min(idx * 90, 420)}ms` }}
          >
            {item.img ? (
              <Image
                src={normalizeImageUrl(item.img)}
                alt={item.label}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                unoptimized={shouldSkipImageOptimization(item.img)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#f8dfbf] to-[#ddb58b]" />
            )}
            <div className="absolute inset-0 bg-black/28 transition-colors duration-500 group-hover:bg-black/42" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.25),transparent_64%)] opacity-80" />
            <p className="font-display relative z-10 text-[1.5rem] font-semibold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] md:text-[1.75rem]">
              {item.label}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
