"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Banner } from "../lib/content";
import { normalizeImageUrl, shouldSkipImageOptimization } from "../lib/image";

type BannerSliderProps = {
  slides: Banner[];
};

const SWIPE_THRESHOLD_PX = 60;
const MAX_DRAG_FEEDBACK_PX = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function BannerSlider({ slides }: BannerSliderProps) {
  const [index, setIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);

  const goNext = () => {
    setIndex((prev) => (prev + 1) % slides.length);
  };

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (slides.length <= 1 || isDragging) {
      return;
    }

    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(id);
  }, [slides.length, isDragging]);

  if (slides.length === 0) {
    return null;
  }

  const activeIndex = index % slides.length;
  const normalizedSlides = slides.map((slide) => ({
    ...slide,
    img: normalizeImageUrl(slide.img),
  }));

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (slides.length <= 1) return;
    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    setDragOffset(0);
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;
    setDragOffset(event.clientX - startXRef.current);
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;

    const delta = event.clientX - startXRef.current;
    if (delta <= -SWIPE_THRESHOLD_PX) goNext();
    if (delta >= SWIPE_THRESHOLD_PX) goPrev();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    pointerIdRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <section className="w-full overflow-hidden">
      <div
        className="relative w-full touch-pan-y select-none overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ aspectRatio: "999 / 380" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        {normalizedSlides.map((slide, slideIndex) => (
          <div
            key={`${slide.img}-${slideIndex}`}
            className={`absolute inset-0 transition-[opacity,transform] duration-500 ${
              slideIndex === activeIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{
              transform:
                slideIndex === activeIndex && isDragging
                  ? `translateX(${clamp(dragOffset * 0.18, -MAX_DRAG_FEEDBACK_PX, MAX_DRAG_FEEDBACK_PX)}px)`
                  : "translateX(0)",
            }}
          >
            <Image
              src={slide.img}
              alt={slide.alt}
              fill
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="object-cover"
              priority={slideIndex === 0}
              fetchPriority={slideIndex === 0 ? "high" : "auto"}
              loading={slideIndex === 0 ? "eager" : "lazy"}
              unoptimized={shouldSkipImageOptimization(slide.img)}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
