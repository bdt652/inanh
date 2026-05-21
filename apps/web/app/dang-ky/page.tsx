import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Đăng ký | In ảnh 24h",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)]" />}>
      <RegisterClient />
    </Suspense>
  );
}
