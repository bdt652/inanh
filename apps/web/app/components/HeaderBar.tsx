"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { getProfile, type UserProfile } from "../lib/customer-api";
import type { MenuItem } from "../lib/content";
import { useCustomerToken } from "../lib/use-customer-token";
import { toHtmlPath } from "../lib/paths";

type HeaderBarProps = {
  menuItems: MenuItem[];
  logoUrl?: string;
};

const STORAGE_KEY = "customerToken";

export default function HeaderBar({ menuItems, logoUrl }: HeaderBarProps) {
  const [hideSearch, setHideSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const lastScroll = useRef(0);
  const hideRef = useRef(false);
  const token = useCustomerToken();
  const [hydrated, setHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  useEffect(() => {
    setHydrated(true);
  }, []);
  const showAccountMenu = hydrated && Boolean(token);
  const authReady = hydrated;

  useEffect(() => {
    hideRef.current = hideSearch;
  }, [hideSearch]);

  useEffect(() => {
    const initialY = window.scrollY;
    const initialHidden = initialY > 110;

    queueMicrotask(() => {
      setHideSearch(initialHidden);
      setScrolled(initialY > 10);
      hideRef.current = initialHidden;
    });

    lastScroll.current = initialY;

    const handler = () => {
      const next = window.scrollY;
      const delta = next - lastScroll.current;
      if (Math.abs(delta) < 6) {
        lastScroll.current = next;
        return;
      }
      if (!hideRef.current && delta > 0 && next > 110) {
        setHideSearch(true);
        hideRef.current = true;
      }
      if (next < 80) {
        setHideSearch(false);
        hideRef.current = false;
      }
      setScrolled(next > 10);
      lastScroll.current = next;
    };

    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError("");
      return;
    }
    let active = true;
    setProfileLoading(true);
    setProfileError("");
    getProfile(token)
      .then((data) => {
        if (active) {
          setProfile(data);
        }
      })
      .catch((err) => {
        if (active) {
          setProfileError(err instanceof Error ? err.message : "Không thể tải thông tin tài khoản.");
        }
      })
      .finally(() => {
        if (active) {
          setProfileLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      router.push("/san-pham");
      return;
    }
    router.push(`/san-pham?q=${encodeURIComponent(normalized)}`);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("storage"));
    setMenuOpen(false);
    router.push("/dang-nhap");
  };

  const searchClass = hideSearch ? "header-search header-search--hidden" : "header-search";
  const accountLabel = profile?.phone || "Tài khoản";
  const accountSubtitle = profile?.email || "Chưa cập nhật";

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-sm">
      <div
        className={`border-b border-[var(--line)] px-4 py-2 md:px-8 transition-all duration-400 ease-in-out ${
          scrolled ? "shadow-[0_20px_45px_rgba(0,0,0,0.12)]" : ""
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link href="/" aria-label="Về trang chủ" className="inline-block">
            <img
              src={logoUrl || "/Inanh/logo_inanh24h.jpg"}
              alt="Logo Inanh24h"
              className="h-auto w-[150px] object-contain sm:w-[200px]"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)] md:text-base">
            {menuItems.map((item) => (
              <Link key={item.label} href={toHtmlPath(item.path)} className="hover:text-[var(--accent-strong)]">
                {item.label}
              </Link>
            ))}
            {!authReady ? (
              <div
                aria-hidden="true"
                className="h-10 w-[140px] rounded-full border border-[var(--line)] bg-white/70 shadow-sm"
              />
            ) : showAccountMenu ? (
              <div ref={menuRef} className="relative z-50">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)] shadow-sm transition hover:shadow-md"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.65rem] font-bold text-[var(--accent-strong)]">
                    KH
                  </span>
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[0.55rem] uppercase tracking-[0.24em] text-[var(--text-soft)]">Tài khoản</span>
                    <span className="text-sm font-semibold normal-case text-[var(--text-main)]">
                      {profileLoading ? "Đang tải..." : accountLabel}
                    </span>
                  </span>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-3 w-64 rounded-2xl border border-[var(--line)] bg-white/95 p-2 shadow-[0_18px_40px_rgba(0,0,0,0.15)] backdrop-blur-sm z-50"
                  >
                    <div className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-xs uppercase tracking-[0.24em] text-[var(--text-soft)]">
                      <p className="text-[0.7rem] font-semibold normal-case text-[var(--text-main)]">{accountLabel}</p>
                      <p className="mt-1 text-[0.65rem] normal-case text-[var(--text-soft)]">{accountSubtitle}</p>
                      {profileError && <p className="mt-1 text-[0.65rem] normal-case text-red-600">{profileError}</p>}
                    </div>
                    <div className="mt-2 grid gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                      <Link
                        href="/quan-ly-don-hang/cart"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-xl px-4 py-2 transition hover:bg-[var(--accent-soft)]/60"
                      >
                        Giỏ hàng
                      </Link>
                      <Link
                        href="/quan-ly-don-hang/orders"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-xl px-4 py-2 transition hover:bg-[var(--accent-soft)]/60"
                      >
                        Đơn hàng
                      </Link>
                      <Link
                        href="/quan-ly-don-hang/profile"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-xl px-4 py-2 transition hover:bg-[var(--accent-soft)]/60"
                      >
                        Thông tin cá nhân
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-xl px-4 py-2 text-left text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]/60"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={toHtmlPath("/dang-nhap")}
                className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm hover:brightness-110"
              >
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>

        <form className={`${searchClass} relative z-10`} aria-hidden={hideSearch} onSubmit={onSearchSubmit}>
          <label className="search-field">
            <span className="sr-only">Tìm kiếm sản phẩm</span>
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="text-[var(--accent-strong)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="6" />
              <path d="M17 17l4 4" />
            </svg>
            <input
              name="q"
              type="text"
              aria-label="Tìm kiếm sản phẩm"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full border-none bg-transparent text-xs outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <button className="cart-trigger" type="submit" aria-label="Tìm kiếm sản phẩm">
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="6" />
              <path d="M17 17l4 4" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
