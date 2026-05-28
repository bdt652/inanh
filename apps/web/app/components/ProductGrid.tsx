"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { normalizeImageUrl, shouldSkipImageOptimization } from "../lib/image";

type Product = {
  id?: string;
  slug?: string;
  category_slug?: string;
  title: string;
  short: string;
  old_price: string;
  current_price: string;
  description: string;
  image_url?: string;
  highlight?: string;
  tags?: string[];
  allow_online_order?: boolean;
  min_images?: number | null;
  max_images?: number | null;
};

type ProductGridProps = {
  header: string;
  subtitle: string;
  highlight: string;
  products: Product[];
  viewMoreHref?: string;
  viewMoreLabel?: string;
};

import { toHtmlPath } from "../lib/paths";

function resolveProductDetailHref(product: Product): string | null {
  const rawSlug = (product.slug ?? product.id ?? "").trim();
  if (!rawSlug) return null;
  return toHtmlPath(`/san-pham/${encodeURIComponent(rawSlug)}`);
}

function ProductCard({
  item,
  index,
}: {
  item: Product;
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const descriptionText = (item.short || item.description || "").trim();
  const detailHref = resolveProductDetailHref(item);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{
        y: -10,
        scale: 1.03,
        boxShadow: "0 22px 48px rgba(37,27,18,0.2)",
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
      whileTap={{ scale: 0.98 }}
      className="panel rounded-none p-5 cursor-pointer"
    >
      <div className="photo-frame mb-4 h-44 p-3">
        {item.image_url ? (
          <Image
            src={normalizeImageUrl(item.image_url)}
            alt={item.title}
            width={640}
            height={420}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="h-full w-full rounded-none object-cover"
            unoptimized={item.image_url ? shouldSkipImageOptimization(item.image_url) : false}
          />
        ) : (
          <>
            <div className="h-full rounded-none bg-gradient-to-br from-[#f5d8b2] via-[#e9bd8e] to-[#d99f69]" />
            <p className="absolute bottom-5 left-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#59371d]">
              Ảnh in
            </p>
          </>
        )}
      </div>

      {item.highlight && (
        <span className="inline-flex items-center justify-center rounded-none border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
          {item.highlight}
        </span>
      )}
      {item.allow_online_order === false && (
        <span className="mt-2 inline-flex items-center justify-center rounded-none border border-amber-200 bg-amber-50 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-amber-800">
          Chỉ Zalo
        </span>
      )}

      <h3 className="mt-2 text-lg font-semibold leading-7">{item.title}</h3>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {item.old_price && <span className="text-sm text-[var(--text-soft)] line-through">{item.old_price}</span>}
        <span className="font-display text-3xl font-semibold text-[var(--accent-strong)]">{item.current_price}</span>
      </div>

      {descriptionText && <p className="mt-3 text-sm text-[var(--text-soft)]">{descriptionText}</p>}

      {item.tags && item.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem]">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-none border border-[var(--line)] px-2 py-1 uppercase tracking-[0.18em] text-[var(--text-soft)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {detailHref ? (
        <Link href={detailHref} className="ghost-button mt-5 block w-full rounded-none px-4 py-3 text-center text-sm font-semibold">
          Chi tiết
        </Link>
      ) : (
        <button type="button" className="ghost-button mt-5 w-full rounded-none px-4 py-3 text-sm font-semibold opacity-60" disabled>
          Chi tiết
        </button>
      )}
    </motion.article>
  );
}

export default function ProductGrid({
  header,
  subtitle,
  highlight,
  products,
  viewMoreHref,
  viewMoreLabel = "Xem thêm",
}: ProductGridProps) {
  const hasProducts = products.length > 0;

  return (
    <section id="san-pham" className="space-y-6 pb-[4.5rem] pt-12">
      <div className="reveal-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">{subtitle}</p>
          <h2 className="">{header}</h2>
        </div>
        <span className="rounded-none bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
          {highlight}
        </span>
      </div>

      {hasProducts ? (
        <div className="grid gap-5 md:grid-cols-3">
          {products.map((item, index) => (
            <ProductCard
              key={`${item.slug ?? item.id ?? item.title}-${index}`}
              item={item}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="panel rounded-none p-6 text-sm text-[var(--text-soft)]">
          Chưa có sản phẩm phù hợp cho mục này.
        </div>
      )}

      {viewMoreHref && (
        <motion.div
          className="flex justify-center pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link
            href={viewMoreHref}
            className="ghost-button rounded-none px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em]"
          >
            {viewMoreLabel}
          </Link>
        </motion.div>
      )}
    </section>
  );
}
