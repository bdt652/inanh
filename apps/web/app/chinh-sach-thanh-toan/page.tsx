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
  title: "Chính sách thanh toán | In ảnh 24h",
  description:
    "Chính sách thanh toán của In ảnh 24h. Hỗ trợ thanh toán tiền mặt, chuyển khoản ngân hàng, COD. An toàn và tiện lợi.",
  keywords: "chính sách thanh toán, thanh toán in ảnh, chuyển khoản in ảnh 24h, COD in ảnh",
  alternates: { canonical: `${SITE_URL}/chinh-sach-thanh-toan` },
  openGraph: {
    title: "Chính sách thanh toán - In ảnh 24h",
    description: "Chính sách thanh toán của In ảnh 24h. Hỗ trợ thanh toán tiền mặt, chuyển khoản, COD.",
    url: `${SITE_URL}/chinh-sach-thanh-toan`,
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

export default async function ChinhSachThanhToanPage() {
  const [menuItems, categories, siteSettings] = await Promise.all([
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Chính sách thanh toán", url: `${SITE_URL}/chinh-sach-thanh-toan` },
  ]);

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chính sách thanh toán - In ảnh 24h",
    url: `${SITE_URL}/chinh-sach-thanh-toan`,
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
          <h1 className="text-3xl font-bold mb-2 text-center">Chính sách thanh toán</h1>
          <p className="text-center text-sm text-[var(--text-soft)] mb-10">
            Cập nhật lần cuối: tháng 02 năm 2025
          </p>
        </ScrollReveal>

        <PageTransition>
          <div className="max-w-3xl mx-auto space-y-8 text-sm leading-7 text-[var(--text-soft)]">

            <ScrollReveal variant="fadeUp" delay={0.05}>
              <section className="rounded-none border border-[var(--line)] bg-[var(--surface-card)] p-5">
                <p className="font-semibold text-[var(--text)]">Cam kết thanh toán an toàn</p>
                <p className="mt-1">
                  In ảnh 24h hỗ trợ nhiều hình thức thanh toán linh hoạt, <strong>không thu thêm phí</strong>{" "}
                  với bất kỳ phương thức thanh toán nào. Mọi thông tin thanh toán của khách hàng được
                  bảo mật tuyệt đối.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.1}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">1. Các phương thức thanh toán</h2>

                <div className="space-y-4">
                  <div className="rounded-none border border-[var(--line)] p-4">
                    <p className="font-semibold text-[var(--text)] mb-1">💵 Tiền mặt</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Thanh toán trực tiếp tại cửa hàng</li>
                      <li>Thanh toán khi nhận hàng (COD) — áp dụng trong nội thành Hà Nội</li>
                    </ul>
                  </div>

                  <div className="rounded-none border border-[var(--line)] p-4">
                    <p className="font-semibold text-[var(--text)] mb-1">🏦 Chuyển khoản ngân hàng</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Chuyển khoản trước khi đặt in hoặc sau khi xác nhận đơn hàng</li>
                      <li>Nội dung chuyển khoản: <strong>Tên + số điện thoại + nội dung đơn hàng</strong></li>
                      <li>Cửa hàng sẽ cung cấp thông tin tài khoản qua Zalo/điện thoại khi đặt đơn</li>
                    </ul>
                  </div>

                  <div className="rounded-none border border-[var(--line)] p-4">
                    <p className="font-semibold text-[var(--text)] mb-1">📱 Ví điện tử / QR Code</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Hỗ trợ thanh toán qua <strong>MoMo, ZaloPay, VietQR</strong></li>
                      <li>Quét mã QR — chuyển khoản nhanh, không cần nhập số tài khoản</li>
                    </ul>
                  </div>

                  <div className="rounded-none border border-[var(--line)] p-4">
                    <p className="font-semibold text-[var(--text)] mb-1">🚚 COD (Thu tiền khi giao hàng)</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Áp dụng với đơn giao hàng qua đơn vị vận chuyển</li>
                      <li>Khách thanh toán cho nhân viên giao hàng khi nhận đơn</li>
                      <li>Có thể kiểm tra sản phẩm trước khi thanh toán</li>
                    </ul>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.15}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">2. Thời điểm thanh toán</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Đặt online / giao hàng xa:</strong> Đặt cọc 50% hoặc thanh toán đủ trước khi in
                    (áp dụng đơn hàng giá trị lớn hoặc đơn hàng lần đầu)
                  </li>
                  <li>
                    <strong>Đặt tại cửa hàng:</strong> Thanh toán khi nhận sản phẩm
                  </li>
                  <li>
                    <strong>COD nội thành:</strong> Thanh toán khi nhận hàng, sau khi đã kiểm tra
                  </li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.2}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">3. Hóa đơn & chứng từ</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Xuất hóa đơn điện tử theo yêu cầu — liên hệ báo trước khi đặt hàng</li>
                  <li>Cung cấp biên lai chuyển khoản hoặc xác nhận thanh toán qua Zalo/email</li>
                  <li>Lưu giữ lịch sử giao dịch trong hệ thống để hỗ trợ khiếu nại</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.25}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">4. Chính sách hoàn tiền</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Hoàn tiền 100% nếu lỗi do cửa hàng (in sai, in lỗi)</li>
                  <li>Hoàn tiền trong vòng <strong>3–5 ngày làm việc</strong> kể từ khi xác nhận</li>
                  <li>
                    Phương thức hoàn: chuyển khoản ngân hàng hoặc tiền mặt (tại cửa hàng)
                  </li>
                  <li>
                    Xem chi tiết:{" "}
                    <Link href="/chinh-sach-doi-tra" className="text-[var(--accent)] hover:underline">
                      Chính sách đổi trả
                    </Link>
                  </li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.3}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">5. Bảo mật thông tin thanh toán</h2>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Thông tin thanh toán của khách hàng được bảo mật tuyệt đối</li>
                  <li>Chúng tôi không lưu trữ thông tin thẻ ngân hàng của khách</li>
                  <li>
                    Mọi giao dịch chuyển khoản đều qua kênh chính thức của ngân hàng —
                    không thanh toán qua link lạ
                  </li>
                  <li>
                    Xem thêm:{" "}
                    <Link href="/chinh-sach-bao-mat" className="text-[var(--accent)] hover:underline">
                      Chính sách bảo mật
                    </Link>
                  </li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.35}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">6. Liên hệ hỗ trợ thanh toán</h2>
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
