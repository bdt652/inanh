"use client";

import Link from "next/link";

export default function AdminNeedLogin() {
  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-stone-900">Bạn chưa đăng nhập.</p>
        <p className="mt-2 text-sm text-stone-500">
          Hãy quay lại <Link href="/admin" className="font-semibold text-emerald-700">trang quản trị</Link> để đăng nhập.
        </p>
      </div>
    </div>
  );
}
