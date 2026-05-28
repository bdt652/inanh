"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminNeedLogin from "../AdminNeedLogin";
import AdminShell from "../AdminShell";
import { downloadAdminOrderArchive, getAdminOrder, listAdminOrders, updateAdminOrder } from "../api";
import type { AdminOrderDetail, AdminOrderSummary, AdminOrderProduct } from "../types";
import { useAdminToken } from "../useAdminToken";
import { resolveFileBase } from "../../lib/api-base";
import { shouldSkipImageOptimization } from "../../lib/image";
import { useToastMessages } from "../../components/ToastProvider";

const formatTime = (value: number) => new Date(value * 1000).toLocaleString("vi-VN");
const STATUS_PRESETS = ["new", "processing", "done", "cancel"];

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

const resolveTotalCopies = (product: AdminOrderProduct): number => {
  if (product.image_copies && product.image_copies.length > 0) {
    return product.image_copies.reduce((sum, entry) => sum + Math.max(1, entry.copies || 1), 0);
  }
  return (product.copies_per_image ?? 1) * product.images.length;
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

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

export default function AdminOrdersPage() {
  const { token, logout } = useAdminToken();
  const uploadsBase = useMemo(() => resolveFileBase(), []);
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusInput, setStatusInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  useToastMessages({ error, notice, setError, setNotice });

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await listAdminOrders(token);
      setOrders(data);
      if (data.length && !selectedId) {
        setSelectedId(data[0].order_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [token, selectedId]);

  const loadDetail = useCallback(
    async (orderId: string) => {
      if (!token) return;
      setDetailLoading(true);
      setError("");
      try {
        const data = await getAdminOrder(token, orderId);
        setDetail(data);
        setStatusInput(data.status);
        setNoteInput(data.note ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không tải được chi tiết đơn.");
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token, loadOrders]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(new Set(orders.map((order) => order.status).filter(Boolean)));
    return ["all", ...unique];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (!keyword) return true;
      return (
        order.order_id.toLowerCase().includes(keyword) ||
        order.user_id.toLowerCase().includes(keyword) ||
        order.status.toLowerCase().includes(keyword)
      );
    });
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    if (selectedId && filteredOrders.some((order) => order.order_id === selectedId)) {
      return;
    }
    if (filteredOrders.length) {
      setSelectedId(filteredOrders[0].order_id);
    } else {
      setSelectedId(null);
    }
  }, [filteredOrders, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setMobileView("list");
    }
  }, [selectedId]);

  const handleUpdate = async () => {
    if (!token || !detail) return;
    setNotice("");
    setError("");
    try {
      const updated = await updateAdminOrder(token, detail.order_id, {
        status: statusInput.trim(),
        note: noteInput.trim(),
      });
      setDetail(updated);
      setOrders((prev) =>
        prev.map((item) =>
          item.order_id === updated.order_id ? { ...item, status: updated.status, updated_at: updated.updated_at } : item
        )
      );
      setNotice("Đã cập nhật đơn hàng.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại.");
    }
  };

  const handleDownloadArchive = async (orderId: string) => {
    if (!token) return;
    setDownloadBusy(true);
    setError("");
    setNotice("");
    try {
      const { blob, filename } = await downloadAdminOrderArchive(token, orderId);
      triggerBlobDownload(blob, filename);
      setNotice("Đã tải file nén đơn hàng.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được file nén.");
    } finally {
      setDownloadBusy(false);
    }
  };

  const totalImages = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + order.total_images, 0),
    [filteredOrders]
  );

  const totalProducts = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + order.total_products, 0),
    [filteredOrders]
  );

  const hasOrderImages = useMemo(
    () => detail?.products.some((product) => product.images.length > 0) ?? false,
    [detail]
  );

  const selectedSummary = useMemo(
    () => orders.find((order) => order.order_id === selectedId) ?? null,
    [orders, selectedId]
  );

  if (!token) return <AdminNeedLogin />;

  return (
    <AdminShell
      title="Quản trị đơn hàng"
      subtitle="Xem và cập nhật trạng thái đơn hàng."
      onLogout={logout}
      actions={
        <button
          type="button"
          onClick={loadOrders}
          className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700"
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
        <div className="flex w-full rounded-full border border-stone-200 bg-white p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={`flex-1 rounded-full px-3 py-2 transition ${
              mobileView === "list" ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            Danh sách
          </button>
          <button
            type="button"
            onClick={() => setMobileView("detail")}
            className={`flex-1 rounded-full px-3 py-2 transition ${
              mobileView === "detail" ? "bg-stone-900 text-white" : "text-stone-600"
            }`}
          >
            Chi tiết
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div
          className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${
            mobileView === "list" ? "block" : "hidden"
          } lg:block`}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Danh sách đơn</p>
          <div className="mt-3 grid gap-2">
            <input
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
              placeholder="Tim ma don / user / status"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "Tất cả trạng thái" : status}
                </option>
              ))}
            </select>
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
              {filteredOrders.length} don - {totalProducts} san pham - {totalImages} anh
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {filteredOrders.map((order) => {
              const active = order.order_id === selectedId;
              return (
                <button
                  key={order.order_id}
                  type="button"
                  onClick={() => {
                    setSelectedId(order.order_id);
                    setMobileView("detail");
                  }}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-stone-200 bg-white text-stone-700 hover:border-emerald-200"
                  }`}
                >
                  <p className="break-all text-xs uppercase tracking-[0.2em] text-stone-400">{order.order_id}</p>
                  <p className="font-semibold text-stone-900">{order.status}</p>
                  <p className="text-xs text-stone-500">
                    {order.total_images} anh - {order.total_products} san pham
                  </p>
                  <p className="break-all text-xs text-stone-400">User: {order.user_id}</p>
                  <p className="text-xs text-stone-400">Cập nhật: {formatTime(order.updated_at)}</p>
                </button>
              );
            })}
            {!filteredOrders.length && !loading && (
              <p className="text-sm text-stone-500">Chưa có đơn hàng.</p>
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${
            mobileView === "detail" ? "block" : "hidden"
          } lg:block`}
        >
          {detailLoading && <p className="text-sm text-stone-500">Đang tải chi tiết...</p>}
          {!detailLoading && detail ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">Chi tiết đơn</p>
                  <h2 className="break-all text-lg font-semibold text-stone-900">#{detail.order_id}</h2>
                  <p className="break-all text-xs text-stone-500">User: {detail.user_id}</p>
                </div>
                <div className="text-left text-xs text-stone-500 sm:text-right">
                  <p>Tạo lúc: {formatTime(detail.created_at)}</p>
                  <p>Cập nhật: {formatTime(detail.updated_at)}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  Trang thai
                  <input
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    value={statusInput}
                    onChange={(event) => setStatusInput(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-stone-700">
                  Ghi chú
                  <input
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    value={noteInput}
                    onChange={(event) => setNoteInput(event.target.value)}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setStatusInput(preset)}
                    className="rounded-lg border border-stone-200 px-3 py-1 text-xs text-stone-600"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {hasOrderImages && (
                <button
                  type="button"
                  onClick={() => void handleDownloadArchive(detail.order_id)}
                  className="w-full rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 sm:w-auto"
                  disabled={downloadBusy}
                >
                  {downloadBusy ? "Đang tải..." : "Tải file nén đơn hàng"}
                </button>
              )}
              <button
                type="button"
                onClick={handleUpdate}
                className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white sm:w-auto"
              >
                Cập nhật
              </button>

              {(detail.shipping_name || detail.shipping_phone || detail.shipping_address) && (
                <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    Thông tin giao hàng
                  </p>
                  <div className="mt-2 space-y-1">
                    <p>
                      Tên người nhận:{" "}
                      <span className="font-semibold text-stone-900">{detail.shipping_name || "Chưa có"}</span>
                    </p>
                    <p>
                      Số điện thoại:{" "}
                      <span className="font-semibold text-stone-900">{detail.shipping_phone || "Chưa có"}</span>
                    </p>
                    <p>
                      Địa chỉ:{" "}
                      <span className="font-semibold text-stone-900">{detail.shipping_address || "Chưa có"}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm font-semibold text-stone-900">Sản phẩm</p>
                <div className="mt-3 space-y-2">
                  {detail.products.map((product) => (
                    <div key={product.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="break-words font-semibold text-stone-900">{product.name}</p>
                        <span className="text-xs text-stone-500">
                          {product.images.length} anh - {resolveTotalCopies(product)} ban
                        </span>
                      </div>
                      {product.notes && <p className="text-xs text-stone-500">Ghi chú: {product.notes}</p>}
                      {product.options.length > 0 && (
                        <p className="text-xs text-stone-500">Tùy chọn: {product.options.join(", ")}</p>
                      )}
                      {product.selected_product_slug && (
                        <p className="text-xs text-stone-500">Slug: {product.selected_product_slug}</p>
                      )}
                      {product.images.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-xs text-stone-500">Anh: {product.images.length}</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {product.images.map((image) => {
                              const url = buildDownloadUrl(image, uploadsBase);
                              return (
                                <div key={image} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                                  <div className="aspect-square w-full overflow-hidden rounded-md border border-stone-200 bg-white relative">
                                    <Image
                                      src={url}
                                      alt={product.name}
                                      fill
                                      sizes="160px"
                                      className="object-cover"
                                      unoptimized={shouldSkipImageOptimization(url)}
                                    />
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="truncate text-[10px] text-stone-500">{extractFileName(image)}</span>
                                    <button
                                      type="button"
                                      onClick={() => void downloadFromUrl(url, extractFileName(image))}
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
                  ))}
                </div>
              </div>
            </div>
          ) : (
            !detailLoading && <p className="text-sm text-stone-500">Chọn đơn hàng để xem chi tiết.</p>
          )}
          {!detail && selectedSummary && (
            <p className="mt-3 text-xs text-stone-400">
              {selectedSummary.total_images} anh - {selectedSummary.total_products} san pham
            </p>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
