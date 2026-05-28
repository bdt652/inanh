import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";
import { getSiteSettings } from "../lib/api";

export const metadata: Metadata = {
  title: "Đăng nhập | In ảnh 24h",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default async function LoginPage() {
  let loginPhoneEnabled = true;
  let loginGoogleEnabled = true;
  try {
    const settings = await getSiteSettings();
    loginPhoneEnabled = settings?.login_phone_enabled ?? true;
    loginGoogleEnabled = settings?.login_google_enabled ?? true;
  } catch {
    // fallback: both enabled
  }

  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)]" />}>
      <LoginClient loginPhoneEnabled={loginPhoneEnabled} loginGoogleEnabled={loginGoogleEnabled} />
    </Suspense>
  );
}
