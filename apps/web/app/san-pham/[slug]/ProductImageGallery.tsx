"use client";

import { useEffect, useMemo, useState } from "react";

type ProductImageGalleryProps = {
  productName: string;
  images: string[];
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

export default function ProductImageGallery({ productName, images }: ProductImageGalleryProps) {
  const normalizedImages = useMemo(() => images.filter((item) => item.trim().length > 0), [images]);
  const [activeImage, setActiveImage] = useState("");
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(MIN_ZOOM);

  useEffect(() => {
    if (!isZoomOpen) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsZoomOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isZoomOpen]);

  const resolvedActiveImage =
    activeImage && normalizedImages.includes(activeImage) ? activeImage : (normalizedImages[0] ?? "");

  return (
    <section className="space-y-3">
      {resolvedActiveImage ? (
        <button
          type="button"
          onClick={() => {
            setZoomLevel(MIN_ZOOM);
            setIsZoomOpen(true);
          }}
          className="group relative block w-full overflow-hidden rounded-none border border-[var(--line)] bg-white text-left"
          aria-label="Phóng to ảnh sản phẩm"
        >
          <img
            src={resolvedActiveImage}
            alt={productName}
            className="h-[58vw] max-h-[760px] min-h-[320px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-3 right-3 rounded-none bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white">
            Nhấn để phóng to
          </span>
        </button>
      ) : (
        <div className="h-[58vw] max-h-[760px] min-h-[320px] rounded-none border border-[var(--line)] bg-gradient-to-br from-[#f5d8b2] via-[#e9bd8e] to-[#d99f69]" />
      )}

      {normalizedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {normalizedImages.map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => setActiveImage(imageUrl)}
              className={`shrink-0 overflow-hidden rounded-none border bg-white ${
                imageUrl === resolvedActiveImage ? "border-[var(--accent-strong)]" : "border-[var(--line)]"
              }`}
              aria-label={`Xem ảnh ${index + 1}`}
            >
              <img src={imageUrl} alt={`${productName} - ảnh ${index + 1}`} className="h-20 w-24 object-cover md:h-24 md:w-32" />
            </button>
          ))}
        </div>
      )}

      {isZoomOpen && resolvedActiveImage && (
        <div className="fixed inset-0 z-[120] bg-black/90 p-4" onClick={() => setIsZoomOpen(false)}>
          <div className="flex h-full w-full flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-none border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10"
                  onClick={() => setZoomLevel((prev) => clampZoom(prev - ZOOM_STEP))}
                  disabled={zoomLevel <= MIN_ZOOM}
                >
                  Thu nhỏ
                </button>
                <button
                  type="button"
                  className="rounded-none border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10"
                  onClick={() => setZoomLevel(MIN_ZOOM)}
                >
                  Mặc định
                </button>
                <button
                  type="button"
                  className="rounded-none border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10"
                  onClick={() => setZoomLevel((prev) => clampZoom(prev + ZOOM_STEP))}
                  disabled={zoomLevel >= MAX_ZOOM}
                >
                  Phóng to
                </button>
              </div>
              <button
                type="button"
                className="rounded-none border border-white/30 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-white/10"
                onClick={() => setIsZoomOpen(false)}
              >
                Đóng
              </button>
            </div>

            <div className="relative flex-1 overflow-auto">
              <img
                src={resolvedActiveImage}
                alt={productName}
                className="mx-auto block max-h-none max-w-none object-contain"
                style={{
                  width: `${zoomLevel * 100}%`,
                  maxWidth: "none",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
