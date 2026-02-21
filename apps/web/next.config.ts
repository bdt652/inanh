import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Force non-www
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.inanh24h.com" }],
        destination: "https://inanh24h.com/:path*",
        permanent: true,
      },
      // Force HTTPS when receiving http traffic (behind proxy that sets x-forwarded-proto)
      {
        source: "/:path*",
        has: [
          { type: "host", value: "inanh24h.com" },
          { type: "header", key: "x-forwarded-proto", value: "http" },
        ],
        destination: "https://inanh24h.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
