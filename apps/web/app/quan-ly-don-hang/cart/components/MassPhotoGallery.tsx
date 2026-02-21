"use client";
/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useMemo,
  useRef,
  useReducer,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";

type GalleryPhoto = {
  id: string;
  name: string;
  url: string;
  size?: number;
  status?: "uploading" | "ready" | "duplicate" | "error";
  key?: string;
  uploadError?: string;
};

type GalleryLimits = {
  maxFiles?: number;
  maxBytes?: number;
};

type MassPhotoGalleryProps = {
  title: string;
  summary?: string;
  photos: GalleryPhoto[];
  onAddFiles: (files: File[]) => void;
  onRemovePhoto: (photoId: string) => void;
  limits?: GalleryLimits;
};

const CHUNK_SIZE = 60;

type VisibleAction = { type: "reset" } | { type: "increase"; max: number };

const visibleCountReducer = (state: number, action: VisibleAction): number => {
  switch (action.type) {
    case "reset":
      return CHUNK_SIZE;
    case "increase":
      return Math.min(action.max, state + CHUNK_SIZE);
    default:
      return state;
  }
};

const formatBytes = (value: number) => {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let current = value;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${current.toFixed(1)} ${units[index]}`;
};

export default function MassPhotoGallery({
  title,
  summary,
  photos,
  onAddFiles,
  onRemovePhoto,
  limits,
}: MassPhotoGalleryProps) {
  const [visibleCount, dispatchVisibleCount] = useReducer(visibleCountReducer, CHUNK_SIZE);
  const [isDragActive, setIsDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "duplicates" | "new">("all");
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    dispatchVisibleCount({ type: "reset" });
  }, [photos.length]);

  const totalBytes = useMemo(() => photos.reduce((sum, photo) => sum + (photo.size ?? 0), 0), [photos]);
  const duplicatePhotos = useMemo(() => photos.filter((photo) => photo.status === "duplicate"), [photos]);

  const filteredPhotos = useMemo(() => {
    if (filter === "duplicates") return duplicatePhotos;
    if (filter === "new") return photos.filter((photo) => photo.status !== "duplicate");
    return photos;
  }, [filter, duplicatePhotos, photos]);

  const visiblePhotos = filteredPhotos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPhotos.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && visibleCount < filteredPhotos.length) {
            dispatchVisibleCount({ type: "increase", max: filteredPhotos.length });
          }
        });
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredPhotos.length]);

  useEffect(() => {
    dispatchVisibleCount({ type: "reset" });
  }, [filter]);

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (files && files.length) {
      onAddFiles(Array.from(files));
    }
    event.currentTarget.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    onAddFiles(Array.from(event.dataTransfer.files));
  };

  const summaryNotice = summary || "Tải ảnh nguyên gốc, hệ thống giữ metadata để bạn kiểm tra.";

  const statusLabelMap: Record<NonNullable<GalleryPhoto["status"]>, string> = {
    uploading: "Đang upload",
    ready: "Đã upload",
    duplicate: "Trùng",
    error: "Lỗi",
  };

  const statusClassMap: Record<NonNullable<GalleryPhoto["status"]>, string> = {
    uploading: "border-yellow-400 text-yellow-700",
    ready: "border-emerald-400 text-emerald-700",
    duplicate: "border-stone-300 text-stone-500",
    error: "border-red-400 text-red-700",
  };

  return (
    <div className="grid gap-6 rounded-[32px] border border-[var(--line,#e5e0d8)] bg-white/90 p-6 shadow-lg lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr]">
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">{title}</p>
          <h3 className="text-2xl font-bold text-[var(--text-main,#1f1b16)]">Ảnh đã upload</h3>
          <p className="text-sm text-[var(--text-soft,#4a4034)]">{summaryNotice}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
          {[
            { id: "all", label: "Tất cả" },
            { id: "duplicates", label: `Trùng (${duplicatePhotos.length})` },
            { id: "new", label: `Mới (${photos.length - duplicatePhotos.length})` },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id as "all" | "duplicates" | "new")}
              className={`rounded-full border px-3 py-1 transition ${
                filter === option.id
                  ? "border-[var(--accent,#b46a2f)] bg-[var(--accent,#b46a2f)]/10 text-[var(--text-main,#1f1b16)] shadow-inner"
                  : "border-stone-200 bg-white hover:border-[var(--accent,#b46a2f)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-[0.65rem] tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded-full border px-3 py-1 transition ${viewMode === "grid" ? "border-[var(--accent,#b46a2f)] text-[var(--text-main,#1f1b16)]" : "border-stone-200 text-[var(--text-soft,#4a4034)]"}`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded-full border px-3 py-1 transition ${viewMode === "list" ? "border-[var(--accent,#b46a2f)] text-[var(--text-main,#1f1b16)]" : "border-stone-200 text-[var(--text-soft,#4a4034)]"}`}
            >
              List
            </button>
          </div>
          <p className="text-[0.7rem]">{filteredPhotos.length} ảnh</p>
        </div>

        <div className="divide-y divide-[var(--line,#e5e0d8)] space-y-4 text-sm text-[var(--text-soft,#4a4034)]">
          <div className="flex items-center justify-between">
            <span>Số ảnh</span>
            <span className="font-semibold text-[var(--text-main,#1f1b16)]">{photos.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Ước lượng dung lượng</span>
            <span className="font-semibold text-[var(--text-main,#1f1b16)]">{formatBytes(totalBytes)}</span>
          </div>
          {limits?.maxFiles && (
            <div className="flex items-center justify-between">
              <span>Giới hạn ảnh</span>
              <span className="font-semibold text-[var(--text-main,#1f1b16)]">
                {photos.length}/{limits.maxFiles}
              </span>
            </div>
          )}
          {limits?.maxBytes && (
            <div className="flex items-center justify-between">
              <span>Giới hạn dung lượng</span>
              <span className="font-semibold text-[var(--text-main,#1f1b16)]">
                {formatBytes(limits.maxBytes)}
              </span>
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl border border-dashed px-4 py-5 text-sm transition ${
            isDragActive
              ? "border-[var(--accent-strong,#8a4d1f)] bg-[var(--accent,#b46a2f)]/5"
              : "border-stone-200 bg-stone-50"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
        >
          <p className="font-semibold text-[var(--text-main,#1f1b16)]">
            Kéo thả ảnh hoặc{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-[var(--accent-strong,#8a4d1f)] underline"
            >
              chọn từ máy
            </button>
          </p>
          <p className="text-xs text-[var(--text-soft,#4a4034)]">Hỗ trợ hàng nghìn ảnh, hệ thống xử lý từng batch.</p>
        </div>
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
          <span>Preview gallery</span>
          <span>{visiblePhotos.length}/{photos.length}</span>
        </div>
        {viewMode === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visiblePhotos.map((photo, index) => (
              <article
                key={photo.id}
                onClick={() => setLightbox(photo)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-[var(--accent,#b46a2f)]"
              >
                <img src={photo.url} alt={photo.name} className="h-28 w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-[0.65rem] font-semibold text-[var(--text-main,#1f1b16)]">
                    {index + 1}. {photo.name}
                  </p>
                  {photo.status && (
                    <span
                      className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[0.55rem] tracking-[0.08em] ${statusClassMap[photo.status]}`}
                    >
                      {photo.status === "uploading" ? "⏳ " : ""}
                      {statusLabelMap[photo.status]}
                    </span>
                  )}
                  <p className="text-[0.55rem] text-[var(--text-soft,#4a4034)]">{photo.size ? formatBytes(photo.size) : "Không rõ dung lượng"}</p>
                  {photo.uploadError && (
                    <p className="text-[0.55rem] text-red-600">{photo.uploadError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemovePhoto(photo.id);
                  }}
                  className="absolute right-2 top-2 hidden rounded-full bg-black/50 px-2 py-1 text-[0.55rem] text-white transition group-hover:block"
                >
                  Xóa
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {visiblePhotos.map((photo, index) => (
              <div
                key={photo.id}
                onClick={() => setLightbox(photo)}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-[var(--accent,#b46a2f)]"
              >
                <div>
                  <p className="text-[0.75rem] font-semibold text-[var(--text-main,#1f1b16)]">
                    {index + 1}. {photo.name}
                  </p>
                  <p className="text-[0.65rem] text-[var(--text-soft,#4a4034)]">{photo.size ? formatBytes(photo.size) : "Dung lượng chưa xác định"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {photo.status && (
                    <span
                      className={`rounded-full border px-2 py-1 text-[0.55rem] tracking-[0.08em] ${statusClassMap[photo.status]}`}
                    >
                      {statusLabelMap[photo.status]}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemovePhoto(photo.id);
                    }}
                    className="rounded-full border border-stone-300 px-3 py-1 text-xs"
                  >
                    Xóa
                  </button>
                </div>
                {photo.uploadError && (
                  <p className="text-[0.6rem] text-red-600">{photo.uploadError}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <div ref={sentinelRef} />
        {hasMore && (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-sm text-[var(--text-soft,#4a4034)]">
            Đang tải thêm ảnh...
          </div>
        )}
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">{lightbox.name}</h4>
              <button type="button" onClick={() => setLightbox(null)} className="text-sm text-red-600">
                Đóng
              </button>
            </div>
            <div className="mt-4">
              <img src={lightbox.url} alt={lightbox.name} className="max-h-[60vh] w-full object-contain" />
            </div>
            <p className="mt-3 text-sm text-[var(--text-soft,#4a4034)]">
              {filteredPhotos.findIndex((item) => item.id === lightbox.id) + 1} / {filteredPhotos.length} ·{" "}
              {lightbox.size ? formatBytes(lightbox.size) : "Dung lượng chưa xác định"}
            </p>
            {lightbox.status && (
              <span className="mt-2 inline-flex rounded-full border px-3 py-1 text-[0.65rem] tracking-[0.08em]">
                {lightbox.status}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
