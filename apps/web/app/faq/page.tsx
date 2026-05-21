import type { Metadata } from "next";
import Link from "next/link";
import AmbientGlow from "../components/AmbientGlow";
import FooterSection from "../components/FooterSection";
import HeaderBar from "../components/HeaderBar";
import ScrollProgress from "../components/ScrollProgress";
import { getCategories, getMenuItems, getSiteSettings } from "../lib/api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Câu hỏi thường gặp",
  description: "Câu hỏi thường gặp về dịch vụ in ảnh - Giải đáp mọi thắc mắc về in ảnh: giá cả, kích thước, chất liệu, thời gian in, giao hàng...",
  keywords: "faq in ảnh, câu hỏi in ảnh, hướng dẫn in ảnh, hỏi đáp in ảnh",
  openGraph: {
    title: "Câu hỏi thường gặp - In ảnh 24h",
    description: "Câu hỏi thường gặp về dịch vụ in ảnh - Giải đáp mọi thắc mắc về in ảnh",
    url: "/faq",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const faqItems = [
  {
    question: "In ảnh bao lâu thì xong?",
    answer: "Thông thường, chúng tôi in ảnh và giao trong ngày cho các đơn hàng thông thường. Với các đơn hàng số lượng lớn hoặc yêu cầu đặc biệt, thời gian có thể từ 1-2 ngày. Chúng tôi luôn ưu tiên giao hàng nhanh nhất có thể.",
  },
  {
    question: "Tôi có thể in ảnh với kích thước nào?",
    answer: "Chúng tôi cung cấp đa dạng kích thước từ 9x13cm đến A0 (841x1189mm). Các kích thước phổ biến gồm: 9x13, 10x15, 13x18, 15x21, 20x25, 25x30, A4, A3, A2, A1, A0. Ngoài ra, chúng tôi còn nhận in theo kích thước yêu cầu riêng.",
  },
  {
    question: "Các chất liệu giấy in có sẵn là gì?",
    answer: "Chúng tôi cung cấp nhiều loại chất liệu: Giấy in bóng ( glossy ), giấy in mờ ( matte ), giấy in lụa ( silk ), giấy in RC (Rich Color), giấy in kraft, giấy in foam, giấy in ảnh cao cấp. Mỗi loại giấy có ưu điểm riêng phù hợp với nhu cầu khác nhau.",
  },
  {
    question: "Giá in ảnh bao nhiêu?",
    answer: "Giá in ảnh phụ thuộc vào kích thước, chất liệu giấy và số lượng. Giá bắt đầu từ 6.000đ cho ảnh 9x13cm giấy thường. Đặc biệt, chúng tôi có bảng giá minh bạch và thường xuyên có chương trình khuyến mãi. Liên hệ để được báo giá chính xác nhất.",
  },
  {
    question: "Tôi cần chuẩn bị file ảnh như thế nào?",
    answer: "Để có bản in chất lượng cao, ảnh cần có độ phân giải tối thiểu 300 DPI. Kích thước file cần tương ứng với kích thước in mong muốn. Chúng tôi khuyến nghị sử dụng file ảnh gốc (RAW, JPG chất lượng cao) tránh nén nhiều lần. Nếu file không đạt, chúng tôi sẽ thông báo để bạn có thể chuẩn bị lại.",
  },
  {
    question: "Có giao hàng tận nơi không?",
    answer: "Có, chúng tôi giao hàng toàn quốc qua các đơn vị vận chuyển uy tín. Phí giao hàng tính theo kích thước và cân nặng. Với đơn hàng trong nội thành Hà Nội, chúng tôi có dịch vụ giao hàng nhanh trong ngày miễn phí cho đơn hàng từ một mức nhất định.",
  },
  {
    question: "Chính sách đổi trả thế nào?",
    answer: "Chúng tôi cam kết chất lượng sản phẩm. Nếu sản phẩm in ra có lỗi do chúng tôi (sai màu, nhòe, không nét...), chúng tôi sẽ in lại miễn phí hoặc hoàn tiền. Quý khách vui lòng kiểm tra kỹ sản phẩm khi nhận hàng.",
  },
  {
    question: "Có thể đặt hàng qua điện thoại không?",
    answer: "Có, quý khách có thể gọi điện thoại trực tiếp qua số 0877.22.66.44 hoặc 0868.321.320 để đặt hàng và được tư vấn. Đội ngũ tư vấn của chúng tôi sẽ hỗ trợ bạn chọn kích thước, chất liệu phù hợp với nhu cầu.",
  },
  {
    question: "In số lượng lớn có được giảm giá không?",
    answer: "Có, chúng tôi có chính sách giảm giá cho đơn hàng số lượng lớn. Mức giảm phụ thuộc vào số lượng và kích thước. Liên hệ trực tiếp để nhận báo giá ưu đãi nhất cho đơn hàng số lượng nhiều.",
  },
  {
    question: "Có nhận in ảnh cưới, album ảnh không?",
    answer: "Có, chúng tôi chuyên in album ảnh cưới cao cấp với nhiều mẫu mã và kích thước đa dạng. Album được in trên giấy chất lượng cao, bìa da hoặc bìa cứng với nhiều trang tùy theo yêu cầu. Liên hệ để được tư vấn và xem mẫu.",
  },
];

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function FAQPage() {
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
              "@type": "FAQPage",
              name: "Câu hỏi thường gặp - In ảnh 24h",
              description: "Giải đáp các câu hỏi thường gặp về dịch vụ in ảnh: giá cả, kích thước, chất liệu, thời gian in, giao hàng",
              url: "https://inanh24h.com/faq",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            }),
          }}
        />

        <h1 className="text-3xl font-bold mb-8 text-center">Câu hỏi thường gặp</h1>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="group bg-white rounded-lg shadow-md overflow-hidden"
            >
              <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                <span className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                  {item.question}
                </span>
                <span className="ml-4 flex-shrink-0 text-gray-400 group-open:rotate-180 transition-transform">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                {item.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-4">Không tìm thấy câu trả lời bạn cần?</p>
          <Link
            href="/lien-he"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Liên hệ ngay
          </Link>
        </div>
      </main>
      <FooterSection categories={categories} settings={siteSettings} />
    </div>
  );
}
