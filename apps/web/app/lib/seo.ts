import type { ProductCard, ProductDetail } from "./content";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://inanh24h.com").replace(/\/+$/, "");
export const SITE_NAME = "In ảnh 24h";
export const DEFAULT_OG_IMAGE = "/Inanh/logo_inanh24h.jpg";
export const ZALO_OA_URL = "https://zalo.me/3509964870539338786";

// Revalidation TTLs in seconds
export const REVALIDATE_SHORT = 300;   // 5 phút — homepage, products, CMS pages
export const REVALIDATE_LONG = 3600;  // 1 tiếng — FAQ, About, Contact (static content)

// Used in sitemap to distinguish "redesign" changes from "always fresh"
export const SITE_LAUNCH_DATE = new Date("2024-10-01");

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: "Hộ Kinh Doanh Nguyễn Thị Thanh Mừng",
    taxID: "8568913418-001",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/Inanh/logo_inanh24h.jpg`,
      width: 200,
      height: 200,
    },
    image: `${SITE_URL}/Inanh/logo_inanh24h.jpg`,
    email: "Inanhonline24h@gmail.com",
    telephone: "+84877226644",
    priceRange: "₫₫",
    currenciesAccepted: "VND",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "08:00",
        closes: "20:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Sunday",
        opens: "09:00",
        closes: "18:00",
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Số 50, Xóm Sen, Thôn Bắc Võng Ngoại, Xã Võng Xuyên",
      addressLocality: "Phúc Thọ",
      addressRegion: "Hà Nội",
      postalCode: "100000",
      addressCountry: "VN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "21.0553",
      longitude: "105.5464",
    },
    hasMap: "https://maps.google.com/?q=85+Phố+Gạch+Phúc+Thọ+Hà+Nội",
    sameAs: [
      "https://www.facebook.com/inanh24h",
      ZALO_OA_URL,
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+84877226644",
        contactType: "customer service",
        areaServed: "VN",
        availableLanguage: "Vietnamese",
      },
    ],
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/Inanh/logo_inanh24h.jpg`,
    },
    sameAs: [
      "https://www.facebook.com/inanh24h",
      ZALO_OA_URL,
    ],
  };
}

type ReviewForJsonLd = {
  rating: number;
  body: string;
  reviewer_name: string;
  created_at: string | null;
};

export function buildProductJsonLd(
  product: ProductDetail,
  url: string,
  reviews?: ReviewForJsonLd[],
  aggregateRating?: { value: number; count: number },
) {
  const hasSale = product.sale_price !== null && product.sale_price > 0 && product.sale_price < product.price;
  const effectivePrice = hasSale && product.sale_price !== null ? product.sale_price : product.price;
  const description = product.short_description?.trim()
    || `Sản phẩm thuộc danh mục ${product.category_slug.replace(/-/g, " ").trim()}.`;

  const priceValidUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  })();

  const images = product.image_urls.length > 0
    ? product.image_urls
    : product.image_url ? [product.image_url] : [];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: images,
    description,
    sku: product.slug,
    mpn: product.slug,
    category: product.category_slug.replace(/-/g, " ").trim(),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    manufacturer: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    ...(aggregateRating && aggregateRating.count >= 3
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: aggregateRating.value,
            reviewCount: aggregateRating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(reviews && reviews.length > 0
      ? {
          review: reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewBody: r.body,
            datePublished: r.created_at ?? undefined,
            author: { "@type": "Person", name: r.reviewer_name },
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
          })),
        }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "VND",
      price: Math.round(effectivePrice),
      priceValidUntil,
      availability: product.is_active !== false
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      availableDeliveryMethod: "https://schema.org/ParcelDelivery",
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "VN",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "VN",
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          currency: "VND",
          value: 0,
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          businessDays: {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          },
          cutoffTime: "14:00:00",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY",
          },
        },
      },
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
  };
}

export function buildItemListJsonLd(products: ProductCard[], siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Danh sách sản phẩm in ảnh",
    description: "Toàn bộ sản phẩm dịch vụ in ảnh tại In ảnh 24h",
    url: `${siteUrl}/san-pham`,
    itemListElement: products
      .filter((p) => p.slug)
      .map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/san-pham/${encodeURIComponent(product.slug!)}`,
        name: product.title,
      })),
  };
}
