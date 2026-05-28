import { NextResponse } from "next/server";

export function GET() {
  return new NextResponse("google-site-verification: google286cec79b1ba2250.html", {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
