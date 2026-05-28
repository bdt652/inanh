"use client";

import { useEffect, useState } from "react";

import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import ConfirmActionModal from "../ConfirmActionModal";
import { approveReview, createReview, deleteReview, listReviews } from "../api";
import type { ReviewRecord } from "../types";
import { useAdminToken } from "../useAdminToken";

export default function AdminReviewsPage() {
  const { token, logout } = useAdminToken();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filterApproved, setFilterApproved] = useState<"all" | "pending" | "approved">("pending");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState({ product_slug: "", reviewer_name: "", rating: 5, body: "" });

  useEffect(() => {
    if (!token) return;
    const opts =
      filterApproved === "pending"
        ? { is_approved: false }
        : filterApproved === "approved"
          ? { is_approved: true }
          : undefined;
    listReviews(token, opts)
      .then(setReviews)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được đánh giá."))
      .finally(() => setLoaded(true));
  }, [token, filterApproved]);

  const handleApprove = async (id: string, approved: boolean) => {
    if (!token) return;
    setActionBusy(id);
    setError("");
    setNotice("");
    try {
      const updated = await approveReview(token, id, approved);
      setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setNotice(approved ? "Đã duyệt đánh giá." : "Đã từ chối đánh giá.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thực hiện được.");
    } finally {
      setActionBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!token || !pendingDeleteId) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await deleteReview(token, pendingDeleteId);
      setReviews((prev) => prev.filter((r) => r.id !== pendingDeleteId));
      setNotice("Đã xóa đánh giá.");
      setPendingDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa đánh giá.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreateBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await createReview(token, createForm);
      setReviews((prev) => [created, ...prev]);
      setCreateForm({ product_slug: "", reviewer_name: "", rating: 5, body: "" });
      setShowCreateForm(false);
      setNotice("Đã thêm đánh giá và tự động duyệt.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thêm được đánh giá.");
    } finally {
      setCreateBusy(false);
    }
  };

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Đánh giá sản phẩm"
      subtitle="Duyệt và quản lý đánh giá từ khách hàng."
      onLogout={logout}
    >
      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {(["pending", "approved", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilterApproved(f)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              filterApproved === f
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-stone-300 text-stone-700"
            }`}
          >
            {f === "pending" ? "Chờ duyệt" : f === "approved" ? "Đã duyệt" : "Tất cả"}
          </button>
        ))}
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
        >
          {showCreateForm ? "Hủy" : "+ Thêm đánh giá"}
        </button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-5"
        >
          <p className="text-sm font-semibold text-stone-700">Thêm đánh giá từ khách hàng thực</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Slug sản phẩm</label>
              <input
                required
                value={createForm.product_slug}
                onChange={(e) => setCreateForm((f) => ({ ...f, product_slug: e.target.value }))}
                placeholder="in-anh-10x15cm-ep-plastic-ep-lua"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Tên khách hàng</label>
              <input
                required
                value={createForm.reviewer_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, reviewer_name: e.target.value }))}
                placeholder="Nguyễn Thị A"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Số sao (1–5)</label>
            <select
              value={createForm.rating}
              onChange={(e) => setCreateForm((f) => ({ ...f, rating: Number(e.target.value) }))}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{"★".repeat(n)} ({n} sao)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Nội dung đánh giá (tối thiểu 10 ký tự)</label>
            <textarea
              required
              minLength={10}
              rows={3}
              value={createForm.body}
              onChange={(e) => setCreateForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Ảnh in sắc nét, màu chuẩn, giao hàng nhanh..."
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={createBusy}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {createBusy ? "Đang lưu..." : "Lưu đánh giá (tự động duyệt)"}
          </button>
        </form>
      )}

      <section className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-stone-500">{loaded ? `${reviews.length} đánh giá` : "Đang tải..."}</p>
        <div className="grid gap-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">{review.reviewer_name}</span>
                    <span className="text-xs text-stone-500">
                      {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                        review.is_approved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {review.is_approved ? "Đã duyệt" : "Chờ duyệt"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{review.product_slug}</p>
                  <p className="mt-1 text-sm text-stone-700">{review.body}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!review.is_approved && (
                    <button
                      type="button"
                      disabled={actionBusy === review.id}
                      onClick={() => void handleApprove(review.id, true)}
                      className="rounded-lg border border-emerald-300 px-3 py-1 text-xs text-emerald-700 disabled:opacity-50"
                    >
                      Duyệt
                    </button>
                  )}
                  {review.is_approved && (
                    <button
                      type="button"
                      disabled={actionBusy === review.id}
                      onClick={() => void handleApprove(review.id, false)}
                      className="rounded-lg border border-amber-300 px-3 py-1 text-xs text-amber-700 disabled:opacity-50"
                    >
                      Hủy duyệt
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(review.id)}
                    className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-600"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
          {loaded && reviews.length === 0 && (
            <p className="text-sm text-stone-500">
              {filterApproved === "pending" ? "Không có đánh giá chờ duyệt." : "Không có đánh giá nào."}
            </p>
          )}
        </div>
      </section>

      <ConfirmActionModal
        open={Boolean(pendingDeleteId)}
        busy={deleting}
        title="Xác nhận xóa đánh giá"
        description="Bạn có chắc chắn muốn xóa đánh giá này không?"
        confirmLabel="Xóa đánh giá"
        onConfirm={() => void handleDelete()}
        onClose={() => setPendingDeleteId(null)}
      />
    </AdminShell>
  );
}
