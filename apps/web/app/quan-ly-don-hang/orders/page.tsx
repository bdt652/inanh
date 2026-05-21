"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getMyOrders, getOrderDetail, type OrderDetail, type OrderSummary } from "../../lib/customer-api";
import { resolveFileBase } from "../../lib/api-base";
import { shouldSkipImageOptimization } from "../../lib/image";
import { useCustomerToken } from "../../lib/use-customer-token";
import { useToastMessages } from "../../components/ToastProvider";

const formatTime = (value: number) => new Date(value * 1000).toLocaleString("vi-VN");

const formatSubtitle = (order: OrderSummary) => {
  if (order.total_products === 0) {
    return `${order.total_images} anh`;
  }
  return `${order.total_products} san pham - ${order.total_images} anh`;
};

const FILE_BASE = resolveFileBase();

const resolveImageUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleaned = trimmed.replace(/^\/+/, "");
  // Handle both /uploads/xxx and xxx formats
  if (cleaned.startsWith("uploads/")) {
    const root = FILE_BASE.replace(/\/uploads$/i, "");
    return `${root}/${cleaned}`;
  }
  return `${FILE_BASE}/${cleaned}`;
};

const normalizeStatus = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const resolveStatusTone = (status: string) => {
  const normalized = normalizeStatus(status);
  if (normalized.includes("hoan") || normalized.includes("xong") || normalized.includes("done")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("huy") || normalized.includes("cancel") || normalized.includes("tu choi")) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (normalized.includes("dang") || normalized.includes("cho") || normalized.includes("pending")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-stone-200 bg-stone-50 text-stone-600";
};

const resolveTotalCopies = (product: OrderDetail["products"][number]): number => {
  if (product.image_copies && product.image_copies.length > 0) {
    return product.image_copies.reduce((sum, entry) => sum + Math.max(1, entry.copies || 1), 0);
  }
  return (product.copies_per_image ?? 1) * product.images.length;
};

export default function OrdersPage() {
  const { token } = useCustomerToken();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  useToastMessages({ error, setError });

  const selectedOrderDetail = selectedOrderId ? orderDetails[selectedOrderId] : undefined;

  const loadOrderDetail = useCallback(
    async (orderId: string) => {
      if (!token) return;
      setDetailLoading(true);
      setError("");
      try {
        const detail = await getOrderDetail(token, orderId);
        setOrderDetails((prev) => ({ ...prev, [orderId]: detail }));
        setSelectedOrderId(orderId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải chi tiết đơn hàng.");
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await getMyOrders(token);
      setOrders(data);
      if (data.length && !selectedOrderId) {
        await loadOrderDetail(data[0].order_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [token, selectedOrderId, loadOrderDetail]);

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token, loadOrders]);

  useEffect(() => {
    if (!selectedOrderId && orders.length) {
      loadOrderDetail(orders[0].order_id);
    }
  }, [orders, selectedOrderId, loadOrderDetail]);

  const totalOrders = orders.length;
  const totalImages = useMemo(() => orders.reduce((sum, order) => sum + order.total_images, 0), [orders]);
  const totalProducts = useMemo(() => orders.reduce((sum, order) => sum + order.total_products, 0), [orders]);
  const selectedCopies = useMemo(() => {
    if (!selectedOrderDetail) return 0;
    return selectedOrderDetail.products.reduce((sum, product) => sum + resolveTotalCopies(product), 0);
  }, [selectedOrderDetail]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[var(--line,#e5e0d8)] bg-white/95 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[var(--text-soft,#4a4034)]">Đơn hàng</p>
            <h2 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">Danh sách đơn hàng</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[0.7rem] font-semibold text-stone-600">
              {totalOrders} don
            </span>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[0.7rem] font-semibold text-stone-600">
              {totalProducts} san pham
            </span>
            <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[0.7rem] font-semibold text-stone-600">
              {totalImages} anh
            </span>
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--text-soft,#4a4034)]"
            >
              {loading ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-2xl border border-stone-200 bg-white/90 p-3 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold tracking-[0.2em] text-[var(--text-soft,#4a4034)]">
              <span>Danh sách</span>
              <span>{totalOrders} don</span>
            </div>
            <div className="mt-2 max-h-[520px] space-y-2 overflow-auto pr-1">
              {orders.map((order) => {
                const active = order.order_id === selectedOrderId;
                return (
                  <button
                    key={order.order_id}
                    type="button"
                    onClick={() => loadOrderDetail(order.order_id)}
                    aria-pressed={active}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      active
                        ? "border-[var(--accent-strong,#8a4d1f)] bg-[var(--accent,#b46a2f)]/10 shadow-inner"
                        : "border-stone-200 bg-white hover:border-[var(--accent,#b46a2f)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
                          Ma don
                        </p>
                        <p className="truncate font-mono text-sm font-semibold text-[var(--text-main,#1f1b16)]">
                          {order.order_id}
                        </p>
                        <p className="text-xs text-[var(--text-soft,#4a4034)]">{formatSubtitle(order)}</p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${resolveStatusTone(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[0.7rem] text-[var(--text-soft,#4a4034)]">
                      <span>Cập nhật: {formatTime(order.updated_at)}</span>
                      <span>{order.total_images} anh</span>
                    </div>
                  </button>
                );
              })}
              {!orders.length && !loading && (
                <p className="text-sm text-[var(--text-soft,#4a4034)]">Chưa có đơn hàng nào.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--line,#e5e0d8)] bg-white/95 p-6 shadow-sm">
            {detailLoading && <p className="text-sm text-[var(--text-soft,#4a4034)]">Đang tải chi tiết...</p>}
            {selectedOrderDetail && !detailLoading ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex flex-col gap-1">
                      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Mã đơn hàng
                      </span>
                      <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 font-mono text-sm font-semibold text-stone-900">
                        {selectedOrderDetail.order_id}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-soft,#4a4034)]">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${resolveStatusTone(
                          selectedOrderDetail.status
                        )}`}
                      >
                        {selectedOrderDetail.status}
                      </span>
                      <span>Cập nhật: {formatTime(selectedOrderDetail.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-stone-500">Sản phẩm</p>
                      <p className="text-sm font-semibold text-stone-900">{selectedOrderDetail.total_products}</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-stone-500">Ảnh</p>
                      <p className="text-sm font-semibold text-stone-900">{selectedOrderDetail.total_images}</p>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-stone-500">Bản</p>
                      <p className="text-sm font-semibold text-stone-900">{selectedCopies}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Thông tin giao hàng</p>
                    <p>Tên: {selectedOrderDetail.shipping_name || "-"}</p>
                    <p>SĐT: {selectedOrderDetail.shipping_phone || "-"}</p>
                    <p>Địa chỉ: {selectedOrderDetail.shipping_address || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Ghi chú đơn</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {selectedOrderDetail.note || "Không có ghi chú."}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {selectedOrderDetail.products.map((product) => (
                    <div key={product.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[var(--text-main,#1f1b16)]">{product.name}</p>
                          {product.options && product.options.length > 0 && (
                            <p className="text-xs text-[var(--text-soft,#4a4034)]">
                              Tùy chọn: {product.options.join(", ")}
                            </p>
                          )}
                          {product.notes && (
                            <p className="text-xs text-[var(--text-soft,#4a4034)]">Ghi chú: {product.notes}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-[var(--text-soft,#4a4034)]">
                          <p>{product.images.length} ảnh</p>
                          <p>{resolveTotalCopies(product)} bản</p>
                        </div>
                      </div>
                      {product.images.length ? (
                        <div className="mt-3 grid max-h-48 grid-cols-3 gap-2 overflow-auto pr-1 sm:grid-cols-4 md:grid-cols-6">
                          {product.images.map((img, idx) => {
                            const resolvedUrl = resolveImageUrl(img);
                            return (
                              <div
                                key={`${product.id}-${idx}`}
                                className="group relative h-16 overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
                                title={img}
                              >
                                <Image
                                  src={resolvedUrl}
                                  alt={`ảnh-${idx + 1}`}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                  unoptimized={shouldSkipImageOptimization(resolvedUrl)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--text-soft,#4a4034)]">Chưa có ảnh.</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !detailLoading && (
                <p className="text-sm text-[var(--text-soft,#4a4034)]">Chọn một đơn để xem chi tiết.</p>
              )
            )}
          </div>
        </div>
      </div>

      {!token && (
        <p className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-[var(--text-soft,#4a4034)]">
          Đăng nhập để theo dõi đơn hàng.{" "}
          <Link href="/dang-nhap" className="font-semibold text-[var(--accent-strong,#8a4d1f)] underline">
            Đăng nhập
          </Link>
        </p>
      )}
    </div>
  );
}
