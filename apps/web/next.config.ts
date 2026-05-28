import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const ROOT_ENV_PATH = path.resolve(process.cwd(), "..", "..", ".env");
const PUBLIC_ENV_PREFIX = "NEXT_PUBLIC_";

const loadRootPublicEnv = () => {
  if (!fs.existsSync(ROOT_ENV_PATH)) return;
  const contents = fs.readFileSync(ROOT_ENV_PATH, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (!key.startsWith(PUBLIC_ENV_PREFIX)) continue;
    if (process.env[key]) continue;
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
};

loadRootPublicEnv();

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "host.docker.internal"]);

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const deriveBackendUrl = (backendUrl: string, apiUrl: string): string => {
  if (backendUrl) return stripTrailingSlashes(backendUrl);
  if (!apiUrl) return "";
  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api\/v1\/?$/i, "");
    url.search = "";
    url.hash = "";
    return stripTrailingSlashes(url.toString());
  } catch {
    return "";
  }
};

const isDev = process.env.NODE_ENV !== "production";
const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();
const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
const minioEndpoint = (process.env.NEXT_PUBLIC_MINIO_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? "").trim();
const resolvedBackendUrl = deriveBackendUrl(backendUrl, apiUrl) || "http://localhost:8000";

const isLocalUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
};

const disableImageOptimization = isDev && isLocalUrl(resolvedBackendUrl);

type RemotePattern = {
  protocol?: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
};

const uniquePatterns = (patterns: RemotePattern[]): RemotePattern[] => {
  const seen = new Set<string>();
  return patterns.filter((pattern) => {
    const key = `${pattern.protocol ?? ""}|${pattern.hostname ?? ""}|${pattern.port ?? ""}|${pattern.pathname ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const createPattern = (urlValue: string, pathname = "/**"): RemotePattern | null => {
  try {
    const url = new URL(urlValue);
    const protocol = url.protocol.replace(":", "") as "http" | "https";
    const pattern: RemotePattern = {
      protocol,
      hostname: url.hostname,
      pathname,
    };
    if (url.port) pattern.port = url.port;
    return pattern;
  } catch {
    return null;
  }
};

const addLocalAliases = (urlValue: string, pathname = "/**"): RemotePattern[] => {
  const patterns: RemotePattern[] = [];
  try {
    const url = new URL(urlValue);
    if (!LOCAL_HOSTNAMES.has(url.hostname)) return patterns;
    for (const hostname of LOCAL_HOSTNAMES) {
      const aliasUrl = `${url.protocol}//${hostname}${url.port ? `:${url.port}` : ""}`;
      const pattern = createPattern(aliasUrl, pathname);
      if (pattern) patterns.push(pattern);
    }
  } catch {
    return patterns;
  }
  return patterns;
};

const buildRemotePatterns = (): RemotePattern[] => {
  const patterns: RemotePattern[] = [];

  const backendPattern = createPattern(resolvedBackendUrl, "/uploads/**");
  if (backendPattern) patterns.push(backendPattern);
  patterns.push(...addLocalAliases(resolvedBackendUrl, "/uploads/**"));

  if (apiUrl) {
    const apiBackend = deriveBackendUrl("", apiUrl);
    const apiPattern = apiBackend ? createPattern(apiBackend, "/uploads/**") : null;
    if (apiPattern) patterns.push(apiPattern);
    if (apiBackend) patterns.push(...addLocalAliases(apiBackend, "/uploads/**"));
  }

  if (minioEndpoint) {
    const minioPattern = createPattern(minioEndpoint, "/**");
    if (minioPattern) patterns.push(minioPattern);
  }

  patterns.push(
    { protocol: "http", hostname: "localhost", port: "8000", pathname: "/uploads/**" },
    { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
    { protocol: "https", hostname: "inanh24h.com", pathname: "/**" },
    { protocol: "https", hostname: "www.inanh24h.com", pathname: "/**" },
    { protocol: "https", hostname: "api.inanh24h.com", pathname: "/uploads/**" },
    { protocol: "https", hostname: "media.inanh24h.com", pathname: "/**" }
  );

  return uniquePatterns(patterns);
};

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: disableImageOptimization,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 480],
    remotePatterns: buildRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async rewrites() {
    return {
      // Serve .html URLs from Next.js routes without redirecting the browser
      beforeFiles: [
        { source: "/tin-tuc.html", destination: "/tin-tuc" },
        { source: "/tin-tuc/:slug.html", destination: "/tin-tuc/:slug" },
        { source: "/san-pham/:slug.html", destination: "/san-pham/:slug" },
      ],
    };
  },
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
      // Canonical .html: redirect clean URLs to .html versions
      {
        source: "/tin-tuc",
        destination: "/tin-tuc.html",
        permanent: true,
      },
      {
        source: "/tin-tuc/:slug([^.]+)",
        destination: "/tin-tuc/:slug.html",
        permanent: true,
      },
      {
        source: "/san-pham/:slug([^.]+)",
        destination: "/san-pham/:slug.html",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
