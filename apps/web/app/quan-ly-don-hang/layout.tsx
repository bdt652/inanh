import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import DashboardNav from "../components/DashboardNav";
import HeaderBar from "../components/HeaderBar";
import RequireCustomerLogin from "./components/RequireCustomerLogin";
import { getMenuItems, getSiteSettings } from "../lib/api";

export const metadata: Metadata = {
  title: "Quản lý đơn hàng | In ảnh 24h",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [menuItems, siteSettings] = await Promise.all([
    safe(getMenuItems, []),
    safe(getSiteSettings, null),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)]" />}>
      <RequireCustomerLogin>
        <div className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)] text-[var(--text-main,#1f1b16)]">
          <HeaderBar menuItems={menuItems} logoUrl={siteSettings?.logo_url} />

        <main className="w-full">
          <section className="w-full px-4 pb-10 pt-6 md:px-8 lg:px-10">
            <div className="grid w-full gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="md:sticky md:top-6">
                <DashboardNav />
              </div>
              <div className="space-y-6 bg-white/0">
                {children}
              </div>
            </div>
          </section>
        </main>
        </div>
      </RequireCustomerLogin>
    </Suspense>
  );
}
