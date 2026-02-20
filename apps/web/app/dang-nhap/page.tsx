"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, loginGoogle, loginUser } from "../lib/customer-api";
import type { TokenResponse } from "../lib/customer-api";

const TOKEN_STORAGE_KEY = "customerToken";
const ZALO_URL = "https://zalo.me/0877226644";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { token: string };
        setToken(parsed.token);
        router.push("/quan-ly-don-hang/cart");
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  }, [router]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const persistToken = (result: TokenResponse) => {
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ token: result.access_token, phone_verified: result.phone_verified })
    );
    setToken(result.access_token);
    setNotice("Đăng nhập thành công. Đang chuyển hướng...");
    router.push("/quan-ly-don-hang/cart");
  };

  const handleAuth = async () => {
    const cleanedPhone = phone.trim();
    const cleanedPassword = password.trim();
    if (!cleanedPhone || !cleanedPassword) {
      setError("Vui lòng nhập số điện thoại và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await loginUser(cleanedPhone, cleanedPassword);
      persistToken(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể đăng nhập lúc này, vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setNotice("");
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleReady || !clientId) {
      setError("Google chưa sẵn sàng hoặc thiếu GOOGLE_CLIENT_ID.");
      return;
    }
    // @ts-expect-error - google accounts script exposes this API
    const google = window.google?.accounts?.id;
    if (!google) {
      setError("Không thể khởi tạo Google ID.");
      return;
    }
    setGoogleLoading(true);
    google.initialize({
      client_id: clientId,
      callback: async (response: { credential?: string }) => {
        if (!response.credential) {
          setError("Không lấy được token Google.");
          setGoogleLoading(false);
          return;
        }
        try {
          const result = await loginGoogle(response.credential, phone.trim() || undefined);
          persistToken(result);
        } catch (innerError) {
          setError(innerError instanceof Error ? innerError.message : "Google login thất bại.");
        } finally {
          setGoogleLoading(false);
        }
      },
    });
    google.prompt();
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setNotice("");
  };

  return (
    <main className="min-h-screen w-full bg-[var(--surface-soft,#f8f3eb)] text-[var(--text-main,#1f1b16)]">
      <section className="w-full bg-gradient-to-r from-[#fff4e3] via-[#ffd5a8] to-white px-4 py-12 shadow-[0_20px_45px_rgba(0,0,0,0.12)] md:px-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--text-soft,#4a4034)]">In ảnh 24h</p>
            <h1 className="text-3xl font-bold leading-tight md:text-4xl">
              Đăng nhập để đặt in ảnh và quản lý đơn hàng số lượng lớn.
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-soft,#4a4034)]">
              Hệ thống lưu hồ sơ upload, ghi chú kỹ thuật và trạng thái xử lý rõ ràng. Mọi khách hàng đăng nhập đều được ưu tiên hỗ trợ và báo giá nhanh.
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
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft,#4a4034)]">Đăng nhập tài khoản</p>
              <h2 className="text-2xl font-bold text-[var(--text-main,#1f1b16)]">Quản lý đơn hàng và gửi file ngay</h2>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-soft,#4a4034)]">
              Chưa có tài khoản?{" "}
              <Link href="/dang-ky" className="text-[var(--accent-strong,#8a4d1f)] underline">
                Đăng ký tại đây
              </Link>
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!loading) {
                void handleAuth();
              }
            }}
          >
            <label className="grid gap-1 text-sm font-semibold text-[var(--text-soft,#4a4034)]">
              Số điện thoại
              <input
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09xx..."
                inputMode="tel"
                autoComplete="tel"
                className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-[var(--text-soft,#4a4034)]">
              Mật khẩu
              <input
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ít nhất 8 ký tự"
                autoComplete="current-password"
                className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {googleLoading ? "Đang đăng nhập..." : "Đăng nhập bằng Google"}
            </button>
          </form>

          {token && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              Đã đăng nhập. Bạn sẽ được chuyển sang trang quản lý đơn hàng ngay lập tức.
              <button type="button" className="underline" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          )}

          {notice && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>
          )}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="text-xs text-[var(--text-soft,#4a4034)]">
            <p className="mb-1">
              Chưa định hình ý tưởng? Gửi ngay yêu cầu lên hệ qua{" "}
              <a href={ZALO_URL} target="_blank" rel="noreferrer" className="font-semibold underline">
                Zalo
              </a>{" "}
              để nhận báo giá nhanh.
            </p>
            <p>Đăng nhập giúp bạn giữ nguyên màu gốc, lưu thông tin kỹ thuật và theo dõi trạng thái đơn.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
