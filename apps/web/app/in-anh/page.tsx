import type { Metadata } from "next";
import Link from "next/link";

import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import ProductGrid from "../components/ProductGrid";
import ScrollProgress from "../components/ScrollProgress";
import { getBestSellers, getCategories, getMenuItems, getSiteSettings } from "../lib/api";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "In ảnh lấy ngay 24h | Chuẩn màu, giao đúng hẹn",
  description: "Dịch vụ in ảnh 24h: nhận file online, in nhanh chuẩn màu, giao đúng hẹn. Báo giá minh bạch, hỗ trợ thiết kế cơ bản.",
  alternates: { canonical: "/in-anh" },
  openGraph: {
    type: "article",
    locale: "vi_VN",
    title: "In ảnh lấy ngay 24h | Chuẩn màu, giao đúng hẹn",
    description: "Nhận file online, in nhanh 24h, chuẩn màu thương hiệu, giá minh bạch.",
    url: `${SITE_URL}/in-anh`,
  },
  twitter: {
    card: "summary_large_image",
    title: "In ảnh lấy ngay 24h | Chuẩn màu, giao đúng hẹn",
    description: "Nhận file online, in nhanh 24h, chuẩn màu thương hiệu, giá minh bạch.",
  },
};

const FAQS = [
  {
    q: "Tôi gửi file như thế nào?",
    a: "Bạn gửi file qua Zalo/Email hoặc tải lên trong trang Liên hệ. Nhận file đến đâu xử lý đến đó, xác nhận màu rồi in.",
  },
  {
    q: "Thời gian in và giao hàng bao lâu?",
    a: "Đơn nội thành thường hoàn tất trong 24h. Đơn gấp có thể in ngay trong ngày, báo trước với đội ngũ để sắp lịch.",
  },
  {
    q: "Có kiểm màu trước khi in không?",
    a: "Có. Chúng tôi so khớp màu với file gốc và mẫu nhận diện, gửi bạn duyệt nhanh trước khi chạy lệnh in.",
  },
  {
    q: "Báo giá tính thế nào?",
    a: "Giá dựa trên khổ in, vật liệu, số lượng và ép Plastic/Lụa nếu cần. Bảng giá tóm tắt nằm bên dưới, báo giá chi tiết khi bạn gửi file.",
  },
  {
    q: "Có hỗ trợ chỉnh file không?",
    a: "Có. Chỉnh sửa cơ bản (cắt, crop, căn lề, cân bằng sáng) được hỗ trợ miễn phí để file đạt chuẩn in.",
  },
];

export default async function InAnhPage() {
  const [menuItems, categories, bestSellers, siteSettings] = await Promise.all([
    getMenuItems(),
    getCategories(),
    getBestSellers(6),
    getSiteSettings(),
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="relative min-h-screen">
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />

      <main className="w-full pb-14">
        <section className="panel-plain relative isolate overflow-hidden rounded-none px-4 pb-10 pt-10 md:px-10 md:pt-14">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-emerald-50 opacity-70" />
          <div className="relative max-w-4xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-soft)]">Theo danh mục</p>
            <h1 className="font-display text-4xl font-semibold md:text-5xl">In ảnh lấy ngay 24h</h1>
            <p className="text-base leading-7 text-[var(--text-soft)] md:text-lg">
              Nhận file online, kiểm màu trước khi in, giao đúng hẹn. Hỗ trợ thiết kế cơ bản, báo giá minh bạch, phù hợp in cưới, in kỷ niệm,
              in ảnh thương hiệu.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="tel:0877226644" className="ghost-button rounded-none px-5 py-3 text-sm font-semibold">
                Gọi ngay 0877.22.66.44
              </a>
              <Link
                href="/san-pham"
                className="rounded-none border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--text-soft)] hover:bg-white"
              >
                Xem bảng giá & sản phẩm
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 pt-8 md:px-10">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: "In nhanh 24h", desc: "Nhận file đến đâu xử lý đến đó, sắp lịch in gấp khi bạn cần." },
              { title: "Chuẩn màu thương hiệu", desc: "Kiểm màu, so khớp với file gốc hoặc palette bạn cung cấp." },
              { title: "Giá minh bạch", desc: "Báo giá rõ theo khổ, vật liệu, số lượng; không phát sinh ẩn." },
            ].map((item) => (
              <article key={item.title} className="panel rounded-none p-5">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-soft)]">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="px-4 pb-6 md:px-10">
          <ProductGrid
            header="Gợi ý in nhanh"
            subtitle="Sản phẩm"
            highlight={`Tổng: ${bestSellers.length}`}
            products={bestSellers}
            viewMoreHref="/san-pham"
            viewMoreLabel="Xem thêm sản phẩm"
          />
        </section>

        <section className="px-4 pb-12 md:px-10">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Câu hỏi thường gặp</h2>
          <div className="mt-4 divide-y divide-[var(--line)] border border-[var(--line)]">
            {FAQS.map((item, idx) => (
              <details key={item.q} className="group p-4" open={idx === 0}>
                <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[var(--text-main)]">
                  {item.q}
                  <span className="text-xs text-[var(--text-soft)] group-open:hidden">+</span>
                  <span className="text-xs text-[var(--text-soft)] hidden group-open:inline">−</span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
