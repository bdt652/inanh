"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { ChangeEvent, FormEvent, Dispatch, SetStateAction } from "react";

import AdminModal from "../AdminModal";
import { shouldSkipImageOptimization } from "../../lib/image";
import type { CategoryRecord, ProductUpsert } from "../types";

const PageContentEditor = dynamic(() => import("../PageContentEditor"), {
  ssr: false,
  loading: () => <p className="text-xs text-stone-500">Đang tải trình soạn thảo...</p>,
});

type ProductFormModalProps = {
  open: boolean;
  saving: boolean;
  editing: boolean;
  form: ProductUpsert;
  previewImages: string[];
  categories: CategoryRecord[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUploadImages: (event: ChangeEvent<HTMLInputElement>) => void;
  onUploadContentImage?: (file: File) => Promise<string>;
  onReorderImage: (fromIndex: number, toIndex: number) => void;
  onAutoSlug: () => void;
  onFormChange: Dispatch<SetStateAction<ProductUpsert>>;
};

export default function ProductFormModal({
  open,
  saving,
  editing,
  form,
  previewImages,
  categories,
  onClose,
  onSubmit,
  onUploadImages,
  onUploadContentImage,
  onReorderImage,
  onAutoSlug,
  onFormChange,
}: ProductFormModalProps) {
  const [optionInput, setOptionInput] = useState("");

  const existingOptions = form.extra_options ?? [];

  const handleAddOption = () => {
    const candidate = optionInput.trim();
    if (!candidate) return;
    if (existingOptions.includes(candidate)) {
      setOptionInput("");
      return;
    }
    onFormChange((prev) => ({
      ...prev,
      extra_options: [...(prev.extra_options ?? []), candidate],
    }));
    setOptionInput("");
  };

  const handleRemoveOption = (target: string) => {
    onFormChange((prev) => ({
      ...prev,
      extra_options: (prev.extra_options ?? []).filter((option) => option !== target),
    }));
  };

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={editing ? "Sửa sản phẩm" : "Thêm sản phẩm"}
      description="Tất cả field có label, upload hình có preview rõ ràng."
      maxWidthClassName="max-w-4xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
            Hủy
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      }
    >
      <form id="product-form" className="space-y-3" onSubmit={onSubmit}>
        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Tên sản phẩm
          <input
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
            value={form.name}
            onChange={(event) =>
              onFormChange((prev) => ({
                ...prev,
                name: event.target.value,
              }))
            }
            required
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Slug
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                value={form.slug}
                onChange={(event) =>
                  onFormChange((prev) => ({
                    ...prev,
                    slug: event.target.value,
                  }))
                }
                required
              />
              <button type="button" onClick={onAutoSlug} className="rounded-xl border border-stone-300 px-3 py-2 text-xs">
                Tạo slug
              </button>
            </div>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Category slug
            <select
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.category_slug}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  category_slug: event.target.value,
                }))
              }
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.label} ({category.slug})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Giá
            <input
              type="number"
              min={0}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.price}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  price: Number(event.target.value) || 0,
                }))
              }
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Giá sale (tùy chọn)
            <input
              type="number"
              min={0}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.sale_price ?? ""}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  sale_price: event.target.value ? Number(event.target.value) || 0 : null,
                }))
              }
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Hình thức tính giá
          <select
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
            value={form.pricing_mode}
            onChange={(event) =>
              onFormChange((prev) => ({
                ...prev,
                pricing_mode: event.target.value === "combo" ? "combo" : "retail",
              }))
            }
          >
            <option value="retail">Bán lẻ (theo ảnh)</option>
            <option value="combo">Combo (giá cố định)</option>
          </select>
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tối thiểu số ảnh / đơn
            <input
              type="number"
              min={1}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.min_images ?? ""}
              onChange={(event) =>
                onFormChange((prev) => {
                  const value = event.target.value ? Number(event.target.value) : null;
                  return {
                    ...prev,
                    min_images: value && value > 0 ? value : null,
                  };
                })
              }
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tối đa số ảnh / đơn
            <input
              type="number"
              min={1}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.max_images ?? ""}
              onChange={(event) =>
                onFormChange((prev) => {
                  const value = event.target.value ? Number(event.target.value) : null;
                  return {
                    ...prev,
                    max_images: value && value > 0 ? value : null,
                  };
                })
              }
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Mô tả ngắn
          <textarea
            className="min-h-20 rounded-xl border border-stone-300 px-3 py-2 text-sm"
            value={form.short_description}
            onChange={(event) =>
              onFormChange((prev) => ({
                ...prev,
                short_description: event.target.value,
              }))
            }
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-700">Nội dung sản phẩm</p>
          <PageContentEditor
            value={form.content}
            onChange={(next) =>
              onFormChange((prev) => ({
                ...prev,
                content: next,
              }))
            }
            onUploadImage={onUploadContentImage}
            placeholder="Nhập nội dung chi tiết cho sản phẩm..."
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-700">Tùy chọn in ấn</p>
          <div className="flex flex-wrap gap-2">
            {existingOptions.map((option) => (
              <span
                key={option}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700 shadow-sm"
              >
                {option}
                <button
                  type="button"
                  className="text-stone-400 transition hover:text-red-500"
                  onClick={() => handleRemoveOption(option)}
                >
                  ✕
                </button>
              </span>
            ))}
            {!existingOptions.length && (
              <p className="text-xs text-stone-400">Chưa có tùy chọn nào.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={optionInput}
              onChange={(event) => setOptionInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddOption();
                }
              }}
              placeholder="Thêm 'In lụa', 'In gỗ màu', ..."
              className="flex-1 min-w-[180px] rounded-2xl border border-stone-300 px-3 py-2 text-sm shadow-inner focus:border-emerald-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddOption}
              className="rounded-2xl bg-[var(--accent-strong,#8a4d1f)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
            >
              Thêm
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-700">Hình sản phẩm</p>
          <p className="text-xs text-stone-500">Kích thước khuyến nghị: 1200x900 (tỷ lệ 4:3).</p>
          <input id="product-images-file" type="file" accept="image/*" multiple className="sr-only" onChange={onUploadImages} />
          <label
            htmlFor="product-images-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <span className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">
              Bấm vào đây để chọn hình sản phẩm
            </span>
            <span className="text-xs text-stone-500">Có thể chọn nhiều hình trong một lần upload.</span>
          </label>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Xem trước ảnh</p>
          {previewImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {previewImages.map((url, index) => (
                <div key={url} className="relative h-24 overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <Image
                    src={url}
                    alt="product preview"
                    fill
                    sizes="100vw"
                    className="object-cover"
                    unoptimized={shouldSkipImageOptimization(url)}
                  />
                  <div className="absolute left-1 top-1 flex flex-col gap-1">
                    <button
                      type="button"
                      className="rounded bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 hover:bg-white"
                      disabled={index === 0}
                      onClick={() => onReorderImage(index, index - 1)}
                    >
                      Lên
                    </button>
                    <button
                      type="button"
                      className="rounded bg-white/85 px-2 py-0.5 text-[10px] font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 hover:bg-white"
                      disabled={index === previewImages.length - 1}
                      onClick={() => onReorderImage(index, index + 1)}
                    >
                      Xuống
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 rounded bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-stone-300 text-xs text-stone-500">
              Chưa có hình nào
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Thứ tự hiển thị
            <input
              type="number"
              min={0}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.order}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  order: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  is_active: event.target.checked,
                }))
              }
            />
            Đang hiển thị
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  is_featured: event.target.checked,
                }))
              }
            />
            Nổi bật trang chủ
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={form.allow_online_order}
              onChange={(event) =>
                onFormChange((prev) => ({
                  ...prev,
                  allow_online_order: event.target.checked,
                }))
              }
            />
            Cho phép đặt hàng online
          </label>
        </div>
      </form>
    </AdminModal>
  );
}
