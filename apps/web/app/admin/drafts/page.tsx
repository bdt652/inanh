"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import { deleteAdminDraft, getAdminDraft, listAdminDrafts } from "../api";
import type { AdminDraftDetail, AdminDraftSummary } from "../types";
import { useAdminToken } from "../useAdminToken";
import { resolveFileBase } from "../../lib/api-base";
import { shouldSkipImageOptimization } from "../../lib/image";
import { useToastMessages } from "../../components/ToastProvider";

const formatTime = (value: number) => new Date(value * 1000).toLocaleString("vi-VN");

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const FILE_BASE = resolveFileBase();

const buildDownloadUrl = (value: string, fileBase: string = FILE_BASE): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (isAbsoluteUrl(trimmed)) return trimmed;
  const normalized = trimmed.replace(/^\/+/, "");
  if (normalized.toLowerCase().startsWith("uploads/")) {
    return `${fileBase}/${normalized.slice("uploads/".length)}`;
  }
  return `${fileBase}/${normalized}`;
};

const extractFileName = (value: string): string => {
  const cleaned = value.split("?")[0].trim();
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || "image";
};

const downloadFromUrl = async (url: string, filename: string): Promise<void> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Không tải được ảnh.");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export default function AdminDraftsPage() {
  const { token, logout } = useAdminToken();
  const uploadsBase = useMemo(() => resolveFileBase(), []);
  const [drafts, setDrafts] = useState<AdminDraftSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminDraftDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadBusy, setDownloadBusy] = useState(false);
  useToastMessages({ error, notice, setError, setNotice });

  const loadDrafts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await listAdminDrafts(token);
      setDrafts(data);
      if (data.length && !selectedId) {
        setSelectedId(data[0].user_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được nháp.");
    } finally {
      setLoading(false);
    }
  }, [token, selectedId]);

  const loadDetail = useCallback(
    async (userId: string) => {
      if (!token) return;
      setDetailLoading(true);
      setError("");
      try {
        const data = await getAdminDraft(token, userId);
        setDetail(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được chi tiết lưu nháp.");
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      loadDrafts();
    }
  }, [token, loadDrafts]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const filteredDrafts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return drafts;
    return drafts.filter((draft) => draft.user_id.toLowerCase().includes(keyword));
  }, [drafts, searchTerm]);

  useEffect(() => {
    if (selectedId && filteredDrafts.some((draft) => draft.user_id === selectedId)) {
      return;
    }
    if (filteredDrafts.length) {
      setSelectedId(filteredDrafts[0].user_id);
    } else {
      setSelectedId(null);
    }
  }, [filteredDrafts, selectedId]);

  const handleDelete = async () => {
    if (!token || !selectedId) return;
    if (!window.confirm("Xóa lưu nháp này?")) return;
    setDeleting(true);
    setError("");
    setNotice("");
    try {
      await deleteAdminDraft(token, selectedId);
      const remaining = drafts.filter((item) => item.user_id !== selectedId);
      setDrafts(remaining);
      setSelectedId(remaining.length ? remaining[0].user_id : null);
      setDetail(null);
      setNotice("Đã xóa lưu nháp.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại.");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadAll = async (keys: string[]) => {
    if (!keys.length) return;
    setDownloadBusy(true);
    setError("");
    setNotice("");
    try {
      for (const key of keys) {
        const url = buildDownloadUrl(key, uploadsBase);
        await downloadFromUrl(url, extractFileName(key));
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      setNotice("Đã bắt đầu tải tất cả ảnh.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được tất cả ảnh.");
    } finally {
      setDownloadBusy(false);
    }
  };

  const totalImages = useMemo(
    () => filteredDrafts.reduce((sum, draft) => sum + draft.total_images, 0),
    [filteredDrafts]
  );

  const totalProducts = useMemo(
    () => filteredDrafts.reduce((sum, draft) => sum + draft.total_products, 0),
    [filteredDrafts]
  );

  const allDraftKeys = useMemo(
    () => (detail ? detail.products.flatMap((product) => product.previews.map((preview) => preview.key)) : []),
    [detail]
  );

  const selectedSummary = useMemo(
    () => drafts.find((draft) => draft.user_id === selectedId) ?? null,
    [drafts, selectedId]
  );

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Quản trị lưu nháp"
      subtitle="Theo dõi đơn hàng đang được lưu nháp."
      onLogout={logout}
      actions={
        <button
          type="button"
          onClick={loadDrafts}
          className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Danh sách lưu nháp</p>
          <div className="mt-3 grid gap-2">
            <input
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
              placeholder="Tìm theo số điện thoại"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
              {filteredDrafts.length} nháp - {totalProducts} sản phẩm - {totalImages} ảnh
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {filteredDrafts.map((draft) => {
              const active = draft.user_id === selectedId;
              return (
                <button
                  key={draft.user_id}
                  type="button"
                  onClick={() => setSelectedId(draft.user_id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 bg-white text-stone-700 hover:border-emerald-200"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{draft.user_id}</p>
                  <p className="text-xs text-stone-500">
                    {draft.total_images} ảnh - {draft.total_products} sản phẩm
                  </p>
                  <p className="text-xs text-stone-400">Lưu lúc: {formatTime(draft.saved_at)}</p>
                </button>
              );
            })}
            {!filteredDrafts.length && !loading && (
              <p className="text-sm text-stone-500">Chưa có lưu nháp.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          {detailLoading && <p className="text-sm text-stone-500">Đang tải chi tiết...</p>}
          {!detailLoading && detail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Chi tiết lưu nháp</p>
                  <h2 className="text-lg font-semibold text-stone-900">{detail.user_id}</h2>
                  <p className="text-xs text-stone-500">Lưu lúc: {formatTime(detail.saved_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allDraftKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleDownloadAll(allDraftKeys)}
                      className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
                      disabled={downloadBusy}
                    >
                      {downloadBusy ? "Đang tải..." : "Tải tất cả ảnh"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600"
                    disabled={deleting}
                  >
                    {deleting ? "Đang xóa..." : "Xóa lưu nháp"}
                  </button>
                </div>
              </div>

              {detail.note && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Ghi chú</p>
                  <p className="mt-2">{detail.note}</p>
                </div>
              )}

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm font-semibold text-stone-900">Sản phẩm đã lưu</p>
                <div className="mt-3 space-y-2">
                  {detail.products.map((product, index) => {
                    const totalPreviews = product.previews.length;
                    const duplicateCount = product.previews.filter((preview) => preview.status === "duplicate").length;
                    const readyCount = totalPreviews - duplicateCount;
                    return (
                      <div key={`${product.name}-${index}`} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-stone-900">{product.name}</p>
                          <span className="text-xs text-stone-500">
                            {totalPreviews} ảnh - ready {readyCount} - dup {duplicateCount}
                          </span>
                        </div>
                        {product.selected_product_slug && (
                          <p className="text-xs text-stone-500">Sản phẩm chọn: {product.selected_product_slug}</p>
                        )}
                        {product.notes && <p className="text-xs text-stone-500">Ghi chú: {product.notes}</p>}
                        <p className="text-xs text-stone-500">Giá / ảnh: {product.price_per_image}</p>
                        {product.selected_options.length > 0 && (
                          <p className="text-xs text-stone-500">Tùy chọn: {product.selected_options.join(", ")}</p>
                        )}
                        {product.previews.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-xs text-stone-500">Ảnh: {product.previews.length}</p>
                              <button
                                type="button"
                                onClick={() => void handleDownloadAll(product.previews.map((preview) => preview.key))}
                                className="rounded-lg border border-stone-200 px-2 py-1 text-[11px]"
                                disabled={downloadBusy}
                              >
                                {downloadBusy ? "Đang tải..." : "Tải tất cả"}
                              </button>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {product.previews.map((preview) => {
                                const url = buildDownloadUrl(preview.key, uploadsBase);
                                return (
                                  <div key={preview.key} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                                    <div className="aspect-square w-full overflow-hidden rounded-md border border-stone-200 bg-white relative">
                                      <Image
                                        src={url}
                                        alt={preview.name}
                                        fill
                                        sizes="160px"
                                        className="object-cover"
                                        unoptimized={shouldSkipImageOptimization(url)}
                                      />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                      <span className="truncate text-[10px] text-stone-500">
                                        {preview.name} ({preview.status ?? "ready"})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => void downloadFromUrl(url, extractFileName(preview.key))}
                                        className="rounded-md border border-stone-200 px-2 py-1 text-[10px]"
                                      >
                                        Tải
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-stone-500">Chưa có ảnh.</p>
                        )}
                      </div>
                    );
                  })}
                  {!detail.products.length && <p className="text-sm text-stone-500">Chưa có sản phẩm.</p>}
                </div>
              </div>
            </div>
          ) : (
            !detailLoading && <p className="text-sm text-stone-500">Chọn lưu nháp để xem chi tiết.</p>
          )}
          {!detail && selectedSummary && (
            <p className="mt-3 text-xs text-stone-400">
              {selectedSummary.total_images} ảnh - {selectedSummary.total_products} sản phẩm
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
