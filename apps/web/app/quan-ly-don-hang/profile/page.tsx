"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getProfile, type UserProfile } from "../../lib/customer-api";
import { useCustomerToken } from "../../lib/use-customer-token";

export default function ProfilePage() {
  const token = useCustomerToken();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      queueMicrotask(() => {
        setProfile(null);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => setLoading(true));
    queueMicrotask(() => setError(""));
    getProfile(token)
      .then((data) => setProfile(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải thông tin tài khoản."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="rounded-3xl border border-[var(--line,#e5e0d8)] bg-white/90 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">Thông tin cá nhân</p>
          <h2 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">Hồ sơ khách hàng</h2>
        </div>
        {loading && <span className="text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">Đang tải...</span>}
      </div>

      {token ? (
        profile ? (
          <div className="mt-6 space-y-3 text-sm text-[var(--text-soft,#4a4034)]">
            <p>
              <span className="font-semibold text-[var(--text-main,#1f1b16)]">Số điện thoại:</span> {profile.phone}
            </p>
            <p>
              <span className="font-semibold text-[var(--text-main,#1f1b16)]">Email:</span>{" "}
              {profile.email || "Chưa đăng ký"}
            </p>
            <p>
              Bạn có thể cập nhật yêu cầu đổi thông tin qua đội ngũ hỗ trợ để giữ đúng hồ sơ in.
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--text-soft,#4a4034)]">Đang tải thông tin khách hàng...</p>
        )
      ) : (
        <p className="mt-6 text-sm text-[var(--text-soft,#4a4034)]">
          Đăng nhập để xem hồ sơ của bạn.{" "}
          <Link href="/dang-nhap" className="font-semibold text-[var(--accent-strong,#8a4d1f)] underline">
            Đăng nhập
          </Link>
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
