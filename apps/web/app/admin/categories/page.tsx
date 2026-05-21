"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import AdminModal from "../AdminModal";
import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import ImageUploadField from "../ImageUploadField";
import { createCategory, deleteCategory, listCategories, updateCategory, uploadImage } from "../api";
import type { CategoryRecord, CategoryUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";
import { shouldSkipImageOptimization } from "../../lib/image";

const EMPTY_FORM: CategoryUpsert = { label: "", slug: "", img: "", order: 0 };

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

function sortByOrder(items: CategoryRecord[]): CategoryRecord[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export default function AdminCategoriesPage() {
  const { token, logout } = useAdminToken();
  const [items, setItems] = useState<CategoryRecord[]>([]);
  const [form, setForm] = useState<CategoryUpsert>(EMPTY_FORM);
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
    listCategories(token)
      .then((data) => setItems(sortByOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được danh mục."))
      .finally(() => setLoaded(true));
  }, [token]);

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModalOpen(false);
  };

  const openCreate = () => {
    setError("");
    setNotice("");
    setForm(EMPTY_FORM);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (item: CategoryRecord) => {
    setError("");
    setNotice("");
    setForm({ label: item.label, slug: item.slug, img: item.img, order: item.order });
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
      const payload: CategoryUpsert = {
        ...form,
        slug: slugify(form.slug || form.label),
        order: Math.max(0, form.order),
      };
      if (!payload.label.trim() || !payload.slug.trim()) {
        setError("Label và slug là bắt buộc.");
        return;
      }
      if (editId) {
        const updated = await updateCategory(token, editId, payload);
        setItems((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Đã cập nhật danh mục.");
      } else {
        const created = await createCategory(token, payload);
        setItems((prev) => sortByOrder([...prev, created]));
        setNotice("Đã tạo danh mục.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được danh mục.");
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
      await deleteCategory(token, pendingDeleteId);
      setItems((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setNotice("Đã xóa danh mục.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được danh mục.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!token) return;
    const uploaded = await uploadImage(token, file, "category");
    setForm((prev) => ({ ...prev, img: uploaded.url }));
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Danh mục"
      subtitle="Đồng bộ giao diện với popup và preview hình."
      onLogout={logout}
      actions={
        <button type="button" onClick={openCreate} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
          Thêm danh mục
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-stone-500">{loaded ? `${items.length} danh mục` : "Đang tải..."}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white relative">
                  {item.img ? (
                    <Image
                      src={item.img}
                      alt={item.label}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized={shouldSkipImageOptimization(item.img)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-stone-400">Chưa có ảnh</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">{item.label}</p>
                  <p className="truncate text-xs text-stone-500">
                    {item.slug} · order {item.order}
                  </p>
                  <div className="mt-2 flex gap-2">
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
              </div>
            </article>
          ))}
          {loaded && items.length === 0 && <p className="text-sm text-stone-500">Chưa có danh mục nào.</p>}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={resetModal}
        title={editId ? "Sửa danh mục" : "Thêm danh mục"}
        description="Moi truong upload va preview duoc dat label ro rang."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Hủy
            </button>
            <button
              type="submit"
              form="category-form"
              disabled={saving}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <form id="category-form" className="space-y-3" onSubmit={handleSave}>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tên danh mục
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Slug
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, slug: slugify(prev.label || prev.slug) }))}
                className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
              >
                Tạo slug
              </button>
            </div>
          </label>

          <ImageUploadField
            id="category-image"
            label="Hình danh mục"
            value={form.img}
            onChange={(value) => setForm((prev) => ({ ...prev, img: value }))}
            onUpload={handleUpload}
            recommendedSize="1200x800"
            hint="Tải ảnh để xem trước ngay trong popup."
          />

          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Thứ tự hiển thị
            <input
              type="number"
              min={0}
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.order}
              onChange={(event) => setForm((prev) => ({ ...prev, order: Number(event.target.value) || 0 }))}
            />
          </label>
        </form>
      </AdminModal>

      <ConfirmActionModal
        open={Boolean(pendingDeleteId)}
        busy={deleting}
        title="Xác nhận xóa danh mục"
        description="Bạn có chắc chắn muốn xóa danh mục này không?"
        confirmLabel="Xóa danh mục"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
