import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Đăng nhập | In ảnh 24h",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)]" />}>
      <LoginClient />
    </Suspense>
  );
}
