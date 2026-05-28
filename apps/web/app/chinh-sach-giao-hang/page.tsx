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
  title: "Chính sách giao hàng | In ảnh 24h",
  description:
    "Chính sách giao hàng của In ảnh 24h. Giao hàng toàn quốc, nhanh trong ngày tại Hà Nội. Miễn phí giao hàng cho đơn từ 300.000đ.",
  keywords: "chính sách giao hàng, giao hàng in ảnh, ship in ảnh 24h, giao hàng nhanh",
  alternates: { canonical: `${SITE_URL}/chinh-sach-giao-hang` },
  openGraph: {
    title: "Chính sách giao hàng - In ảnh 24h",
    description: "Chính sách giao hàng của In ảnh 24h. Giao hàng toàn quốc, nhanh trong ngày tại Hà Nội.",
    url: `${SITE_URL}/chinh-sach-giao-hang`,
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

export default async function ChinhSachGiaoHangPage() {
  const [menuItems, categories, siteSettings] = await Promise.all([
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Chính sách giao hàng", url: `${SITE_URL}/chinh-sach-giao-hang` },
  ]);

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chính sách giao hàng - In ảnh 24h",
    url: `${SITE_URL}/chinh-sach-giao-hang`,
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
          <h1 className="text-3xl font-bold mb-2 text-center">Chính sách giao hàng</h1>
          <p className="text-center text-sm text-[var(--text-soft)] mb-10">
            Cập nhật lần cuối: tháng 02 năm 2025
          </p>
        </ScrollReveal>

        <PageTransition>
          <div className="max-w-3xl mx-auto space-y-8 text-sm leading-7 text-[var(--text-soft)]">

            <ScrollReveal variant="fadeUp" delay={0.05}>
              <section className="rounded-none border border-[var(--line)] bg-[var(--surface-card)] p-5">
                <p className="font-semibold text-[var(--text)]">Cam kết giao hàng của In ảnh 24h</p>
                <p className="mt-1">
                  Chúng tôi cam kết giao hàng <strong>nhanh chóng, đúng hẹn</strong>, đảm bảo sản phẩm
                  nguyên vẹn khi đến tay khách hàng. Mọi đơn hàng đều được đóng gói cẩn thận trước khi giao.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.1}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">1. Phạm vi giao hàng</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Nội thành Hà Nội:</strong> Giao hàng trực tiếp trong ngày hoặc hôm sau</li>
                  <li><strong>Toàn quốc:</strong> Giao qua đơn vị vận chuyển (GHN, GHTK, Viettel Post...)</li>
                  <li>Khách ở xa có thể <strong>đặt online và nhận qua bưu điện</strong></li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.15}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">2. Thời gian giao hàng</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--surface)] text-[var(--text)]">
                        <th className="border border-[var(--line)] px-3 py-2 text-left font-semibold">Khu vực</th>
                        <th className="border border-[var(--line)] px-3 py-2 text-left font-semibold">Thời gian</th>
                        <th className="border border-[var(--line)] px-3 py-2 text-left font-semibold">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-[var(--line)] px-3 py-2">Nội thành Hà Nội</td>
                        <td className="border border-[var(--line)] px-3 py-2">Trong ngày – 24h</td>
                        <td className="border border-[var(--line)] px-3 py-2">Đặt trước 14:00</td>
                      </tr>
                      <tr>
                        <td className="border border-[var(--line)] px-3 py-2">Ngoại thành Hà Nội</td>
                        <td className="border border-[var(--line)] px-3 py-2">1–2 ngày</td>
                        <td className="border border-[var(--line)] px-3 py-2">Qua đơn vị vận chuyển</td>
                      </tr>
                      <tr>
                        <td className="border border-[var(--line)] px-3 py-2">Các tỉnh thành khác</td>
                        <td className="border border-[var(--line)] px-3 py-2">2–5 ngày</td>
                        <td className="border border-[var(--line)] px-3 py-2">Tùy đơn vị vận chuyển</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs italic">
                  Thời gian trên tính từ khi sản phẩm hoàn thành. Có thể thay đổi trong dịp lễ Tết.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.2}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">3. Phí giao hàng</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Miễn phí giao hàng</strong> nội thành Hà Nội cho đơn từ{" "}
                    <strong>300.000đ</strong> trở lên
                  </li>
                  <li>
                    Đơn dưới 300.000đ hoặc giao ngoại thành: phí ship theo thực tế của đơn vị vận chuyển
                  </li>
                  <li>Giao hàng hỏa tốc (trong 2–4 giờ): tính thêm phụ phí, liên hệ để báo giá</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.25}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">4. Quy trình xử lý & giao hàng</h2>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Khách đặt hàng và upload file ảnh</li>
                  <li>Cửa hàng xác nhận đơn và kiểm tra file (thông báo nếu file ảnh không đạt)</li>
                  <li>In và hoàn thiện sản phẩm</li>
                  <li>Đóng gói, bàn giao cho đơn vị vận chuyển hoặc giao trực tiếp</li>
                  <li>Khách nhận hàng và kiểm tra sản phẩm</li>
                </ol>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.3}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">5. Kiểm tra hàng khi nhận</h2>
                <p>Khách hàng có quyền <strong>kiểm tra sản phẩm trước khi thanh toán</strong> (COD).</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Kiểm tra số lượng, kích thước, chất liệu theo đơn hàng</li>
                  <li>Kiểm tra chất lượng in (màu sắc, độ sắc nét)</li>
                  <li>Nếu phát hiện lỗi: từ chối nhận và liên hệ cửa hàng ngay, hoặc chụp ảnh bằng chứng trong vòng 24h</li>
                </ul>
                <p className="mt-2">
                  Xem thêm:{" "}
                  <Link href="/chinh-sach-doi-tra" className="text-[var(--accent)] hover:underline">
                    Chính sách đổi trả
                  </Link>
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.35}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">6. Lưu ý khi đặt hàng ship xa</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Cung cấp địa chỉ giao hàng đầy đủ và số điện thoại người nhận</li>
                  <li>Chúng tôi sẽ gửi mã vận đơn để khách theo dõi đơn hàng</li>
                  <li>Sản phẩm ảnh in là hàng dễ vỡ/cong vênh — sẽ được đóng gói ống cứng hoặc hộp carton</li>
                  <li>Không chịu trách nhiệm với hư hại do đơn vị vận chuyển gây ra nếu đã đóng gói đúng quy cách</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.4}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">7. Liên hệ hỗ trợ giao hàng</h2>
                <ul className="space-y-1">
                  <li><strong>Hộ Kinh Doanh Nguyễn Thị Thanh Mừng (In ảnh 24h)</strong></li>
                  <li>Địa chỉ: Số 50, Xóm Sen, Thôn Bắc Võng Ngoại, Xã Võng Xuyên, Huyện Phúc Thọ, TP. Hà Nội</li>
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
                  <li>Giờ làm việc: Thứ 2 – Thứ 7: 08:00–20:00 | Chủ nhật: 09:00–18:00</li>
                </ul>
              </section>
            </ScrollReveal>

          </div>
        </PageTransition>
      </main>
      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
