"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ApiError, registerUser } from "../lib/customer-api";
import { useToastMessages } from "../components/ToastProvider";

export default function RegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useToastMessages({ error, notice, setError, setNotice });

  const returnPath = useMemo(() => {
    const raw = searchParams?.get("return")?.trim();
    if (!raw) return "/quan-ly-don-hang/cart";
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/quan-ly-don-hang/cart";
    if (raw.startsWith("/dang-ky") || raw.startsWith("/dang-nhap")) return "/quan-ly-don-hang/cart";
    return raw;
  }, [searchParams]);

  const closeHref = returnPath || "/";
  const loginHref = `/dang-nhap?return=${encodeURIComponent(returnPath)}`;

  const handleRegister = async () => {
    const cleanedPhone = phone.trim();
    const cleanedPassword = password.trim();
    if (!cleanedPhone || !cleanedPassword) {
      setError("Vui lòng điền số điện thoại và mật khẩu.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await registerUser(
        cleanedPhone,
        cleanedPassword,
        email.trim() || undefined,
        fullName.trim() || undefined,
        address.trim() || undefined
      );
      setNotice("Đăng ký thành công. Chuyển sang trang đăng nhập...");
      setTimeout(() => router.push(loginHref), 500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể đăng ký lúc này, vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[var(--surface-soft,#f8f3eb)] text-[var(--text-main,#1f1b16)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,228,191,0.7),transparent_55%),radial-gradient(circle_at_bottom,rgba(255,196,140,0.45),transparent_60%)]" />
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[32px] border border-stone-200 bg-white/95 p-6 shadow-[0_30px_70px_rgba(0,0,0,0.2)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--text-soft,#4a4034)]">In ảnh 24h</p>
              <h1 className="text-xl font-semibold text-[var(--text-main,#1f1b16)]">Tạo tài khoản</h1>
              <p className="mt-1 text-xs text-[var(--text-soft,#4a4034)]">
                Tạo tài khoản để lưu thông tin đơn hàng và upload ảnh nhanh.
              </p>
            </div>
            <Link
              href={closeHref}
              className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600"
            >
              Đóng
            </Link>
          </div>

          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!loading) {
                void handleRegister();
              }
            }}
          >
            <label className="grid gap-1 text-sm font-semibold text-[var(--text-soft,#4a4034)]">
              Số điện thoại
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09xx..."
                inputMode="tel"
                className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--text-soft,#4a4034)]">
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ít nhất 8 ký tự"
                className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--text-soft,#4a4034)]">
              Email (tùy chọn)
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--text-soft,#4a4034)]">
              Họ và tên (tùy chọn)
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nguyen Van A"
                className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--text-soft,#4a4034)]">
              Địa chỉ giao hàng (tùy chọn)
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                rows={2}
                className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-soft,#4a4034)]">
            <Link href={loginHref} className="font-semibold text-[var(--accent-strong,#8a4d1f)] underline">
              Đã có tài khoản? Đăng nhập
            </Link>
            <Link href={closeHref} className="underline">
              Về trang trước
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
