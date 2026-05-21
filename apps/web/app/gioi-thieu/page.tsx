import type { Metadata } from "next";
import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import ScrollProgress from "../components/ScrollProgress";
import { getCategories, getMenuItems, getSiteSettings } from "../lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "In ảnh 24h - Dịch vụ in ảnh online uy tín tại Hà Nội. Hơn 10 năm kinh nghiệm, in nhanh trong ngày, đúng màu, giá cạnh tranh. Địa chỉ: 85 Phố Gạch, Phúc Thọ, Hà Nội.",
  keywords: "giới thiệu in ảnh 24h, in ảnh uy tín, in ảnh chất lượng, in ảnh Hà Nội, dịch vụ in ảnh",
  openGraph: {
    title: "Giới thiệu - In ảnh 24h",
    description: "In ảnh 24h - Dịch vụ in ảnh online uy tín tại Hà Nội. Hơn 10 năm kinh nghiệm, in nhanh trong ngày, đúng màu, giá cạnh tranh.",
    url: "/gioi-thieu",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function GioiThieuPage() {
  const [menuItems, categories, siteSettings] = await Promise.all([
    safe(getMenuItems, []),
    safe(getCategories, []),
    safe(getSiteSettings, null),
  ]);

  return (
    <div className="relative min-h-screen">
      <AmbientGlow />
      <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />
      <ScrollProgress />
      <main className="w-full pb-12 pt-8 px-4 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "Giới thiệu In ảnh 24h",
            description: "Dịch vụ in ảnh online uy tín tại Hà Nội - In nhanh trong ngày, đúng màu, giá cạnh tranh",
            url: "https://inanh24h.com/gioi-thieu",
            image: "https://inanh24h.com/Inanh/logo_inanh24h.jpg",
            mainEntity: {
              "@type": "Organization",
              name: "In ảnh 24h",
              foundingDate: "2014",
              description: "Dịch vụ in ảnh online uy tín tại Hà Nội",
              url: "https://inanh24h.com",
              logo: "https://inanh24h.com/Inanh/logo_inanh24h.jpg",
              address: {
                "@type": "PostalAddress",
                streetAddress: "85 Phố Gạch, TT Phúc Thọ",
                addressLocality: "Phúc Thọ",
                addressRegion: "Hà Nội",
                addressCountry: "VN",
              },
              telephone: "+84877226644",
              email: "Inanhonline24h@gmail.com",
              numberOfEmployees: {
                "@type": "QuantitativeValue",
                value: 10,
              },
            },
          }),
        }}
      />

      <h1 className="text-3xl font-bold mb-8 text-center">Giới thiệu In ảnh 24h</h1>

      <div className="max-w-4xl mx-auto space-y-8">
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Về chúng tôi</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>In ảnh 24h</strong> là dịch vụ in ảnh online uy tín hàng đầu tại Hà Nội, chuyên cung cấp các dịch vụ in ảnh chất lượng cao với giá cạnh tranh. Với hơn 10 năm kinh nghiệm trong ngành, chúng tôi tự hào đã phục vụ hàng nghìn khách hàng trên toàn quốc.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Chúng tôi cam kết mang đến cho khách hàng những sản phẩm in ảnh chất lượng nhất, với màu sắc trung thực, sắc nét và bền đẹp theo thời gian.
          </p>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Tại sao chọn In ảnh 24h?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "⚡", title: "In nhanh trong ngày", desc: "Nhận đơn và giao hàng trong vòng 24 giờ" },
              { icon: "🎨", title: "Màu sắc chuẩn xác", desc: "Công nghệ in hiện đại, màu sắc trung thực 100%" },
              { icon: "💰", title: "Giá cạnh tranh", desc: "Bảng giá minh bạch, không phát sinh chi phí ẩn" },
              { icon: "📦", title: "Đóng gói cẩn thận", desc: "Sản phẩm được đóng gói kỹ lưỡng, an toàn khi vận chuyển" },
              { icon: "🔄", title: "Đổi trả dễ dàng", desc: "Cam kết đổi trả nếu sản phẩm không đúng yêu cầu" },
              { icon: "📞", title: "Hỗ trợ 24/7", desc: "Đội ngũ tư vấn luôn sẵn sàng hỗ trợ bạn" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Dịch vụ của chúng tôi</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> In ảnh kích thước nhỏ (9x13, 10x15, 13x18, 15x21...)</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> In ảnh khổ lớn (A4, A3, A2, A1, A0)</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> In album ảnh cưới cao cấp</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> In ảnh gỗ, ảnh canvas</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> In tranh treo tường</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> In ảnh PP, ảnh bạt</li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span> In ảnh lấy ngay tại cửa hàng</li>
          </ul>
        </section>

        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Thông tin liên hệ</h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>Địa chỉ:</strong> 85 Phố Gạch, TT Phúc Thọ, Huyện Phúc Thọ, TP. Hà Nội</p>
            <p><strong>Điện thoại:</strong>{" "}
              <a href="tel:0877226644" className="text-blue-600 hover:underline">0877.22.66.44</a>
              {" "}-{" "}
              <a href="tel:0868321320" className="text-blue-600 hover:underline">0868.321.320</a>
            </p>
            <p><strong>Email:</strong>{" "}
              <a href="mailto:Inanhonline24h@gmail.com" className="text-blue-600 hover:underline">Inanhonline24h@gmail.com</a>
            </p>
            <p><strong>Giờ mở cửa:</strong> Thứ 2 - Thứ 7: 08:00 - 20:00 | Chủ nhật: 09:00 - 18:00</p>
          </div>
        </section>
      </div>
    </main>
    <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
