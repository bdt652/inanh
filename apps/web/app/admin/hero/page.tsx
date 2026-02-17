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
      .catch((err) => setError(err instanceof Error ? err.message : "Khong tai duoc hero."))
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
        setError("Title va description la bat buoc.");
        return;
      }
      if (editId) {
        const updated = await updateHero(token, editId, payload);
        setItems((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Da cap nhat hero.");
      } else {
        const created = await createHero(token, payload);
        setItems((prev) => sortByOrder([...prev, created]));
        setNotice("Da tao hero.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc hero.");
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
      setNotice("Da xoa hero.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc hero.");
    } finally {
      setDeleting(false);
    }
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Hero"
      subtitle="Tat ca thao tac them/sua duoc thuc hien qua popup."
      onLogout={logout}
      actions={
        <button type="button" onClick={openCreate} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
          Them hero
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-stone-500">{loaded ? `${items.length} hero items` : "Dang tai..."}</p>
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
                    Sua
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(item.id)}
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600"
                  >
                    Xoa
                  </button>
                </div>
              </div>
            </article>
          ))}
          {loaded && items.length === 0 && <p className="text-sm text-stone-500">Chua co hero nao.</p>}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={resetModal}
        title={editId ? "Sua hero" : "Them hero"}
        description="Dien ro title, description va thu tu hien thi."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Huy
            </button>
            <button
              type="submit"
              form="hero-form"
              disabled={saving}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Dang luu..." : "Luu"}
            </button>
          </div>
        }
      >
        <form id="hero-form" className="space-y-3" onSubmit={handleSave}>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tieu de
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Mo ta
            <textarea
              className="min-h-24 rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Thu tu hien thi
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
        title="Xac nhan xoa hero"
        description="Ban co chac chan muon xoa muc hero nay khong?"
        confirmLabel="Xoa hero"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
