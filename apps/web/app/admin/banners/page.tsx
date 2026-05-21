"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import AdminModal from "../AdminModal";
import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import ImageUploadField from "../ImageUploadField";
import { createBanner, deleteBanner, listBanners, updateBanner, uploadImage } from "../api";
import type { BannerRecord, BannerUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";
import { shouldSkipImageOptimization } from "../../lib/image";

const EMPTY_FORM: BannerUpsert = { alt: "", img: "", order: 0, is_active: true };

function sortByOrder(items: BannerRecord[]): BannerRecord[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export default function AdminBannersPage() {
  const { token, logout } = useAdminToken();
  const [items, setItems] = useState<BannerRecord[]>([]);
  const [form, setForm] = useState<BannerUpsert>(EMPTY_FORM);
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
    listBanners(token)
      .then((data) => setItems(sortByOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được banner."))
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

  const openEdit = (item: BannerRecord) => {
    setError("");
    setNotice("");
    setForm({ alt: item.alt, img: item.img, order: item.order, is_active: item.is_active });
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
      const payload: BannerUpsert = { ...form, order: Math.max(0, form.order) };
      if (!payload.alt.trim() || !payload.img.trim()) {
        setError("Alt và hình banner là bắt buộc.");
        return;
      }
      if (editId) {
        const updated = await updateBanner(token, editId, payload);
        setItems((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Đã cập nhật banner.");
      } else {
        const created = await createBanner(token, payload);
        setItems((prev) => sortByOrder([...prev, created]));
        setNotice("Đã tạo banner.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được banner.");
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
      await deleteBanner(token, pendingDeleteId);
      setItems((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setNotice("Đã xóa banner.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được banner.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!token) return;
    const uploaded = await uploadImage(token, file, "banner");
    setForm((prev) => ({ ...prev, img: uploaded.url }));
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Banner"
      subtitle="Popup có label rõ ràng và preview hình ảnh."
      onLogout={logout}
      actions={
        <button type="button" onClick={openCreate} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
          Thêm banner
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-stone-500">{loaded ? `${items.length} banner` : "Đang tải..."}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex gap-3">
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white relative">
                  {item.img ? (
                    <Image
                      src={item.img}
                      alt={item.alt}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized={shouldSkipImageOptimization(item.img)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-stone-400">Chưa có ảnh</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">{item.alt}</p>
                  <p className="text-xs text-stone-500">
                    order {item.order} · {item.is_active ? "đang hiển thị" : "ẩn"}
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
          {loaded && items.length === 0 && <p className="text-sm text-stone-500">Chưa có banner nào.</p>}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={resetModal}
        title={editId ? "Sửa banner" : "Thêm banner"}
        description="Upload hình và xem preview ngay trong popup."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Hủy
            </button>
            <button
              type="submit"
              form="banner-form"
              disabled={saving}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <form id="banner-form" className="space-y-3" onSubmit={handleSave}>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Alt text
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.alt}
              onChange={(event) => setForm((prev) => ({ ...prev, alt: event.target.value }))}
              required
            />
          </label>

          <ImageUploadField
            id="banner-image"
            label="Hình banner"
            value={form.img}
            onChange={(value) => setForm((prev) => ({ ...prev, img: value }))}
            onUpload={handleUpload}
            recommendedSize="1920x730"
            hint="Khuyến nghị ảnh ngang để hiển thị đẹp trên slider."
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

          <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))}
            />
            Hiển thị banner này
          </label>
        </form>
      </AdminModal>

      <ConfirmActionModal
        open={Boolean(pendingDeleteId)}
        busy={deleting}
        title="Xác nhận xóa banner"
        description="Bạn có chắc chắn muốn xóa banner này không?"
        confirmLabel="Xóa banner"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
