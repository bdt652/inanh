"use client";

import { useEffect, useMemo, useState } from "react";

type ShareActionsProps = {
  url: string;
  title: string;
  description?: string;
  className?: string;
};

type ShareLink = {
  id: string;
  label: string;
  href: string;
  ariaLabel: string;
};

function normalizeText(value?: string): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function buildShareText(title: string, description?: string): string {
  const cleanDescription = normalizeText(description);
  if (!cleanDescription) return title;
  if (cleanDescription.length <= 140) return `${title} - ${cleanDescription}`;
  return `${title} - ${cleanDescription.slice(0, 137).trimEnd()}...`;
}

function buildShareLinks(url: string, title: string, description?: string): ShareLink[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const shareText = buildShareText(title, description);
  const encodedText = encodeURIComponent(shareText);

  return [
    {
      id: "zalo",
      label: "Zalo",
      href: `https://zalo.me/share?url=${encodedUrl}&title=${encodedTitle}`,
      ariaLabel: "Chia sẻ qua Zalo",
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      ariaLabel: "Chia sẻ qua Facebook",
    },
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      ariaLabel: "Chia sẻ qua X",
    },
    {
      id: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      ariaLabel: "Chia sẻ qua Telegram",
    },
    {
      id: "email",
      label: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A${encodedUrl}`,
      ariaLabel: "Chia sẻ qua Email",
    },
  ];
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  return success;
}

export default function ShareActions({ url, title, description, className }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const shareLinks = useMemo(() => buildShareLinks(url, title, description), [url, title, description]);
  const shareText = buildShareText(title, description);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    setCopied(ok);
    if (ok) {
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) return;
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // Ignore user-cancelled share.
    }
  };

  return (
    <div className={["mt-4 space-y-3", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">Chia sẻ</p>
        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="ghost-button rounded-none px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
          >
            Chia sẻ nhanh
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            aria-label={link.ariaLabel}
            className="ghost-button rounded-none px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
          >
            {link.label}
          </a>
        ))}
        <button
          type="button"
          onClick={handleCopy}
          className="ghost-button rounded-none px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
        >
          {copied ? "Đã sao chép" : "Sao chép link"}
        </button>
      </div>
    </div>
  );
}
