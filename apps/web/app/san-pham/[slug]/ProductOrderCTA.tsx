"use client";

import Link from "next/link";
import { useMemo } from "react";

import { useCustomerToken } from "../../lib/use-customer-token";

type ProductOrderCTAProps = {
  slug: string;
};

export default function ProductOrderCTA({ slug }: ProductOrderCTAProps) {
  const { token, ready } = useCustomerToken();
  const loginHref = useMemo(() => `/dang-nhap?return=${encodeURIComponent(`/san-pham/${slug}`)}`, [slug]);
  const cartHref = useMemo(
    () => `/quan-ly-don-hang/cart?product=${encodeURIComponent(slug)}`,
    [slug]
  );

  if (!ready) {
    return (
      <span className="rounded-none border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text-soft)]">
        Đang kiểm tra...
      </span>
    );
  }

  if (token) {
    return (
      <Link
        href={cartHref}
        className="rounded-none bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-sm hover:brightness-110"
      >
        Đặt hàng ngay
      </Link>
    );
  }

  return (
    <Link
      href={loginHref}
      className="rounded-none bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-sm hover:brightness-110"
    >
      Đăng nhập để đặt hàng
    </Link>
  );
}
