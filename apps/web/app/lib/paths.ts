export function normalizePath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) return "/";
  if (trimmed === "/") return "/";
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

function isAppNativePath(normalizedPath: string): boolean {
  return (
    normalizedPath === "/san-pham" ||
    normalizedPath.startsWith("/san-pham/") ||
    normalizedPath === "/admin" ||
    normalizedPath.startsWith("/admin/")
  );
}

export function stripHtmlSuffix(rawPath: string): string {
  const normalized = normalizePath(rawPath);
  if (normalized !== "/" && normalized.toLowerCase().endsWith(".html")) {
    const stripped = normalized.slice(0, -5);
    return stripped || "/";
  }
  return normalized;
}

export function toHtmlPath(rawPath: string): string {
  const normalized = stripHtmlSuffix(rawPath);
  if (normalized === "/") return "/";
  if (isAppNativePath(normalized)) return normalized;
  return `${normalized}.html`;
}
