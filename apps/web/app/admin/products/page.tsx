"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import { createProduct, deleteProduct, listCategories, listProducts, updateProduct, uploadImage } from "../api";
import type { CategoryRecord, ProductRecord, ProductUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";
import { shouldSkipImageOptimization } from "../../lib/image";
import ProductFormModal from "./ProductFormModal";

const EMPTY_FORM: ProductUpsert = {
  name: "",
  slug: "",
  category_slug: "",
  price: 0,
  sale_price: null,
  image_url: "",
  image_urls: [],
  short_description: "",
  content: "",
  order: 0,
  is_active: true,
  is_featured: false,
  extra_options: [],
  allow_online_order: true,
  pricing_mode: "retail",
  min_images: null,
  max_images: null,
  tags: [],
  seo_title: "",
  seo_description: "",
  focus_keyword: "",
};

function sortByOrder(items: ProductRecord[]): ProductRecord[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function slugify(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toImageList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toImageText(value: string[]): string {
  return value.join("\n");
}

export default function AdminProductsPage() {
  const { token, logout } = useAdminToken();
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [form, setForm] = useState<ProductUpsert>(EMPTY_FORM);
  const [imagesText, setImagesText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return;
    Promise.all([listProducts(token), listCategories(token)])
      .then(([products, categoryItems]) => {
        setItems(sortByOrder(products));
        setCategories(categoryItems);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được dữ liệu sản phẩm."))
      .finally(() => setLoaded(true));
  }, [token]);

  const previewImages = useMemo(() => toImageList(imagesText), [imagesText]);

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setImagesText("");
    setEditId(null);
    setModalOpen(false);
  };

  const openCreate = () => {
    setError("");
    setNotice("");
    resetModal();
    setModalOpen(true);
  };

  const openEdit = (item: ProductRecord) => {
    setError("");
    setNotice("");
    setForm({
      name: item.name,
      slug: item.slug,
      category_slug: item.category_slug,
      price: item.price,
      sale_price: item.sale_price,
      image_url: item.image_url,
      image_urls: item.image_urls,
      short_description: item.short_description,
      content: item.content ?? "",
      order: item.order,
      is_active: item.is_active,
      is_featured: item.is_featured,
      extra_options: item.extra_options ?? [],
      allow_online_order: item.allow_online_order ?? true,
      pricing_mode: item.pricing_mode ?? "retail",
      min_images: item.min_images ?? null,
      max_images: item.max_images ?? null,
      tags: item.tags ?? [],
      seo_title: item.seo_title ?? "",
      seo_description: item.seo_description ?? "",
      focus_keyword: item.focus_keyword ?? "",
    });
    setImagesText(toImageText(item.image_urls));
    setEditId(item.id);
    setModalOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const imageUrls = toImageList(imagesText);
      const normalizedOptions = Array.from(
        new Set(
          (form.extra_options ?? [])
            .map((option) => option.trim())
            .filter((option) => option)
        )
      );
      const payload: ProductUpsert = {
        ...form,
        slug: slugify(form.slug || form.name),
        category_slug: slugify(form.category_slug),
        price: Math.max(0, form.price),
        sale_price: form.sale_price !== null && form.sale_price > 0 ? form.sale_price : null,
        image_urls: imageUrls,
        image_url: imageUrls[0] ?? "",
        order: Math.max(0, form.order),
        extra_options: normalizedOptions,
        min_images: form.min_images ?? null,
        max_images: form.max_images ?? null,
      };
      if (!payload.name.trim() || !payload.slug.trim() || !payload.category_slug.trim()) {
        setError("Tên, slug và category_slug là bắt buộc.");
        return;
      }

      if (editId) {
        const updated = await updateProduct(token, editId, payload);
        setItems((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Đã cập nhật sản phẩm.");
      } else {
        const created = await createProduct(token, payload);
        setItems((prev) => sortByOrder([...prev, created]));
        setNotice("Đã tạo sản phẩm.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được sản phẩm.");
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const handleDelete = async () => {
    if (!token || !pendingDeleteId) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await deleteProduct(token, pendingDeleteId);
      setItems((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setNotice("Đã xóa sản phẩm.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được sản phẩm.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!token) return;
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) return;
    setError("");
    try {
      const urls: string[] = [];
      for (const file of files) {
        const uploaded = await uploadImage(token, file, "product");
        urls.push(uploaded.url);
      }
      const merged = [...previewImages, ...urls];
      setImagesText(toImageText(merged));
      setForm((prev) => ({
        ...prev,
        image_urls: merged,
        image_url: merged[0] ?? "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không upload được hình sản phẩm.");
    } finally {
      event.target.value = "";
    }
  };

  const handleUploadContentImage = async (file: File): Promise<string> => {
    if (!token) {
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }
    const uploaded = await uploadImage(token, file, "content");
    return uploaded.url;
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Sản phẩm"
      subtitle="Popup form có label rõ, upload và preview hình ảnh đầy đủ."
      onLogout={logout}
      actions={
        <button type="button" onClick={openCreate} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
          Thêm sản phẩm
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-stone-500">{loaded ? `${items.length} sản phẩm` : "Đang tải..."}</p>
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white relative">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized={shouldSkipImageOptimization(item.image_url)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-stone-400">Chưa có ảnh</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">{item.name}</p>
                    <p className="truncate text-xs text-stone-500">
                      {item.slug} · {item.category_slug} · order {item.order}
                    </p>
                    {item.allow_online_order === false && (
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                        Chỉ nhận Zalo
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-stone-300 px-3 py-1 text-xs">
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(item.id)}
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
          {loaded && items.length === 0 && <p className="text-sm text-stone-500">Chưa có sản phẩm nào.</p>}
        </div>
      </section>

      <ProductFormModal
        open={modalOpen}
        saving={saving}
        editing={Boolean(editId)}
        form={form}
        previewImages={previewImages}
        categories={categories}
        onClose={resetModal}
        onSubmit={handleSave}
        onUploadImages={handleUploadImages}
        onUploadContentImage={handleUploadContentImage}
        onReorderImage={(fromIndex, toIndex) => {
          setImagesText((prevText) => {
            const list = toImageList(prevText);
            if (fromIndex === toIndex || toIndex < 0 || toIndex >= list.length) return prevText;
            const next = [...list];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            const text = toImageText(next);
            setForm((prev) => ({
              ...prev,
              image_urls: next,
              image_url: next[0] ?? "",
            }));
            return text;
          });
        }}
        onAutoSlug={() => setForm((prev) => ({ ...prev, slug: slugify(prev.name || prev.slug) }))}
        onFormChange={setForm}
      />

      <ConfirmActionModal
        open={Boolean(pendingDeleteId)}
        busy={deleting}
        title="Xác nhận xóa sản phẩm"
        description="Bạn có chắc chắn muốn xóa sản phẩm này không?"
        confirmLabel="Xóa sản phẩm"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
