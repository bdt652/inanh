import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Không tìm thấy trang",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-soft)]">404</p>
      <h1 className="font-display mt-3 text-4xl font-semibold">Không tìm thấy trang</h1>
      <p className="mt-4 text-sm text-[var(--text-soft)]">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-none border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:bg-white"
        >
          Về trang chủ
        </Link>
        <Link
          href="/san-pham"
          className="rounded-none border border-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
        >
          Xem sản phẩm
        </Link>
      </div>
    </div>
  );
}
