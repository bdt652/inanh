"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, registerUser } from "../lib/customer-api";

const ZALO_URL = "https://zalo.me/0877226644";

export default function RegisterPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      await registerUser(cleanedPhone, cleanedPassword, email.trim() || undefined);
      setNotice("Đăng ký thành công. Chuyển sang trang đăng nhập để tiếp tục.");
      setTimeout(() => router.push("/dang-nhap"), 900);
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
    <main className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)] text-[var(--text-main,#1f1b16)]">
      <section className="w-full bg-gradient-to-r from-[#fff4e3] via-[#ffd5a8] to-white px-4 py-12 shadow-[0_20px_45px_rgba(0,0,0,0.12)] md:px-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--text-soft,#4a4034)]">In ảnh 24h</p>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">
              Đăng ký tài khoản để gửi file ảnh, theo dõi đơn và nhận báo giá nhanh.
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-soft,#4a4034)]">
              Không cần xác thực OTP ngay, chỉ cần số điện thoại và mật khẩu để bắt đầu. Hệ thống vẫn lưu lại định dạng gốc và tự động tính tiền dựa trên số lượng.
            </p>
          </div>
          <a
            href={ZALO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent-strong,#8a4d1f)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-white shadow-lg transition hover:brightness-110"
          >
            Liên hệ báo giá
          </a>
        </div>
      </section>

      <section className="w-full px-4 py-10 md:px-12">
        <div className="mx-auto grid w-full max-w-4xl gap-6 rounded-[32px] border border-[var(--line,#d8cec2)] bg-white/95 p-8 shadow-lg">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft,#4a4034)]">Đăng ký thành viên</p>
              <h2 className="text-2xl font-bold text-[var(--text-main,#1f1b16)]">Tạo tài khoản in ảnh không giới hạn</h2>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft,#4a4034)]">
              Đã có tài khoản?{" "}
              <Link href="/dang-nhap" className="text-[var(--accent-strong,#8a4d1f)] underline">
                Đăng nhập ngay
              </Link>
            </p>
          </div>

          <div className="space-y-4">
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
            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="w-full rounded-2xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
            </button>
          </div>

          {notice && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
          )}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <p className="text-xs text-[var(--text-soft,#4a4034)]">
            Tài khoản của bạn cho phép tạo đơn hàng, upload ảnh nguyên gốc và theo dõi tiến độ in. Nếu cần hỗ trợ kỹ thuật vui lòng liên hệ{" "}
            <a href={ZALO_URL} target="_blank" rel="noreferrer" className="font-semibold underline">
              Zalo
            </a>{" "}
            hoặc gọi hotline 0877.22.66.44.
          </p>
        </div>
      </section>
    </main>
  );
}
