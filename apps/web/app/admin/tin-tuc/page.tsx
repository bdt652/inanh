"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";

import AdminModal from "../AdminModal";
import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import TagInput from "../TagInput";
import { createPost, deletePost, listPosts, updatePost, uploadImage } from "../api";
import type { PostRecord, PostUpsert } from "../types";
import { useAdminToken } from "../useAdminToken";

const PageContentEditor = dynamic(() => import("../PageContentEditor"), {
  ssr: false,
  loading: () => <p className="text-xs text-stone-500">Đang tải trình soạn thảo...</p>,
});

const EMPTY_FORM: PostUpsert = {
  slug: "",
  title: "",
  summary: "",
  content: "",
  cover_image: null,
  is_published: false,
  tags: [],
  order: 0,
  seo_title: "",
  seo_description: "",
  focus_keyword: "",
};

function sortByOrder(items: PostRecord[]): PostRecord[] {
  return [...items].sort((a, b) => a.order - b.order);
}

function slugify(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminPostsPage() {
  const { token, logout } = useAdminToken();
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostUpsert>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!token) return;
    listPosts(token)
      .then((data) => setPosts(sortByOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được danh sách tin tức."))
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

  const handleOpenEdit = (post: PostRecord) => {
    setError("");
    setNotice("");
    setEditingId(post.id);
    setForm({
      slug: post.slug,
      title: post.title,
      summary: post.summary,
      content: post.content,
      cover_image: post.cover_image,
      is_published: post.is_published,
      tags: post.tags,
      order: post.order,
      seo_title: post.seo_title ?? "",
      seo_description: post.seo_description ?? "",
      focus_keyword: post.focus_keyword ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const payload: PostUpsert = {
      ...form,
      slug: slugify(form.slug || form.title),
      order: Math.max(0, form.order),
    };

    if (!payload.slug || !payload.title.trim()) {
      setError("Slug và tiêu đề là bắt buộc.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        const updated = await updatePost(token, editingId, payload);
        setPosts((prev) => sortByOrder(prev.map((item) => (item.id === updated.id ? updated : item))));
        setNotice("Đã cập nhật tin tức.");
      } else {
        const created = await createPost(token, payload);
        setPosts((prev) => sortByOrder([...prev, created]));
        setNotice("Đã tạo tin tức.");
      }
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được tin tức.");
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
      await deletePost(token, pendingDeleteId);
      setPosts((prev) => prev.filter((item) => item.id !== pendingDeleteId));
      setNotice("Đã xóa tin tức.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa tin tức.");
    } finally {
      setDeleting(false);
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!token) return;
    setUploadingCover(true);
    try {
      const uploaded = await uploadImage(token, file, "cover");
      setForm((prev) => ({ ...prev, cover_image: uploaded.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể upload ảnh bìa.");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
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
      title="Tin tức"
      subtitle="Quản lý tin tức — hiển thị tại /tin-tuc."
      onLogout={logout}
      actions={
        <button
          type="button"
          onClick={handleOpenCreate}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
        >
          Thêm tin tức
        </button>
      }
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-500">{loaded ? `${posts.length} tin tức` : "Đang tải..."}</p>
        <div className="grid gap-3">
          {posts.map((post) => (
            <article key={post.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">{post.title}</p>
                  <p className="text-xs text-stone-500">
                    /tin-tuc/{post.slug} · order {post.order} ·{" "}
                    {post.is_published ? "Đã xuất bản" : "Nháp"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(post)}
                    className="rounded-lg border border-stone-300 px-3 py-1 text-xs text-stone-700"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(post.id)}
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
          {loaded && posts.length === 0 && <p className="text-sm text-stone-500">Chưa có tin tức nào.</p>}
        </div>
      </section>

      <AdminModal
        open={modalOpen}
        onClose={resetModal}
        title={editing ? "Sửa tin tức" : "Thêm tin tức"}
        description="Nhập đầy đủ thông tin tin tức."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetModal} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">
              Hủy
            </button>
            <button
              type="submit"
              form="post-editor-form"
              disabled={saving}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        }
      >
        <form id="post-editor-form" className="space-y-3" onSubmit={handleSave}>
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
            <div className="grid gap-1 text-sm font-semibold text-stone-700">
              Ảnh bìa
              <div className="flex gap-2">
                <input
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
                  placeholder="https://... hoặc upload bên phải"
                  value={form.cover_image ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cover_image: event.target.value || null }))
                  }
                />
                <button
                  type="button"
                  disabled={uploadingCover}
                  onClick={() => coverInputRef.current?.click()}
                  className="shrink-0 rounded-xl border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                >
                  {uploadingCover ? "Đang tải..." : "Upload"}
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) void handleUploadCover(e.target.files[0]); }}
                />
              </div>
              {form.cover_image && (
                <div className="relative mt-1 h-32 w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.cover_image} alt="Ảnh bìa" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, cover_image: null }))}
                    className="absolute right-2 top-2 rounded-lg bg-white/80 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-white"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>
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
              placeholder="Soạn nội dung tin tức."
            />
          </div>

          <div className="grid gap-1 text-sm font-semibold text-stone-700">
            Tags
            <TagInput
              tags={form.tags}
              onChange={(next) => setForm((prev) => ({ ...prev, tags: next }))}
              placeholder="in ảnh, hướng dẫn, khổ ảnh..."
              maxTags={10}
            />
            <span className="text-[11px] font-normal text-stone-400">
              Nhập tag rồi Enter hoặc dấu phẩy. Tags dùng làm từ khóa SEO và hiển thị trên tin tức.
            </span>
          </div>

          {/* SEO */}
          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-stone-400">SEO</p>

            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              <div className="flex justify-between">
                <span>Tiêu đề SEO</span>
                <span className={`text-xs font-normal ${form.seo_title.length > 60 ? "text-amber-600" : "text-stone-400"}`}>
                  {form.seo_title.length}/70
                </span>
              </div>
              <input
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
                placeholder={`${form.title || "Tiêu đề tin tức"} | ${typeof window !== "undefined" ? window.location.hostname : "inanh24h.com"}`}
                value={form.seo_title}
                onChange={(e) => setForm((prev) => ({ ...prev, seo_title: e.target.value }))}
                maxLength={70}
              />
              <span className="text-[11px] font-normal text-stone-400">Để trống sẽ dùng tiêu đề tin tức. Lý tưởng: 50–60 ký tự.</span>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              <div className="flex justify-between">
                <span>Mô tả SEO</span>
                <span className={`text-xs font-normal ${form.seo_description.length > 155 ? "text-amber-600" : "text-stone-400"}`}>
                  {form.seo_description.length}/160
                </span>
              </div>
              <textarea
                className="min-h-16 rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
                placeholder={form.summary || "Mô tả ngắn xuất hiện trên Google và mạng xã hội..."}
                value={form.seo_description}
                onChange={(e) => setForm((prev) => ({ ...prev, seo_description: e.target.value }))}
                maxLength={160}
              />
              <span className="text-[11px] font-normal text-stone-400">Để trống sẽ dùng tóm tắt. Lý tưởng: 120–155 ký tự.</span>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-stone-700">
              Từ khóa trọng tâm
              <input
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal"
                placeholder="vd: in ảnh canvas"
                value={form.focus_keyword}
                onChange={(e) => setForm((prev) => ({ ...prev, focus_keyword: e.target.value }))}
                maxLength={100}
              />
              <span className="text-[11px] font-normal text-stone-400">Từ khóa chính cần có trong tiêu đề và nội dung bài.</span>
            </label>
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
        title="Xác nhận xóa tin tức"
        description="Bạn có chắc chắn muốn xóa tin tức này không?"
        confirmLabel="Xóa tin tức"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
