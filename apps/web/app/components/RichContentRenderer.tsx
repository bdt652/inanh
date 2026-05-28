"use client";

import { useEffect, useMemo, useRef } from "react";

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
