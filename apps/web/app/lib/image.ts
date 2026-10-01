const LOCAL_IMAGE_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|host\.docker\.internal)(?::\d+)?\//i;
const SKIP_OPTIMIZATION_HOSTS = new Set<string>();
const FALLBACK_HTTPS_HOSTS = new Set(["api.inanh24h.com", "inanh24h.com", "www.inanh24h.com"]);

// First path segments that live in object storage (backend MinIO/local).
// Anything else (/_next, /Inanh, /api, ...) is a local web asset and must be left alone.
const STORAGE_FOLDERS = new Set([
  "uploads",
  "banners",
  "categories",
  "products",
  "user-uploads",
  "content",
  "logos",
  "hero",
  "pages",
  "menu",
  "settings",
  "misc",
]);

const deriveBackendUrl = (): string => {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (backend) return backend;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return "";
  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/api\/v1\/?$/i, "");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
};

// Base URL for stored objects (MinIO direct if configured, else backend /uploads proxy).
// Mirrors resolveFileBase() in api-base.ts without importing it.
const resolveFileBaseUrl = (): string => {
  const minioPublic = process.env.NEXT_PUBLIC_MINIO_PUBLIC_BASE_URL?.trim();
  if (minioPublic) return minioPublic.replace(/\/+$/, "");
  const backend = deriveBackendUrl().replace(/\/+$/, "");
  if (backend) return `${backend}/uploads`;
  return "/uploads";
};

const resolvedBackendHost = (() => {
  const raw = deriveBackendUrl();
  if (!raw) return { host: "", isHttps: false };
  try {
    const url = new URL(raw);
    return { host: url.host, isHttps: url.protocol === "https:" };
  } catch {
    return { host: "", isHttps: false };
  }
})();

export function shouldSkipImageOptimization(src: string): boolean {
  const trimmed = src.trim();
  if (LOCAL_IMAGE_PATTERN.test(trimmed)) return true;
  try {
    return SKIP_OPTIMIZATION_HOSTS.has(new URL(trimmed).hostname);
  } catch {
    return false;
  }
}

export function normalizeImageUrl(src: string): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;
  // Backend may return storage-relative paths ("/uploads/..." or bare object
  // keys like "banners/abc.webp"). Resolve them against the configured file
  // base so <img> doesn't request them from the web origin (which 404s).
  // Local web assets (/_next/..., /Inanh/..., /api/...) are left untouched.
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed) && !trimmed.startsWith("//") && !trimmed.startsWith("data:")) {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const firstSegment = path.split("/")[1]?.toLowerCase() ?? "";
    if (STORAGE_FOLDERS.has(firstSegment)) {
      const base = resolveFileBaseUrl();
      const objectKey = firstSegment === "uploads" ? path.slice("/uploads".length) : path;
      return `${base}${objectKey}`;
    }
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    const isBackendHost = resolvedBackendHost.host && url.host === resolvedBackendHost.host;
    const shouldUpgrade =
      (isBackendHost && resolvedBackendHost.isHttps && url.protocol === "http:") ||
      (!resolvedBackendHost.host && FALLBACK_HTTPS_HOSTS.has(url.host) && url.protocol === "http:");
    if (shouldUpgrade) {
      url.protocol = "https:";
      return url.toString();
    }
  } catch {
    // ignore invalid URLs
  }
  return trimmed;
}
