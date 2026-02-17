import Link from "next/link";

import { toHtmlPath } from "../lib/paths";

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
};

type ProductGridProps = {
  header: string;
  subtitle: string;
  highlight: string;
  products: Product[];
  viewMoreHref?: string;
  viewMoreLabel?: string;
};

const HIDDEN_DESCRIPTION_SNIPPETS = [
  "Ảnh in 13x18cm phù hợp với mọi loại ảnh, ảnh cưới, ảnh gia đình, ảnh trẻ em, ảnh kỷ yếu…Đảm bảo chất lượng ảnh với độ sắc nét cao.",
  "Ảnh in 13x18cm phù hợp với mọi loại ảnh, ảnh cưới, ảnh gia đình, ảnh trẻ em, ảnh kỷ yếu...Đảm bảo chất lượng ảnh với độ sắc nét cao.",
];

function sanitizeDescription(value: string): string {
  let next = value.trim();
  HIDDEN_DESCRIPTION_SNIPPETS.forEach((snippet) => {
    next = next.replace(snippet, "").trim();
  });
  return next;
}

function resolveProductDetailHref(product: Product): string | null {
  const rawSlug = (product.slug ?? product.id ?? "").trim();
  if (!rawSlug) {
    return null;
  }
  return toHtmlPath(`/san-pham/${encodeURIComponent(rawSlug)}`);
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
          {products.map((item, index) => {
            const normalizedDescription = sanitizeDescription(item.description);
            const detailHref = resolveProductDetailHref(item);
            return (
              <article
                key={`${item.slug ?? item.id ?? item.title}-${index}`}
                className="panel reveal-up rounded-none p-5"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="photo-frame mb-4 h-44 p-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="h-full w-full rounded-none object-cover" loading="lazy" />
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

                <p className="mt-2 text-sm text-[var(--text-soft)]">{item.short}</p>
                <h3 className="mt-2 text-lg font-semibold leading-7">{item.title}</h3>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  {item.old_price && <span className="text-sm text-[var(--text-soft)] line-through">{item.old_price}</span>}
                  <span className="font-display text-3xl font-semibold text-[var(--accent-strong)]">{item.current_price}</span>
                </div>

                {normalizedDescription && <p className="mt-3 text-xs leading-6 text-[var(--text-soft)]">{normalizedDescription}</p>}

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
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel rounded-none p-6 text-sm text-[var(--text-soft)]">
          Chưa có sản phẩm phù hợp cho mục này.
        </div>
      )}

      {viewMoreHref && (
        <div className="flex justify-center pt-2">
          <Link
            href={viewMoreHref}
            className="ghost-button rounded-none px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em]"
          >
            {viewMoreLabel}
          </Link>
        </div>
      )}
    </section>
  );
}
