"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getProfile, type UserProfile } from "../lib/customer-api";
import { useCustomerToken } from "../lib/use-customer-token";

const STORAGE_KEY = "customerToken";

export default function AccountStatusCard() {
  const router = useRouter();
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

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
    router.push("/dang-nhap");
  };

  return (
    <div className="flex w-full max-w-[200px] flex-col gap-1 rounded-2xl bg-white/70 px-3 py-2 text-[0.55rem] uppercase tracking-[0.35em] text-[var(--text-soft,#4a4034)] shadow-lg sm:w-auto">
      {loading && <p className="text-[0.6rem]">Đang tải...</p>}
      {profile && (
        <div className="space-y-0 text-[0.65rem] leading-tight text-[var(--text-main,#1f1b16)]">
          <p>SĐT: {profile.phone}</p>
          <p>Email: {profile.email || "Chưa cập nhật"}</p>
        </div>
      )}
      {!profile && !loading && (
        <p className="text-[0.6rem]">
          Chưa đăng nhập.{" "}
          <Link href="/dang-nhap" className="font-semibold text-[var(--accent-strong,#8a4d1f)] underline">
            Đăng nhập
          </Link>
        </p>
      )}
      {error && <p className="text-[0.6rem] text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleLogout}
        className="text-[0.6rem] font-semibold tracking-[0.4em] text-[var(--accent-strong,#8a4d1f)] underline"
      >
        Đăng xuất
      </button>
    </div>
  );
}
