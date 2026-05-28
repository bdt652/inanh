const LOCAL_IMAGE_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0|host\.docker\.internal)(?::\d+)?\//i;
const SKIP_OPTIMIZATION_HOSTS = new Set<string>();
const FALLBACK_HTTPS_HOSTS = new Set(["api.inanh24h.com", "inanh24h.com", "www.inanh24h.com"]);

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
