"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { MenuItem } from "../lib/content";
import { toHtmlPath } from "../lib/paths";

type HeaderBarProps = {
  menuItems: MenuItem[];
  logoUrl?: string;
};

export default function HeaderBar({ menuItems, logoUrl }: HeaderBarProps) {
  const [hideSearch, setHideSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const lastScroll = useRef(0);
  const hideRef = useRef(false);

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

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      router.push("/san-pham");
      return;
    }
    router.push(`/san-pham?q=${encodeURIComponent(normalized)}`);
  };

  const searchClass = hideSearch ? "header-search header-search--hidden" : "header-search";

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
          </nav>
        </div>

        <form className={searchClass} aria-hidden={hideSearch} onSubmit={onSearchSubmit}>
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
