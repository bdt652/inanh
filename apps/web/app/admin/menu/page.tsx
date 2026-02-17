"use client";

import { useEffect, useState, type FormEvent } from "react";

import AdminModal from "../AdminModal";
import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import { createMenu, deleteMenu, listMenu, updateMenu } from "../api";
import type { MenuRecord, MenuUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";

const EMPTY_FORM: MenuUpsert = { label: "", path: "", order: 0 };

function sortByOrder(items: MenuRecord[]): MenuRecord[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}

export default function AdminMenuPage() {
  const { token, logout } = useAdminToken();
  const [items, setItems] = useState<MenuRecord[]>([]);
  const [form, setForm] = useState<MenuUpsert>(EMPTY_FORM);
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
    listMenu(token)
      .then((data) => setItems(sortByOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Khong tai duoc menu."))
      .finally(() => setLoaded(true));
  }, [token]);

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModalOpen(false);
  };

  const handleOpenCreate = () => {
    setError("");
    setNotice("");
    setForm(EMPTY_FORM);
    setEditId(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: MenuRecord) => {
    setError("");
    setNotice("");
    setForm({ label: item.label, path: item.path, order: item.order });
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
      const payload: MenuUpsert = {
        ...form,
        path: normalizePath(form.path),
        order: Math.max(0, form.order),
      };
      if (!payload.label.trim() || !payload.path.trim()) {
        setError("Label va path la bat buoc.");
        return;
      }
      if (editId) {
        const updated = await updateMenu(token, editId, payload);
        setItems((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Da cap nhat menu.");
      } else {
        const created = await createMenu(token, payload);
        setItems((prev) => sortByOrder([...prev, created]));
        setNotice("Da tao menu.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc menu.");
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
      await deleteMenu(token, pendingDeleteId);
      setItems((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setNotice("Da xoa menu.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong xoa duoc menu.");
    } finally {
      setDeleting(false);
    }
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Menu"
      subtitle="Tat ca thao tac them/sua duoc thuc hien trong popup."
      onLogout={logout}
      actions={
        <button type="button" onClick={handleOpenCreate} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
          Them menu
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-stone-500">{loaded ? `${items.length} menu items` : "Dang tai..."}</p>
        <div className="grid gap-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{item.label}</p>
                  <p className="text-xs text-stone-500">
                    {item.path} · order {item.order}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleOpenEdit(item)} className="rounded-lg border border-stone-300 px-3 py-1 text-xs">
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
          {loaded && items.length === 0 && <p className="text-sm text-stone-500">Chua co menu nao.</p>}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={resetModal}
        title={editId ? "Sua menu" : "Them menu"}
        description="Nhap ro label va duong dan."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Huy
            </button>
            <button type="submit" form="menu-form" className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white" disabled={saving}>
              {saving ? "Dang luu..." : "Luu"}
            </button>
          </div>
        }
      >
        <form id="menu-form" className="space-y-3" onSubmit={handleSave}>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Label menu
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              required
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Duong dan
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              placeholder="/gioi-thieu"
              value={form.path}
              onChange={(event) => setForm((prev) => ({ ...prev, path: event.target.value }))}
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
        title="Xac nhan xoa menu"
        description="Ban co chac chan muon xoa menu nay khong?"
        confirmLabel="Xoa menu"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
