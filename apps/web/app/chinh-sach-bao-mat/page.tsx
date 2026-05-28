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
  title: "Chính sách bảo mật | In ảnh 24h",
  description:
    "Chính sách bảo mật thông tin của In ảnh 24h. Chúng tôi cam kết bảo vệ thông tin cá nhân và dữ liệu của khách hàng theo quy định pháp luật Việt Nam.",
  keywords: "chính sách bảo mật, bảo mật thông tin, in ảnh 24h bảo mật",
  alternates: { canonical: `${SITE_URL}/chinh-sach-bao-mat` },
  openGraph: {
    title: "Chính sách bảo mật - In ảnh 24h",
    description: "Chính sách bảo mật thông tin khách hàng của In ảnh 24h.",
    url: `${SITE_URL}/chinh-sach-bao-mat`,
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

export default async function ChinhSachBaoMatPage() {
  const [menuItems, categories, siteSettings] = await Promise.all([
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Trang chủ", url: SITE_URL },
    { name: "Chính sách bảo mật", url: `${SITE_URL}/chinh-sach-bao-mat` },
  ]);

  const pageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Chính sách bảo mật - In ảnh 24h",
    url: `${SITE_URL}/chinh-sach-bao-mat`,
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
          <h1 className="text-3xl font-bold mb-2 text-center">Chính sách bảo mật</h1>
          <p className="text-center text-sm text-[var(--text-soft)] mb-10">
            Cập nhật lần cuối: tháng 02 năm 2025
          </p>
        </ScrollReveal>

        <PageTransition>
          <div className="max-w-3xl mx-auto space-y-8 text-sm leading-7 text-[var(--text-soft)]">

            <ScrollReveal variant="fadeUp" delay={0.05}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">1. Phạm vi áp dụng</h2>
                <p>
                  Chính sách bảo mật này áp dụng cho toàn bộ hoạt động của website{" "}
                  <strong>inanh24h.com</strong> thuộc{" "}
                  <strong>Hộ kinh doanh Nguyễn Thị Thanh Mừng</strong>, địa chỉ: số 50, xóm Sen,
                  thôn Bắc Võng Ngoại, Xã Võng Xuyên, Huyện Phúc Thọ, Thành phố Hà Nội.
                </p>
                <p className="mt-2">
                  Khi sử dụng dịch vụ của chúng tôi, bạn đồng ý với các điều khoản được quy định
                  trong chính sách này.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.1}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">2. Thông tin chúng tôi thu thập</h2>
                <p>Chúng tôi thu thập các thông tin sau khi bạn sử dụng dịch vụ:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Họ tên, số điện thoại, địa chỉ email</li>
                  <li>Địa chỉ giao hàng</li>
                  <li>File ảnh bạn tải lên để in</li>
                  <li>Thông tin đơn hàng (loại sản phẩm, kích thước, số lượng)</li>
                  <li>Dữ liệu truy cập website (thông qua Google Analytics)</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.15}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">3. Mục đích sử dụng thông tin</h2>
                <p>Thông tin thu thập được sử dụng để:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Xử lý và thực hiện đơn hàng của bạn</li>
                  <li>Liên hệ xác nhận đơn hàng, thông báo tình trạng giao hàng</li>
                  <li>Hỗ trợ khách hàng và giải quyết khiếu nại</li>
                  <li>Cải thiện chất lượng dịch vụ</li>
                  <li>Tuân thủ nghĩa vụ pháp lý</li>
                </ul>
                <p className="mt-2">
                  Chúng tôi <strong>không</strong> sử dụng thông tin của bạn cho mục đích tiếp thị
                  khi chưa có sự đồng ý.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.2}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">4. Chia sẻ thông tin với bên thứ ba</h2>
                <p>
                  Chúng tôi <strong>không bán, trao đổi hoặc chuyển nhượng</strong> thông tin cá
                  nhân của bạn cho bên thứ ba, ngoại trừ:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    Đơn vị vận chuyển (để giao hàng): chỉ chia sẻ tên, số điện thoại và địa chỉ
                    giao hàng
                  </li>
                  <li>
                    Cơ quan nhà nước có thẩm quyền theo quy định pháp luật
                  </li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.25}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">5. Bảo mật thông tin</h2>
                <p>
                  Website sử dụng giao thức <strong>HTTPS</strong> để mã hóa dữ liệu truyền tải.
                  File ảnh của bạn được lưu trữ trên máy chủ an toàn và chỉ được sử dụng để
                  thực hiện đơn hàng. Sau khi đơn hàng hoàn thành, file ảnh có thể bị xóa theo
                  định kỳ.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.3}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">6. Quyền của bạn</h2>
                <p>Bạn có quyền:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân của mình</li>
                  <li>Từ chối cung cấp thông tin (tuy nhiên có thể ảnh hưởng đến việc thực hiện đơn hàng)</li>
                  <li>Khiếu nại về việc xử lý thông tin cá nhân</li>
                </ul>
                <p className="mt-2">
                  Để thực hiện các quyền trên, vui lòng liên hệ qua email:{" "}
                  <a href="mailto:Inanhonline24h@gmail.com" className="text-[var(--accent)] hover:underline">
                    Inanhonline24h@gmail.com
                  </a>
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.35}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">7. Cookie</h2>
                <p>
                  Website sử dụng cookie cơ bản để duy trì phiên đăng nhập và Google Analytics
                  để phân tích lưu lượng truy cập ẩn danh. Bạn có thể tắt cookie trong cài đặt
                  trình duyệt, tuy nhiên một số tính năng có thể bị ảnh hưởng.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.4}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">8. Thay đổi chính sách</h2>
                <p>
                  Chúng tôi có thể cập nhật chính sách này khi cần thiết. Phiên bản mới nhất
                  luôn được đăng tải tại trang này với ngày cập nhật rõ ràng.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="fadeUp" delay={0.45}>
              <section>
                <h2 className="text-base font-semibold text-[var(--text)] mb-3">9. Liên hệ</h2>
                <p>Mọi thắc mắc về chính sách bảo mật, vui lòng liên hệ:</p>
                <ul className="mt-2 space-y-1">
                  <li><strong>Hộ kinh doanh Nguyễn Thị Thanh Mừng</strong></li>
                  <li>Địa chỉ: số 50, xóm Sen, thôn Bắc Võng Ngoại, Xã Võng Xuyên, Huyện Phúc Thọ, Hà Nội</li>
                  <li>
                    Điện thoại:{" "}
                    <a href="tel:0877226644" className="text-[var(--accent)] hover:underline">0877.22.66.44</a>
                  </li>
                  <li>
                    Email:{" "}
                    <a href="mailto:Inanhonline24h@gmail.com" className="text-[var(--accent)] hover:underline">
                      Inanhonline24h@gmail.com
                    </a>
                  </li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal variant="zoomIn" delay={0.5}>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/chinh-sach-doi-tra"
                  className="rounded-none border border-[var(--line)] px-5 py-3 text-sm font-semibold hover:bg-white transition-colors"
                >
                  Xem chính sách đổi trả
                </Link>
                <Link
                  href="/lien-he"
                  className="rounded-none border border-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] transition-colors"
                >
                  Liên hệ chúng tôi
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
