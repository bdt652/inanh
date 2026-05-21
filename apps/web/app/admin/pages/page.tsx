"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";

import AdminModal from "../AdminModal";
import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import { createPage, deletePage, listPages, updatePage, uploadImage } from "../api";
import type { PageRecord, PageUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";

const PageContentEditor = dynamic(() => import("../PageContentEditor"), {
  ssr: false,
  loading: () => <p className="text-xs text-stone-500">Đang tải trình soạn thảo...</p>,
});

const EMPTY_FORM: PageUpsert = {
  slug: "",
  path: "",
  title: "",
  summary: "",
  content: "",
  is_published: true,
  order: 0,
};

function sortByOrder(items: PageRecord[]): PageRecord[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
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

export default function AdminPagesListPage() {
  const { token, logout } = useAdminToken();
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PageUpsert>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listPages(token)
      .then((data) => setPages(sortByOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được danh sách trang."))
      .finally(() => setLoaded(true));
  }, [token]);

  const editing = useMemo(() => Boolean(editingId), [editingId]);

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalOpen(false);
  };

  const handleOpenCreate = () => {
    setError("");
    setNotice("");
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (page: PageRecord) => {
    setError("");
    setNotice("");
    setEditingId(page.id);
    setForm({
      slug: page.slug,
      path: page.path,
      title: page.title,
      summary: page.summary,
      content: page.content,
      is_published: page.is_published,
      order: page.order,
    });
    setModalOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const payload: PageUpsert = {
      ...form,
      slug: slugify(form.slug || form.title),
      path: normalizePath(form.path),
      order: Math.max(0, form.order),
    };

    if (!payload.slug || !payload.path || !payload.title.trim()) {
      setError("Slug, path và title là bắt buộc.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        const updated = await updatePage(token, editingId, payload);
        setPages((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Đã cập nhật trang.");
      } else {
        const created = await createPage(token, payload);
        setPages((prev) => sortByOrder([...prev, created]));
        setNotice("Đã tạo trang.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được trang.");
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
      await deletePage(token, pendingDeleteId);
      setPages((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setNotice("Đã xóa trang.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa trang.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadContentImage = async (file: File): Promise<string> => {
    if (!token) throw new Error("Chưa đăng nhập.");
    const uploaded = await uploadImage(token, file, "content");
    return uploaded.url;
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Pages"
      subtitle="Quản lý trang động với popup editor."
      onLogout={logout}
      actions={
        <button type="button" onClick={handleOpenCreate} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
          Thêm trang
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-500">{loaded ? `${pages.length} trang` : "Đang tải..."}</p>
        <div className="grid gap-3">
          {pages.map((page) => (
            <article key={page.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{page.title}</p>
                  <p className="text-xs text-stone-500">
                    {page.path} · order {page.order} · {page.is_published ? "Hiển thị" : "Ẩn"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(page)}
                    className="rounded-lg border border-stone-300 px-3 py-1 text-xs text-stone-700"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(page.id)}
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
          {loaded && pages.length === 0 && <p className="text-sm text-stone-500">Chưa có trang nào.</p>}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={resetModal}
        title={editing ? "Sửa trang" : "Thêm trang"}
        description="Nhập đầy đủ thông tin, mỗi trường đều có label rõ ràng."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Hủy
            </button>
            <button
              type="submit"
              form="page-editor-form"
              disabled={saving}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <form id="page-editor-form" className="space-y-3" onSubmit={handleSave}>
          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tiêu đề
            <input
              className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
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
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, slug: slugify(prev.title || prev.slug) }))}
                  className="rounded-xl border border-stone-300 px-3 py-2 text-xs"
                >
                  Tạo slug
                </button>
              </div>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Đường dẫn
              <input
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                placeholder="/gioi-thieu"
                value={form.path}
                onChange={(event) => setForm((prev) => ({ ...prev, path: event.target.value }))}
                required
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-semibold text-stone-700">
            Tóm tắt
            <textarea
              className="min-h-20 rounded-xl border border-stone-300 px-3 py-2 text-sm"
              value={form.summary}
              onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
          </label>

          <div className="grid gap-2 text-sm font-semibold text-stone-700">
            <span>Nội dung</span>
            <PageContentEditor
              value={form.content}
              onChange={(next) => setForm((prev) => ({ ...prev, content: next }))}
              onUploadImage={handleUploadContentImage}
              placeholder="Soạn nội dung phong phú, hỗ trợ định dạng như Word."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
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
                checked={form.is_published}
                onChange={(event) => setForm((prev) => ({ ...prev, is_published: event.target.checked }))}
              />
              Xuất bản ngay
            </label>
          </div>
        </form>
      </AdminModal>

      <ConfirmActionModal
        open={Boolean(pendingDeleteId)}
        busy={deleting}
        title="Xác nhận xóa trang"
        description="Bạn có chắc chắn muốn xóa trang này không?"
        confirmLabel="Xóa trang"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
