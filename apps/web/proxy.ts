import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const EXCLUDED_PATH_PREFIXES = ["/_next", "/api"];
const EXCLUDED_PATHS = new Set(["/", "/robots.txt", "/sitemap.xml", "/favicon.ico"]);

function normalizePathname(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function hasFileExtension(pathname: string): boolean {
  const lastSegment = pathname.split("/").pop() ?? "";
  return lastSegment.includes(".");
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = normalizePathname(url.pathname);

  if (EXCLUDED_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (pathname.endsWith(".html")) {
    const rewritten = url.clone();
    rewritten.pathname = normalizePathname(pathname.slice(0, -5));
    return NextResponse.rewrite(rewritten);
  }

  if (hasFileExtension(pathname)) {
    return NextResponse.next();
  }

  const redirected = url.clone();
  redirected.pathname = `${pathname}.html`;
  return NextResponse.redirect(redirected, 308);
}
