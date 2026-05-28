import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterClient from "./RegisterClient";
import { getSiteSettings } from "../lib/api";

export const metadata: Metadata = {
  title: "Đăng ký | In ảnh 24h",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default async function RegisterPage() {
  let loginPhoneEnabled = true;
  try {
    const settings = await getSiteSettings();
    loginPhoneEnabled = settings?.login_phone_enabled ?? true;
  } catch {
    // fallback: enabled
  }

  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)]" />}>
      <RegisterClient loginPhoneEnabled={loginPhoneEnabled} />
    </Suspense>
  );
}
