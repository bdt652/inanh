"use client";

import type { ChangeEvent, FormEvent } from "react";

import AdminModal from "../AdminModal";
import type { CategoryRecord, ProductUpsert } from "../types";

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
  onReorderImage: (fromIndex: number, toIndex: number) => void;
  onAutoSlug: () => void;
  onFormChange: (next: ProductUpsert) => void;
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
  onReorderImage,
  onAutoSlug,
  onFormChange,
}: ProductFormModalProps) {
  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={editing ? "Sua san pham" : "Them san pham"}
      description="Tat ca field co label, upload hinh co preview ro rang."
      maxWidthClassName="max-w-4xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
            Huy
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={saving}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
          >
            {saving ? "Dang luu..." : "Luu"}
          </button>
        </div>
      }
    >
      <form id="product-form" className="space-y-3" onSubmit={onSubmit}>
        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Ten san pham
          <input
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
            value={form.name}
            onChange={(event) => onFormChange({ ...form, name: event.target.value })}
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
                onChange={(event) => onFormChange({ ...form, slug: event.target.value })}
                required
              />
              <button type="button" onClick={onAutoSlug} className="rounded-xl border border-stone-300 px-3 py-2 text-xs">
                Tao slug
              </button>
            </div>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Category slug
            <select
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.category_slug}
              onChange={(event) => onFormChange({ ...form, category_slug: event.target.value })}
              required
            >
              <option value="">Chon danh muc</option>
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
            Gia
            <input
              type="number"
              min={0}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.price}
              onChange={(event) => onFormChange({ ...form, price: Number(event.target.value) || 0 })}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Gia sale (optional)
            <input
              type="number"
              min={0}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.sale_price ?? ""}
              onChange={(event) =>
                onFormChange({
                  ...form,
                  sale_price: event.target.value ? Number(event.target.value) || 0 : null,
                })
              }
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-stone-700">
          Mo ta ngan
          <textarea
            className="min-h-20 rounded-xl border border-stone-300 px-3 py-2 text-sm"
            value={form.short_description}
            onChange={(event) => onFormChange({ ...form, short_description: event.target.value })}
          />
        </label>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-stone-700">Hinh san pham</p>
          <input id="product-images-file" type="file" accept="image/*" multiple className="sr-only" onChange={onUploadImages} />
          <label
            htmlFor="product-images-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <span className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white">
              Bam vao day de chon hinh san pham
            </span>
            <span className="text-xs text-stone-500">Co the chon nhieu hinh trong mot lan upload.</span>
          </label>
        </div>

        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Image preview</p>
          {previewImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {previewImages.map((url, index) => (
                <div key={url} className="relative overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <img src={url} alt="product preview" className="h-24 w-full object-cover" />
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
              Chua co hinh nao
            </div>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Thu tu hien thi
            <input
              type="number"
              min={0}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.order}
              onChange={(event) => onFormChange({ ...form, order: Number(event.target.value) || 0 })}
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => onFormChange({ ...form, is_active: event.target.checked })}
            />
            Dang hien thi
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={form.is_featured}
              onChange={(event) => onFormChange({ ...form, is_featured: event.target.checked })}
            />
            Noi bat trang chu
          </label>
        </div>
      </form>
    </AdminModal>
  );
}
