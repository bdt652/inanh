"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createPage, listPages, updatePage, uploadImage } from "../../admin/api";
import { TOKEN_KEY } from "../../admin/constants";
import type { PageUpsert } from "../../admin/types";
import { toHtmlPath } from "../../lib/paths";
import PageContentEditor from "../PageContentEditor";

const EMPTY_FORM: PageUpsert = {
  slug: "",
  path: "",
  title: "",
  summary: "",
  content: "",
  is_published: true,
  order: 0,
};

function buildPublicPageHref(rawPath: string): string {
  if (!rawPath.trim()) return "";
  const htmlPath = toHtmlPath(rawPath);
  if (typeof window === "undefined") {
    return htmlPath;
  }
  return `${window.location.origin}${htmlPath}`;
}

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function AdminLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/admin" className="font-medium text-emerald-700">
      {children}
    </Link>
  );
}

type PageEditorProps = {
  mode: "create" | "edit";
  pageId?: string;
};

export default function PageEditor({ mode, pageId }: PageEditorProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [form, setForm] = useState<PageUpsert>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fetching, setFetching] = useState(mode === "edit");

  const pageLabel = useMemo(() => (mode === "create" ? "Thêm trang" : "Sửa trang"), [mode]);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !pageId || !token) return;
    setFetching(true);
    listPages(token)
      .then((list) => {
        const page = list.find((item) => item.id === pageId);
        if (!page) {
          setError("Không tìm thấy trang cần sửa.");
          return;
        }
        setForm({
          slug: page.slug,
          path: page.path,
          title: page.title,
          summary: page.summary,
          content: page.content,
          is_published: page.is_published,
          order: page.order,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Không thể tải trang."))
      .finally(() => setFetching(false));
  }, [mode, pageId, token]);

  const ensureToken = (): string | null => {
    if (token) return token;
    const stored = getStoredToken();
    if (stored) {
      setToken(stored);
      return stored;
    }
    setError("Bạn cần đăng nhập trước tại trang quản trị.");
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const authToken = ensureToken();
    if (!authToken) return;

    if (!form.slug.trim() || !form.path.trim() || !form.title.trim()) {
      setError("Slug, đường dẫn và tiêu đề là bắt buộc.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "create") {
        await createPage(authToken, form);
        setNotice("Đã tạo trang.");
      } else if (pageId) {
        await updatePage(authToken, pageId, form);
        setNotice("Đã cập nhật trang.");
      }
      router.push("/admin/pages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu trang.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-lg">
          <p className="text-lg font-semibold text-stone-900">Bạn chưa đăng nhập.</p>
          <p className="mt-2 text-sm text-stone-500">
            Hãy vào <AdminLink>trang quản trị</AdminLink> để đăng nhập trước.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl rounded-3xl border border-stone-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Quản trị trang</p>
            <h1 className="text-2xl font-semibold text-stone-900">{pageLabel}</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700"
              onClick={() => router.push("/admin/pages")}
            >
              Trở về danh sách
            </button>
            {form.path.trim() && (
              <button
                type="button"
                className="rounded-xl border border-emerald-300 px-4 py-2 text-xs font-medium text-emerald-700"
                onClick={() => window.open(buildPublicPageHref(form.path), "_blank", "noopener,noreferrer")}
              >
                Xem trang web
              </button>
            )}
          </div>
        </header>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
        {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{notice}</p>}

        {fetching ? (
          <p className="mt-6 text-sm text-stone-500">Đang tải dữ liệu trang…</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Đường dẫn tĩnh (slug)
              <input
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                placeholder="gioi-thieu"
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Đường dẫn
              <input
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                placeholder="Ví dụ: /gioi-thieu"
                value={form.path}
                onChange={(event) => setForm({ ...form, path: event.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Tiêu đề
              <input
                className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                placeholder="Tiêu đề trang"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-stone-700">
              Tóm tắt
              <textarea
                className="min-h-20 rounded-xl border border-stone-300 px-3 py-2 text-sm"
                placeholder="Mô tả ngắn cho SEO"
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
              />
            </label>
            <div className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Nội dung</span>
              <PageContentEditor
                value={form.content}
                onChange={(next) => setForm({ ...form, content: next })}
                onUploadImage={async (file) => {
                  const authToken = ensureToken();
                  if (!authToken) throw new Error("Thiếu phiên đăng nhập.");
                  const uploaded = await uploadImage(authToken, file);
                  return uploaded.url;
                }}
                placeholder="Soạn nội dung phong phú, dán từ Word, thêm ảnh, heading..."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-stone-700">
                Thứ tự
                <input
                  className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, order: Number(event.target.value) || 0 }))
                  }
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-stone-300 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(event) => setForm({ ...form, is_published: event.target.checked })}
                />
                Xuất bản ngay
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-stone-900 px-6 py-2 text-sm font-medium text-white"
                disabled={loading}
              >
                {mode === "create" ? "Tạo trang" : "Lưu thay đổi"}
              </button>
              <button
                type="button"
                className="rounded-xl border border-stone-300 px-4 py-2 text-sm text-stone-700"
                onClick={() => router.back()}
                disabled={loading}
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
