"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getProfile, updateProfile, type UserProfile } from "../../lib/customer-api";
import { useCustomerToken } from "../../lib/use-customer-token";
import { useToastMessages } from "../../components/ToastProvider";

export default function ProfilePage() {
  const { token } = useCustomerToken();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  useToastMessages({ error, notice, setError, setNotice });

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
      .then((data) => {
        setProfile(data);
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        setAddress(data.address || "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải thông tin tài khoản."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateProfile(token, {
        full_name: fullName.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      setProfile(updated);
      setFullName(updated.full_name || "");
      setEmail(updated.email || "");
      setAddress(updated.address || "");
      setNotice("Đã cập nhật thông tin.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật thông tin lúc này.");
    } finally {
      setSaving(false);
    }
  };

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

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft,#4a4034)]">
                Thông tin cơ bản
              </p>
              <p className="mt-2 text-sm text-[var(--text-soft,#4a4034)]">
                <span className="font-semibold text-[var(--text-main,#1f1b16)]">Số điện thoại:</span> {profile.phone}
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft,#4a4034)]">
                Cập nhật thông tin giao hàng
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Ho va ten
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-stone-700 md:col-span-2">
                Địa chỉ giao hàng
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    rows={2}
                    className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner focus:border-[var(--accent,#b46a2f)] focus:outline-none"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-4 rounded-2xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Đang lưu..." : "Lưu thông tin"}
              </button>
            </div>
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

    </div>
  );
}
