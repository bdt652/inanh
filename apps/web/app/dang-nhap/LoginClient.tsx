"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ApiError, loginGoogle, loginUser } from "../lib/customer-api";
import type { TokenResponse } from "../lib/customer-api";
import { useToastMessages } from "../components/ToastProvider";

const TOKEN_STORAGE_KEY = "customerToken";

type Props = {
  loginPhoneEnabled?: boolean;
  loginGoogleEnabled?: boolean;
};

export default function LoginClient({ loginPhoneEnabled = true, loginGoogleEnabled = true }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonContainerRef = useRef<HTMLDivElement | null>(null);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const [googlePhone, setGooglePhone] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useToastMessages({ error, notice, setError, setNotice });

  const returnPath = useMemo(() => {
    const raw = searchParams?.get("return")?.trim();
    if (!raw) return "/quan-ly-don-hang/cart";
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/quan-ly-don-hang/cart";
    if (raw.startsWith("/dang-nhap")) return "/quan-ly-don-hang/cart";
    return raw;
  }, [searchParams]);

  const closeHref = returnPath || "/";

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { token: string };
        setToken(parsed.token);
        router.replace(returnPath);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  }, [router, returnPath]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const persistToken = (result: TokenResponse) => {
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ token: result.access_token, phone_verified: result.phone_verified })
    );
    setToken(result.access_token);
    setNotice("Đăng nhập thành công. Đang chuyển hướng...");
    router.push(returnPath);
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

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    setError("");
    try {
      const result = await loginGoogle(credential);
      persistToken(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.message.includes("số điện thoại")) {
        setPendingGoogleCredential(credential);
        setError("");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể đăng nhập Google lúc này, vui lòng thử lại sau.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Khởi tạo Google renderButton khi script load xong
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleReady || !clientId || !googleButtonContainerRef.current) return;
    // @ts-expect-error - google accounts script exposes this API
    const google = window.google?.accounts?.id;
    if (!google) return;
    google.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (response.credential) void handleGoogleCredential(response.credential);
      },
    });
    google.renderButton(googleButtonContainerRef.current, {
      type: "icon",
      theme: "outline",
      size: "large",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleReady]);

  const handleGoogleLogin = () => {
    setError("");
    setNotice("");
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleReady || !clientId) {
      setError("Google chưa sẵn sàng hoặc thiếu GOOGLE_CLIENT_ID.");
      return;
    }
    // Click vào Google button thật (tránh FedCM One Tap flow)
    const btn = googleButtonContainerRef.current?.querySelector<HTMLElement>("div[role=button]");
    if (btn) {
      btn.click();
    } else {
      setError("Không thể mở cửa sổ đăng nhập Google. Vui lòng thử lại.");
    }
  };

  const handleGoogleWithPhone = async () => {
    if (!pendingGoogleCredential) return;
    const cleaned = googlePhone.trim();
    if (!cleaned) {
      setError("Vui lòng nhập số điện thoại.");
      return;
    }
    setGoogleLoading(true);
    setError("");
    try {
      const result = await loginGoogle(pendingGoogleCredential, cleaned);
      setPendingGoogleCredential(null);
      persistToken(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Không thể đăng nhập Google lúc này, vui lòng thử lại sau.");
      }
    } finally {
      setGoogleLoading(false);
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
              <h1 className="text-xl font-semibold text-[var(--text-main,#1f1b16)]">Đăng nhập</h1>
              <p className="mt-1 text-xs text-[var(--text-soft,#4a4034)]">Đăng nhập để tiếp tục đặt hàng.</p>
            </div>
            <Link
              href={closeHref}
              className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600"
            >
              Đóng
            </Link>
          </div>

          {loginPhoneEnabled && (
            <form
              className="mt-4 space-y-3"
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
                  placeholder="Nhập mật khẩu"
                  className="rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>
          )}

          {loginGoogleEnabled && (
            <div className="mt-4 space-y-2">
              {/* Container ẩn để Google renderButton inject button thật — tránh FedCM One Tap */}
              <div ref={googleButtonContainerRef} className="hidden" aria-hidden="true" />
              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={googleLoading || !googleReady}
                className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {googleLoading ? "Đang kết nối Google..." : "Đăng nhập với Google"}
              </button>
            </div>
          )}

          {pendingGoogleCredential && (
            <form
              className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
              onSubmit={(e) => { e.preventDefault(); void handleGoogleWithPhone(); }}
            >
              <p className="text-sm font-semibold text-emerald-800">
                Lần đầu đăng nhập Google — nhập số điện thoại để liên kết tài khoản:
              </p>
              <label className="grid gap-1 text-sm font-semibold text-stone-700">
                Số điện thoại
                <input
                  value={googlePhone}
                  onChange={(e) => setGooglePhone(e.target.value)}
                  placeholder="09xx..."
                  inputMode="tel"
                  autoFocus
                  className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm shadow-inner transition focus:border-[var(--accent,#b46a2f)] focus:outline-none"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={googleLoading}
                  className="flex-1 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                >
                  {googleLoading ? "Đang xử lý..." : "Xác nhận"}
                </button>
                <button
                  type="button"
                  onClick={() => { setPendingGoogleCredential(null); setGooglePhone(""); }}
                  className="rounded-2xl border border-stone-300 px-4 py-2 text-sm text-stone-600"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}

          {!loginPhoneEnabled && !loginGoogleEnabled && (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-700">
              Đăng nhập tạm thời bị tắt. Vui lòng liên hệ quản trị viên.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-soft,#4a4034)]">
            {loginPhoneEnabled && (
              <Link href={`/dang-ky?return=${encodeURIComponent(returnPath)}`} className="font-semibold text-[var(--accent-strong,#8a4d1f)] underline">
                Chưa có tài khoản? Đăng ký
              </Link>
            )}
            <Link href={closeHref} className="underline">
              Về trang trước
            </Link>
          </div>

          {token && (
            <p className="mt-4 text-center text-xs text-[var(--text-soft,#4a4034)]">Đã đăng nhập. Đang chuyển hướng...</p>
          )}
        </div>
      </div>
    </main>
  );
}
