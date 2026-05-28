"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ApiError, loginGoogle, loginUser } from "../../lib/customer-api";
import type { TokenResponse } from "../../lib/customer-api";
import { useToastMessages } from "../../components/ToastProvider";
import { useCustomerToken } from "../../lib/use-customer-token";

type RequireCustomerLoginProps = {
  children: ReactNode;
  loginPhoneEnabled?: boolean;
  loginGoogleEnabled?: boolean;
};

const TOKEN_STORAGE_KEY = "customerToken";

export default function RequireCustomerLogin({ children, loginPhoneEnabled = true, loginGoogleEnabled = true }: RequireCustomerLoginProps) {
  const { token, ready } = useCustomerToken();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const [googlePhone, setGooglePhone] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useToastMessages({ error, notice, setError, setNotice });

  const returnPath = useMemo(() => {
    const query = searchParams?.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParams]);

  const registerHref = `/dang-ky?return=${encodeURIComponent(returnPath)}`;

  useEffect(() => {
    if (token) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [token]);

  const persistToken = (result: TokenResponse) => {
    localStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ token: result.access_token, phone_verified: result.phone_verified })
    );
    window.dispatchEvent(new Event("storage"));
    setNotice("Đăng nhập thành công.");
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
        setError("Không thể đăng nhập lúc này.");
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
          const result = await loginGoogle(response.credential);
          persistToken(result);
        } catch (innerError) {
          if (innerError instanceof ApiError && innerError.status === 400 && innerError.message.includes("số điện thoại")) {
            setPendingGoogleCredential(response.credential);
            setError("");
          } else {
            setError(innerError instanceof Error ? innerError.message : "Đăng nhập Google thất bại.");
          }
        } finally {
          setGoogleLoading(false);
        }
      },
    });
    google.prompt();
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
      setError(err instanceof ApiError ? err.message : "Không thể đăng nhập Google lúc này.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      {children}
      {!ready && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 text-sm text-white">
          Đang kiểm tra đăng nhập...
        </div>
      )}
      {ready && !token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 px-4">
          <div className="w-full max-w-md rounded-[32px] border border-stone-200 bg-white/95 p-5 shadow-[0_30px_70px_rgba(0,0,0,0.2)]">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--text-soft,#4a4034)]">
                In ảnh 24h
              </p>
              <h3 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">
                Đăng nhập để tiếp tục
              </h3>
              <p className="text-xs text-[var(--text-soft,#4a4034)]">
                Đăng nhập để upload ảnh, theo dõi và quản lý đơn hàng.
              </p>
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
              </form>
            )}

            {loginGoogleEnabled && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className={`w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-70 ${loginPhoneEnabled ? "mt-2" : "mt-4"}`}
              >
                {googleLoading ? "Đang đăng nhập..." : "Đăng nhập bằng Google"}
              </button>
            )}

            {pendingGoogleCredential && (
              <form
                className="mt-3 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-soft,#4a4034)]">
              {loginPhoneEnabled && (
                <Link href={registerHref} className="font-semibold text-[var(--accent-strong,#8a4d1f)] underline">
                  Tạo tài khoản mới
                </Link>
              )}
              <Link href="/" className="underline">
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
