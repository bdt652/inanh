"use client";

import { useEffect, useMemo, useRef } from "react";

import { normalizeImageUrl } from "../lib/image";

type Props = {
  html: string;
  className?: string;
};

type Extracted = { styleContent: string; scriptBlocks: string[]; cleanHtml: string };

function extractAssets(html: string): Extracted {
  const styleBlocks: string[] = [];
  const scriptBlocks: string[] = [];

  let clean = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, c: string) => {
    styleBlocks.push(c);
    return "";
  });
  clean = clean.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, c: string) => {
    scriptBlocks.push(c);
    return "";
  });

  // Resolve storage-relative <img src> (e.g. "/uploads/..." or bare object
  // keys) to absolute file URLs — CMS content saved them as-is.
  clean = clean.replace(/<img\b[^>]*>/gi, (tag) =>
    tag.replace(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i, (attr, _raw, dquoted, squoted, bare) => {
      const original = dquoted ?? squoted ?? bare ?? "";
      const resolved = normalizeImageUrl(original);
      if (resolved === original) return attr;
      const quote = attr.includes('"') ? '"' : attr.includes("'") ? "'" : '"';
      return `src=${quote}${resolved}${quote}`;
    }),
  );

  return { styleContent: styleBlocks.join("\n"), scriptBlocks, cleanHtml: clean };
}

export default function RichContentRenderer({ html, className }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { styleContent, scriptBlocks, cleanHtml } = useMemo(() => extractAssets(html), [html]);

  // Backup: inject styles vào <head> qua DOM (phòng trường hợp React 19 không hoist <style> JSX element)
  useEffect(() => {
    if (!styleContent) return;
    const el = document.createElement("style");
    el.textContent = styleContent;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [styleContent]);

  // Execute extracted script blocks — scripts removed from cleanHtml to prevent hydration mismatch
  useEffect(() => {
    if (!scriptBlocks.length) return;
    scriptBlocks.forEach((src) => {
      const el = document.createElement("script");
      el.textContent = src;
      document.body.appendChild(el);
      el.remove();
    });
  }, [scriptBlocks]);

  return (
    <>
      {/* React 19 hoists <style> lên <head> — tránh React SSR strip style từ dangerouslySetInnerHTML */}
      {styleContent && <style dangerouslySetInnerHTML={{ __html: styleContent }} />}
      <div
        ref={containerRef}
        className={className}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    </>
  );
}
