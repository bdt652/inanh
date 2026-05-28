"use client";

import { useState, type FormEvent } from "react";

import { resolveApiBase } from "../../lib/api-base";
import type { ReviewStats } from "../../lib/content";

type Props = {
  productSlug: string;
  initialStats: ReviewStats | null;
};

const STAR_LABELS = ["", "1 sao", "2 sao", "3 sao", "4 sao", "5 sao"];

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <span aria-label={`${value} trên ${max} sao`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rounded ? "text-amber-400" : "text-stone-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function ProductReviews({ productSlug, initialStats }: Props) {
  const [stats, setStats] = useState<ReviewStats | null>(initialStats);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewerName, setReviewerName] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewerName.trim() || !body.trim()) {
      setError("Vui lòng nhập tên và nội dung đánh giá.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const API_BASE = resolveApiBase();
      const response = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_slug: productSlug,
          rating,
          body: body.trim(),
          reviewer_name: reviewerName.trim(),
        }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail ?? "Không gửi được đánh giá.");
      }
      setSubmitted(true);
      setShowForm(false);
      setBody("");
      setReviewerName("");
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviews = stats?.reviews ?? [];

  return (
    <section className="mt-10 border-t border-[var(--line)] pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-[0.16em]">Đánh giá từ khách hàng</h2>
          {stats && stats.review_count > 0 && (
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              <StarRating value={stats.average_rating} />
              {" "}
              <span className="font-semibold">{stats.average_rating.toFixed(1)}</span>
              {" / 5"} · {stats.review_count} đánh giá
            </p>
          )}
        </div>
        {!showForm && !submitted && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-none border border-[var(--accent-strong)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
          >
            Viết đánh giá
          </button>
        )}
      </div>

      {submitted && (
        <p className="mt-4 rounded-none border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Cảm ơn bạn! Đánh giá của bạn đang chờ duyệt và sẽ hiển thị sau khi được xác nhận.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-none border border-[var(--line)] p-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em]">Gửi đánh giá của bạn</h3>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">Đánh giá</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={STAR_LABELS[star]}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="text-2xl leading-none transition"
                >
                  <span className={(hoverRating || rating) >= star ? "text-amber-400" : "text-stone-300"}>★</span>
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Tên của bạn
            <input
              required
              className="rounded-none border border-[var(--line)] px-3 py-2 text-sm"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Nguyễn Văn A"
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-soft)]">
            Nội dung đánh giá
            <textarea
              required
              minLength={10}
              className="min-h-24 rounded-none border border-[var(--line)] px-3 py-2 text-sm"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-none border border-[var(--accent-strong)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-strong)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
            >
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); }}
              className="rounded-none border border-[var(--line)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {reviews.length > 0 && (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="border-b border-[var(--line)] pb-4 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{review.reviewer_name}</span>
                <StarRating value={review.rating} />
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-soft)]">{review.body}</p>
            </article>
          ))}
        </div>
      )}

      {reviews.length === 0 && !showForm && !submitted && (
        <p className="mt-4 text-sm text-[var(--text-soft)]">Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá!</p>
      )}
    </section>
  );
}
