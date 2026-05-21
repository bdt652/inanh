"use client";

import { useEffect, useState, type FormEvent } from "react";

import AdminModal from "../AdminModal";
import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import { createHero, deleteHero, listHero, updateHero } from "../api";
import type { HeroRecord, HeroUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";

const EMPTY_FORM: HeroUpsert = { title: "", description: "", order: 0 };

function sortByOrder(items: HeroRecord[]): HeroRecord[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export default function AdminHeroPage() {
  const { token, logout } = useAdminToken();
  const [items, setItems] = useState<HeroRecord[]>([]);
  const [form, setForm] = useState<HeroUpsert>(EMPTY_FORM);
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
    listHero(token)
      .then((data) => setItems(sortByOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được hero."))
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

  const openEdit = (item: HeroRecord) => {
    setError("");
    setNotice("");
    setForm({ title: item.title, description: item.description, order: item.order });
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
      const payload: HeroUpsert = { ...form, order: Math.max(0, form.order) };
      if (!payload.title.trim() || !payload.description.trim()) {
        setError("Title và description là bắt buộc.");
        return;
      }
      if (editId) {
        const updated = await updateHero(token, editId, payload);
        setItems((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Đã cập nhật hero.");
      } else {
        const created = await createHero(token, payload);
        setItems((prev) => sortByOrder([...prev, created]));
        setNotice("Đã tạo hero.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được hero.");
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
      await deleteHero(token, pendingDeleteId);
      setItems((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setNotice("Đã xóa hero.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được hero.");
    } finally {
      setDeleting(false);
    }
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Hero"
      subtitle="Tất cả thao tác thêm/sửa được thực hiện qua popup."
      onLogout={logout}
      actions={
        <button type="button" onClick={openCreate} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
          Thêm hero
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-stone-500">{loaded ? `${items.length} mục hero` : "Đang tải..."}</p>
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                  <p className="text-xs text-stone-500">
                    {item.description} · order {item.order}
                  </p>
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
          {loaded && items.length === 0 && <p className="text-sm text-stone-500">Chưa có hero nào.</p>}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={resetModal}
        title={editId ? "Sửa hero" : "Thêm hero"}
        description="Điền rõ tiêu đề, mô tả và thứ tự hiển thị."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Hủy
            </button>
            <button
              type="submit"
              form="hero-form"
              disabled={saving}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <form id="hero-form" className="space-y-3" onSubmit={handleSave}>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tiêu đề
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Mô tả
            <textarea
              className="min-h-24 rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              required
            />
          </label>
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
        title="Xác nhận xóa hero"
        description="Bạn có chắc chắn muốn xóa mục hero này không?"
        confirmLabel="Xóa hero"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
