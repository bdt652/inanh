"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getMyOrders,
  getOrderDetail,
  OrderDetail,
  OrderSummary,
} from "../../lib/customer-api";
import { useCustomerToken } from "../../lib/use-customer-token";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

const PRICE_DEFAULT = 2500;

const formatSubtitle = (order: OrderSummary) => {
  if (order.total_products === 0) {
    return `${order.total_images} ảnh`;
  }
  return `${order.total_products} sản phẩm · ${order.total_images} ảnh`;
};

export default function OrdersPage() {
  const token = useCustomerToken();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDetail>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

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

  const orderTotal = useMemo(() => {
    if (!selectedOrderDetail) {
      return 0;
    }
    return selectedOrderDetail.total_images * PRICE_DEFAULT;
  }, [selectedOrderDetail]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[var(--line,#e5e0d8)] bg-white/90 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">Đơn hàng</p>
            <h2 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">Danh sách đơn hàng hiện tại</h2>
          </div>
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2 overflow-auto">
            {orders.map((order) => {
              const active = order.order_id === selectedOrderId;
              return (
                <button
                  key={order.order_id}
                  type="button"
                  onClick={() => loadOrderDetail(order.order_id)}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-[var(--accent-strong,#8a4d1f)] bg-[var(--accent,#b46a2f)]/10 shadow-inner"
                      : "border-stone-200 bg-white hover:border-[var(--accent,#b46a2f)]"
                  }`}
                >
                  <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                    {order.order_id}
                  </p>
                  <p className="text-sm font-semibold text-[var(--text-main,#1f1b16)]">{order.status}</p>
                  <p className="text-[var(--text-soft,#4a4034)]">{formatSubtitle(order)}</p>
                </button>
              );
            })}
            {!orders.length && !loading && (
              <p className="text-sm text-[var(--text-soft,#4a4034)]">Chưa có đơn hàng nào.</p>
            )}
          </div>

          <div className="rounded-3xl border border-[var(--line,#e5e0d8)] bg-[var(--surface-soft,#f7f2ea)] p-6">
            {detailLoading && <p className="text-sm text-[var(--text-soft,#4a4034)]">Đang tải chi tiết...</p>}
            {selectedOrderDetail && !detailLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.08em] text-[var(--text-soft,#4a4034)]">Chi tiết</p>
                    <h3 className="text-lg font-semibold text-[var(--text-main,#1f1b16)]">
                      #{selectedOrderDetail.order_id}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">Tổng ảnh</p>
                    <p className="text-base font-semibold text-[var(--accent-strong,#8a4d1f)]">
                      {selectedOrderDetail.total_images}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-soft,#4a4034)]">Trạng thái: {selectedOrderDetail.status}</p>
                {selectedOrderDetail.products.map((product) => (
                  <div key={product.id} className="space-y-2 rounded-2xl border border-stone-200 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--text-main,#1f1b16)]">{product.name}</p>
                      <span className="text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">
                        {product.quantity} ảnh
                      </span>
                    </div>
                    {product.notes && (
                      <p className="text-xs text-[var(--text-soft,#4a4034)]">Ghi chú: {product.notes}</p>
                    )}
                    {product.options && product.options.length > 0 && (
                      <p className="text-xs text-[var(--text-soft,#4a4034)]">
                        Tuỳ chọn: {product.options.join(", ")}
                      </p>
                    )}
                    {product.images.length ? (
                      <ul className="text-xs text-[var(--text-soft,#4a4034)]">
                        {product.images.map((img, idx) => (
                          <li key={idx}>{img}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[var(--text-soft,#4a4034)]">Chưa có link ảnh.</p>
                    )}
                  </div>
                ))}
                <p className="text-xs tracking-[0.08em] text-[var(--text-soft,#4a4034)]">Ghi chú đơn</p>
                <p className="rounded-2xl border border-stone-200 bg-white/80 px-4 py-2 text-sm text-[var(--text-soft,#4a4034)]">
                  {selectedOrderDetail.note || "Không có ghi chú."}
                </p>
                <div className="flex items-center justify-between text-xs tracking-[0.08em]">
                  <span className="text-[var(--text-soft,#4a4034)]">Thành tiền ước lượng</span>
                  <span className="text-[var(--accent-strong,#8a4d1f)]">{formatCurrency(orderTotal)}</span>
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

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
