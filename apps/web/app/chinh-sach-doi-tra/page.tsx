import type { Metadata } from "next";
import Link from "next/link";
import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import { PageTransition, ScrollReveal } from "../components/motion";
import ScrollProgress from "../components/ScrollProgress";
import { getCategories, getMenuItems, getSiteSettings } from "../lib/api";
import { buildBreadcrumbJsonLd, SITE_NAME, SITE_URL } from "../lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Chính sách đổi trả | In ảnh 24h",
  description:
    "Chính sách đổi trả sản phẩm của In ảnh 24h. Cam kết hoàn tiền hoặc in lại miễn phí nếu sản phẩm bị lỗi do cửa hàng.",
  keywords: "chính sách đổi trả, hoàn tiền in ảnh, đổi trả in ảnh 24h",
  alternates: { canonical: `${SITE_URL}/chinh-sach-doi-tra` },
  openGraph: {
    title: "Chính sách đổi trả - In ảnh 24h",
    description: "Chính sách đổi trả sản phẩm của In ảnh 24h. Cam kết in lại miễn phí hoặc hoàn tiền nếu lỗi từ cửa hàng.",
    url: `${SITE_URL}/chinh-sach-doi-tra`,
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
  },
  robots: { index: true, follow: true },
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function ChinhSachDoiTraPage() {
  const [menuItems, categories, siteSettings] = await Promise.all([
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Chính sách đổi trả", url: `${SITE_URL}/chinh-sach-doi-tra` },
  ]);

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chính sách đổi trả - In ảnh 24h",
    url: `${SITE_URL}/chinh-sach-doi-tra`,
    inLanguage: "vi-VN",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="relative min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />
      <main className="w-full pb-14 pt-8 px-4 md:px-8">
        <ScrollReveal variant="bounceIn">
          <h1 className="text-3xl font-bold mb-2 text-center">Chính sách đổi trả</h1>
          <p className="text-center text-sm text-[var(--text-soft)] mb-10">
            Cập nhật lần cuối: tháng 02 năm 2025
          </p>
        </ScrollReveal>

        <PageTransition>
          <div className="max-w-3xl mx-auto space-y-8 text-sm leading-7 text-[var(--text-soft)]">

            <ScrollReveal variant="fadeUp" delay={0.05}>
              <section className="rounded-none border border-[var(--line)] bg-[var(--surface-card)] p-5">
                <p className="font-semibold text-[var(--text)]">
                  Cam kết của In ảnh 24h
                </p>
                <p className="mt-1">
                  Chúng tôi cam kết đảm bảo chất lượng sản phẩm. Nếu sản phẩm bị lỗi do
                  phía cửa hàng, chúng tôi sẽ <strong>in lại miễn phí hoặc hoàn tiền 100%</strong>.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.1}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">1. Điều kiện được đổi/trả</h2>
                <p>Chúng tôi chấp nhận đổi trả trong các trường hợp lỗi từ phía cửa hàng:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Ảnh in bị nhòe, mờ, sai màu so với file gốc</li>
                  <li>Sản phẩm bị hỏng, rách, bong tróc khi nhận hàng</li>
                  <li>In sai kích thước, sai số lượng so với đơn hàng</li>
                  <li>Giao nhầm sản phẩm (sai chất liệu, sai loại)</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.15}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">2. Thời hạn khiếu nại</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Khi nhận hàng:</strong> Kiểm tra sản phẩm ngay khi nhận. Nếu phát hiện lỗi,
                    phản ánh ngay với nhân viên giao hàng hoặc liên hệ cửa hàng trong vòng{" "}
                    <strong>24 giờ</strong> kể từ khi nhận.
                  </li>
                  <li>
                    <strong>Đối với lỗi ẩn:</strong> Liên hệ trong vòng <strong>48 giờ</strong> kể từ
                    khi nhận hàng.
                  </li>
                </ul>
                <p className="mt-2 text-xs italic">
                  Lưu ý: Khiếu nại ngoài thời hạn trên có thể không được xử lý.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.2}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">3. Quy trình đổi/trả</h2>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>
                    <strong>Liên hệ cửa hàng</strong> qua hotline 0877.22.66.44 hoặc email{" "}
                    <a href="mailto:Inanhonline24h@gmail.com" className="text-[var(--accent)] hover:underline">
                      Inanhonline24h@gmail.com
                    </a>
                  </li>
                  <li>
                    <strong>Cung cấp bằng chứng:</strong> Ảnh chụp sản phẩm lỗi, mã đơn hàng
                  </li>
                  <li>
                    <strong>Xác nhận:</strong> Cửa hàng xác nhận lỗi trong vòng 4 giờ làm việc
                  </li>
                  <li>
                    <strong>Xử lý:</strong> In lại miễn phí (giao trong ngày hoặc ngày hôm sau) hoặc
                    hoàn tiền trong vòng 3–5 ngày làm việc
                  </li>
                </ol>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.25}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">4. Các trường hợp không áp dụng đổi/trả</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    File ảnh do khách cung cấp có chất lượng thấp (độ phân giải thấp, ảnh mờ từ gốc)
                    — chúng tôi sẽ thông báo trước khi in
                  </li>
                  <li>Khách hàng thay đổi ý kiến sau khi đã xác nhận và sản phẩm đã in</li>
                  <li>Sản phẩm đã qua sử dụng, bị hư hỏng do khách hàng</li>
                  <li>Khiếu nại quá thời hạn quy định tại mục 2</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.3}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">5. Phương thức hoàn tiền</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Chuyển khoản ngân hàng theo thông tin khách cung cấp</li>
                  <li>Tiền mặt (áp dụng khi khách đến trực tiếp cửa hàng)</li>
                  <li>Thời gian hoàn tiền: <strong>3–5 ngày làm việc</strong> kể từ khi xác nhận</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.35}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">6. Liên hệ hỗ trợ</h2>
                <ul className="space-y-1">
                  <li><strong>Hộ kinh doanh Nguyễn Thị Thanh Mừng</strong></li>
                  <li>Địa chỉ: số 50, xóm Sen, thôn Bắc Võng Ngoại, Xã Võng Xuyên, Huyện Phúc Thọ, Hà Nội</li>
                  <li>
                    Hotline:{" "}
                    <a href="tel:0877226644" className="text-[var(--accent)] hover:underline">0877.22.66.44</a>
                    {" "}·{" "}
                    <a href="tel:0868321320" className="text-[var(--accent)] hover:underline">0868.321.320</a>
                  </li>
                  <li>
                    Email:{" "}
                    <a href="mailto:Inanhonline24h@gmail.com" className="text-[var(--accent)] hover:underline">
                      Inanhonline24h@gmail.com
                    </a>
                  </li>
                  <li>Giờ hỗ trợ: Thứ 2 – Thứ 7: 08:00 – 20:00 | Chủ nhật: 09:00 – 18:00</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="zoomIn" delay={0.4}>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/chinh-sach-bao-mat"
                  className="rounded-none border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:bg-white transition-colors"
                >
                  Xem chính sách bảo mật
                </Link>
                <Link
                  href="/lien-he"
                  className="rounded-none border border-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] transition-colors"
                >
                  Liên hệ hỗ trợ
                </Link>
              </div>
            </ScrollReveal>

          </div>
        </PageTransition>
      </main>
      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
