"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatVND } from "@/lib/format";
import { consumedItemsFromOrder } from "@/lib/cart";
import {
  createIdempotencyKey,
  formatCustomerLine,
  formatOrderId,
  formatOrderTime,
  orderItemCount,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
} from "@/lib/orders";
import type { Order, PaymentMethod } from "@/lib/types";
import { clearGuestData } from "@/lib/api";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";
import { OrderLines, type DisplayLine } from "./OrderLines";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useOrders } from "./OrdersProvider";
import { SubPageHeader } from "./SubPageHeader";

type Status = "loading" | "error" | "ready";

export function OrderDetailScreen({ id }: { id: number }) {
  const { loadOrder, pay } = useOrders();
  const { dispatch } = useCart();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("VI_DIEN_TU");
  const [mockFail, setMockFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState("");
  /** Khoá idempotency của lần thanh toán hiện tại (xoay khi thất bại) */
  const [idemKey, setIdemKey] = useState(() => createIdempotencyKey(`ord${id}`));
  /** Điểm tích lũy API cộng cho đơn này */
  const [pointsAwarded, setPointsAwarded] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadOrder(id);
        if (cancelled) return;
        setOrder(loaded);
        setPointsAwarded(loaded.loyaltyPointsAwarded ?? 0);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Không tải được đơn hàng");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadOrder]);

  const lines: DisplayLine[] = useMemo(
    () =>
      (order?.items ?? []).map((i, idx) => ({
        key: String(i.id ?? `${i.productId}-${idx}`),
        name: i.name,
        emoji: i.emoji,
        size: i.size,
        toppings: i.toppings,
        qty: i.qty,
        lineTotal: i.lineTotal,
      })),
    [order],
  );

  /** Đơn chưa thanh toán (hoặc thanh toán lỗi) thì cho phép thử thanh toán lại. */
  const canPay = order?.status === "PENDING" || order?.status === "PAYMENT_FAILED";

  const handlePay = async () => {
    if (!order) return;
    setBusy(true);
    setPayError("");
    try {
      const result = await pay(order, method, idemKey, !mockFail);
      if (result.success) {
        // Server đã trừ món: gỡ đúng số lượng vừa thanh toán khỏi giỏ hàng.
        // Đơn trong lịch sử có thể đã cũ hơn giỏ hiện tại, nên chỉ gỡ đúng phần
        // trùng với đơn; món người dùng thêm sau khi đặt đơn thì giữ nguyên.
        dispatch({ type: "consume", items: consumedItemsFromOrder(order) });
        // Khách vãng lai: dọn đơn lưu cục bộ sau khi thanh toán (yêu cầu riêng tư).
        if (!user) clearGuestData();
        setOrder(
          result.order ?? {
            ...order,
            status: result.orderStatus ?? "PAID",
            loyaltyPointsAwarded: result.loyaltyPointsAwarded ?? order.loyaltyPointsAwarded ?? 0,
          },
        );
        setPointsAwarded(result.loyaltyPointsAwarded ?? order.loyaltyPointsAwarded ?? 0);
      } else {
        setPayError(result.message || "Thanh toán không thành công.");
        // Lần thử sau phải dùng khoá mới: API từ chối tái sử dụng khoá cũ
        // cho một yêu cầu khác (ADR-005).
        setIdemKey(createIdempotencyKey(`ord${order.id}`));
        if (result.order) setOrder(result.order);
      }
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Không thanh toán được");
      setIdemKey(createIdempotencyKey(`ord${order.id}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-10 shadow-xl">
      <SubPageHeader
        title={order ? `Đơn ${formatOrderId(order.id)}` : "Chi tiết đơn"}
        subtitle={order ? formatOrderTime(order.createdAt) : undefined}
        backHref="/orders"
        backLabel="Về lịch sử đơn hàng"
      />

      <main className="flex-1 space-y-4 px-4 pt-4">
        {status === "loading" && (
          <div aria-busy="true" aria-label="Đang tải đơn hàng" className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-line" />
            <div className="h-40 animate-pulse rounded-2xl bg-line" />
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="flex flex-col items-center gap-2 py-16 text-center">
            <span aria-hidden className="text-5xl">
              ⚠️
            </span>
            <p className="font-semibold text-espresso">Không tải được đơn hàng</p>
            <p className="max-w-xs text-sm text-muted">{error}</p>
            <Link
              href="/orders"
              className="mt-2 rounded-full bg-espresso px-5 py-2 text-sm font-medium text-cream hover:bg-caramel-dark"
            >
              Về lịch sử đơn hàng
            </Link>
          </div>
        )}

        {status === "ready" && order && (
          <>
            <section className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-espresso">Đơn {formatOrderId(order.id)}</h2>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-0.5 text-xs text-muted">Đặt lúc {formatOrderTime(order.createdAt)}</p>

              <div className="mt-3 border-t border-line pt-3 text-sm">
                <p className="font-semibold text-espresso">Người nhận</p>
                <p className="text-muted">{formatCustomerLine(order)}</p>
                <p className="text-muted">
                  {order.customer.address ? `Địa chỉ: ${order.customer.address}` : "Nhận tại quầy"}
                </p>
                {order.customer.note && <p className="text-muted">Ghi chú: {order.customer.note}</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="mb-1 font-semibold text-espresso">
                Món đã đặt <span className="font-normal text-muted">({orderItemCount(order)} ly)</span>
              </h2>
              <OrderLines items={lines} />
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
                <span className="text-muted">Tổng cộng</span>
                <span className="text-lg font-bold text-espresso">{formatVND(order.total)}</span>
              </div>
              {order.payment && (
                <p className="mt-1 text-xs text-muted">
                  Thanh toán: {PAYMENT_METHOD_LABEL[order.payment.method] ?? order.payment.method} ·{" "}
                  {formatVND(order.payment.amount)}
                </p>
              )}
              {order.discountAmount ? (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Mã {order.discountCode}: giảm {formatVND(order.discountAmount)}
                </p>
              ) : null}
              {pointsAwarded > 0 && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Đã tích lũy {pointsAwarded} điểm
                </p>
              )}
            </section>

            {canPay && (
              <section className="rounded-2xl border border-line bg-surface p-4">
                <h2 className="mb-2 font-semibold text-espresso">Thanh toán đơn hàng</h2>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 has-[:checked]:border-caramel has-[:checked]:bg-caramel/10"
                    >
                      <input
                        type="radio"
                        name="detail-payment-method"
                        value={m.id}
                        checked={method === m.id}
                        onChange={() => setMethod(m.id)}
                        className="size-4 accent-[var(--color-caramel-dark)]"
                      />
                      <span aria-hidden className="text-lg">
                        {m.emoji}
                      </span>
                      <span className="text-sm">{m.label}</span>
                    </label>
                  ))}
                </div>

                <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-cream px-3 py-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={mockFail}
                    onChange={(e) => setMockFail(e.target.checked)}
                    className="size-3.5 accent-[var(--color-caramel-dark)]"
                  />
                  Mô phỏng thẻ bị từ chối (kiểm thử nhánh thất bại)
                </label>

                {payError && (
                  <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {payError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={busy}
                  className="mt-3 w-full rounded-full bg-caramel-dark py-3 font-semibold text-white hover:bg-espresso disabled:opacity-60"
                >
                  {busy ? "Đang thanh toán…" : `Thanh toán ${formatVND(order.total)}`}
                </button>
              </section>
            )}

            <Link
              href="/orders"
              className="block w-full rounded-full border border-line py-2.5 text-center text-sm font-medium text-espresso hover:bg-cream"
            >
              Về lịch sử đơn hàng
            </Link>
          </>
        )}
      </main>
    </div>
  );
}