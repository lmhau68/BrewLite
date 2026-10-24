"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { formatVND } from "@/lib/format";
import {
  buildOrderPayload,
  createIdempotencyKey,
  formatCustomerLine,
  formatOrderId,
  hasErrors,
  orderTotal,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  validateCheckout,
  type CheckoutErrors,
} from "@/lib/orders";
import type { Order, PaymentMethod } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { useCart } from "./CartProvider";
import { OrderLines, type DisplayLine } from "./OrderLines";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useOrders } from "./OrdersProvider";
import { SubPageHeader } from "./SubPageHeader";

/** 3 bước: nhập thông tin → chọn cách thanh toán → xác nhận kết quả */
type Step = "form" | "payment" | "done";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted focus:border-espresso focus:outline-2 focus:outline-espresso";
const labelClass = "mb-1 block text-sm font-semibold text-espresso";

export function CheckoutScreen() {
  const { lines, count, total, dispatch } = useCart();
  const { placeOrder, pay } = useOrders();
  const { session } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [method, setMethod] = useState<PaymentMethod>("VI_DIEN_TU");
  /** Bật để thử nhánh cổng thanh toán bị từ chối (ADR-005) */
  const [mockFail, setMockFail] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [idemKey, setIdemKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState("");

  const cartLines: DisplayLine[] = useMemo(
    () =>
      lines.map((l) => ({
        key: l.key,
        name: l.name,
        emoji: l.emoji,
        size: l.size,
        toppings: l.toppings,
        qty: l.qty,
        lineTotal: l.unitPrice * l.qty,
      })),
    [lines],
  );

  const orderLines: DisplayLine[] = useMemo(
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

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Bước 1 → 2: kiểm tra thông tin rồi tạo đơn ở API */
  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateCheckout(form);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setBusy(true);
    setPayError("");
    try {
      const created = await placeOrder(buildOrderPayload(lines, form));
      setOrder(created);
      setIdemKey(createIdempotencyKey(`ord${created.id}`));
      setStep("payment");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Không tạo được đơn hàng");
    } finally {
      setBusy(false);
    }
  };

  /** Bước 2 → 3: thanh toán, dùng lại đúng một khoá idempotency cho cả đơn */
  const handlePay = async () => {
    if (!order) return;
    setBusy(true);
    setPayError("");
    try {
      const result = await pay(order, method, idemKey, !mockFail);
      if (result.success) {
        setOrder(result.order ?? order);
        dispatch({ type: "clear" }); // chỉ xoá giỏ sau khi thanh toán thành công
        setStep("done");
      } else {
        // Cập nhật trạng thái đơn (ví dụ PAYMENT_FAILED) để badge hiển thị đúng
        if (result.order) setOrder(result.order);
        // Khoá cũ đã gắn với giao dịch thất bại; muốn thử lại phải dùng khoá mới (backend trả 409 nếu dùng lại)
        if (order) setIdemKey(createIdempotencyKey(`ord${order.id}`));
        setPayError(result.message || "Thanh toán không thành công.");
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Không thanh toán được");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-28 shadow-xl">
      <SubPageHeader
        title={step === "done" ? "Đặt đơn xong" : "Xác nhận đơn"}
        subtitle={step === "form" ? `${count} món · ${formatVND(total)}` : undefined}
      />

      <main className="flex-1 space-y-4 px-4 pt-4">
        {/* ---------------- Bước 1: thông tin khách ---------------- */}
        {step === "form" &&
          (lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span aria-hidden className="text-5xl">
                🛒
              </span>
              <p className="font-semibold text-espresso">Giỏ hàng đang trống</p>
              <p className="text-sm text-muted">Chọn món ngon trước khi thanh toán nhé.</p>
              <Link
                href="/"
                className="mt-2 rounded-full bg-espresso px-5 py-2.5 text-sm font-medium text-cream hover:bg-caramel-dark"
              >
                Xem menu
              </Link>
            </div>
          ) : (
            <>
              <section className="rounded-2xl border border-line bg-surface p-4">
                <h2 className="mb-1 font-semibold text-espresso">Đơn hàng của bạn</h2>
                <OrderLines items={cartLines} />
                <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-muted">Tổng cộng</span>
                  <span className="text-lg font-bold text-espresso">{formatVND(orderTotal(lines))}</span>
                </div>
              </section>

              <form onSubmit={handleCreateOrder} noValidate className="space-y-3 rounded-2xl border border-line bg-surface p-4">
                <h2 className="font-semibold text-espresso">Thông tin người nhận</h2>
                <p className="rounded-xl bg-cream px-3 py-2 text-xs text-muted">
                  {session ? (
                    <>Đặt đơn với tài khoản <strong>{session.email}</strong>.</>
                  ) : (
                    <>
                      Bạn đang đặt đơn với tư cách khách.{" "}
                      <Link href="/login" className="font-semibold text-caramel-dark underline">
                        Đăng nhập
                      </Link>{" "}
                      để lưu lịch sử và tích điểm.
                    </>
                  )}
                </p>

                <div>
                  <label htmlFor="checkout-name" className={labelClass}>
                    Họ và tên <span aria-hidden className="text-caramel-dark">*</span>
                  </label>
                  <input
                    id="checkout-name"
                    name="customerName"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "checkout-name-error" : undefined}
                    className={inputClass}
                    placeholder="Nguyễn Văn A"
                  />
                  {errors.name && (
                    <p id="checkout-name-error" role="alert" className="mt-1 text-xs text-red-600">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-phone" className={labelClass}>
                    Số điện thoại <span aria-hidden className="text-caramel-dark">*</span>
                  </label>
                  <input
                    id="checkout-phone"
                    name="customerPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
                    className={inputClass}
                    placeholder="0901234567"
                  />
                  {errors.phone && (
                    <p id="checkout-phone-error" role="alert" className="mt-1 text-xs text-red-600">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-address" className={labelClass}>
                    Địa chỉ nhận <span className="font-normal text-muted">(bỏ trống nếu lấy tại quầy)</span>
                  </label>
                  <input
                    id="checkout-address"
                    name="address"
                    autoComplete="street-address"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={errors.address ? "checkout-address-error" : undefined}
                    className={inputClass}
                    placeholder="Số 1 Nguyễn Huệ, Q.1, TP.HCM"
                  />
                  {errors.address && (
                    <p id="checkout-address-error" role="alert" className="mt-1 text-xs text-red-600">
                      {errors.address}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="checkout-note" className={labelClass}>
                    Ghi chú
                  </label>
                  <textarea
                    id="checkout-note"
                    name="note"
                    rows={2}
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    className={inputClass}
                    placeholder="Ít đá, gọi khi sẵn sàng…"
                  />
                </div>

                {payError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {payError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-espresso py-3 font-semibold text-cream hover:bg-caramel-dark disabled:opacity-60"
                >
                  {busy ? "Đang tạo đơn…" : "Tiếp tục thanh toán"}
                </button>
              </form>
            </>
          ))}

        {/* ---------------- Bước 2: chọn cách thanh toán ---------------- */}
        {step === "payment" && order && (
          <>
            <section className="rounded-2xl border border-line bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-espresso">Đơn {formatOrderId(order.id)}</h2>
                <OrderStatusBadge status={order.status} />
              </div>
              <OrderLines items={orderLines} />
              <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
                <span className="text-muted">Tổng cộng</span>
                <span className="text-lg font-bold text-espresso">{formatVND(order.total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                Người nhận: {formatCustomerLine(order)}
                {order.customer.address ? ` · ${order.customer.address}` : " · Nhận tại quầy"}
              </p>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4">
              <h2 className="mb-2 font-semibold text-espresso">Cách thanh toán</h2>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 has-[:checked]:border-caramel has-[:checked]:bg-caramel/10"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
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
            </section>

            {payError && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {payError}
              </p>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={busy}
              className="w-full rounded-full bg-caramel-dark py-3.5 font-semibold text-white hover:bg-espresso disabled:opacity-60"
            >
              {busy ? "Đang thanh toán…" : `Thanh toán ${formatVND(order.total)}`}
            </button>
            <button
              type="button"
              onClick={() => setStep("form")}
              disabled={busy}
              className="w-full rounded-full border border-line py-2.5 text-sm text-muted hover:text-espresso disabled:opacity-60"
            >
              Quay lại sửa thông tin
            </button>
          </>
        )}

        {/* ---------------- Bước 3: hoàn tất ---------------- */}
        {step === "done" && order && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-center">
            <span aria-hidden className="text-5xl">
              🎉
            </span>
            <div>
              <p className="font-bold text-espresso">
                Cảm ơn bạn! Đơn {formatOrderId(order.id)} đã được xác nhận.
              </p>
              <p className="mt-1 text-sm text-muted">
                Thanh toán {formatVND(order.total)} qua {PAYMENT_METHOD_LABEL[method].toLowerCase()}. Đơn sẽ
                được chuẩn bị ngay.
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
            <div className="mt-1 flex w-full flex-col gap-2">
              <Link
                href={`/orders/${order.id}`}
                className="rounded-full bg-espresso py-3 font-semibold text-cream hover:bg-caramel-dark"
              >
                Theo dõi đơn hàng
              </Link>
              <Link
                href="/orders"
                className="rounded-full border border-line py-2.5 text-sm font-medium text-espresso hover:bg-cream"
              >
                Lịch sử đơn hàng
              </Link>
              <Link href="/" className="text-sm text-muted underline hover:text-espresso">
                Đặt thêm món
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}