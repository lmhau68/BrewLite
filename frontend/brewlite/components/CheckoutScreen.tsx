"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { formatVND } from "@/lib/format";
import {
  DEMO_CARD,
  EMPTY_CARD,
  formatCardCvv,
  formatCardExpiry,
  formatCardNumber,
  hasCardErrors,
  validateCard,
  type CardDetails,
  type CardErrors,
} from "@/lib/card";
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
import { useResetOnHide } from "@/lib/use-reset-on-hide";
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

/**
 * Luồng "Thẻ ngân hàng" yêu cầu đủ 4 trường: số thẻ, tên chủ thẻ, hạn thẻ, CVV.
 * Backend chỉ nhận `method` + `amount`, nên dữ liệu thẻ không rời khỏi giao diện;
 * phần kiểm tra bắt buộc + định dạng nằm ở `lib/card.ts`.
 */

export function CheckoutScreen() {
  const { lines, count, total, dispatch } = useCart();
  const { placeOrder, pay } = useOrders();

  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [promotionCode, setPromotionCode] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("VI_DIEN_TU");
  /** Bật để thử nhánh cổng thanh toán bị từ chối (ADR-005) */
  const [mockFail, setMockFail] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [idemKey, setIdemKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState("");
  /** Điểm tích lũy do API trả về sau khi thanh toán thành công */
  const [pointsAwarded, setPointsAwarded] = useState(0);
  /** Thông tin thẻ ngân hàng (ảo), chỉ nằm ở state của giao diện */
  const [card, setCard] = useState<CardDetails>(EMPTY_CARD);
  /** Lỗi của các ô thẻ, chỉ hiện khi chọn phương thức "Thẻ ngân hàng" */
  const [cardErrors, setCardErrors] = useState<CardErrors>({});

  /**
   * Phiên đặt hàng hiện tại. Mỗi lần rời trang, phiên được tăng lên để kết quả
   * của các lệnh đang chạy (tạo đơn / thanh toán) không áp nhầm vào lần đặt hàng sau.
   */
  const sessionRef = useRef(0);

  /** Xoá sạch state của lần đặt hàng hiện tại, đưa màn checkout về bước 1. */
  const resetCheckout = useCallback(() => {
    sessionRef.current += 1;
    setStep("form");
    setForm({ name: "", phone: "", address: "", note: "" });
    setErrors({});
    setPromotionCode("");
    setMethod("VI_DIEN_TU");
    setMockFail(false);
    setOrder(null);
    setIdemKey("");
    setBusy(false);
    setPayError("");
    setPointsAwarded(0);
    setCard(EMPTY_CARD);
    setCardErrors({});
  }, []);

  /**
   * Next.js 16 (cacheComponents) giữ page cũ trong DOM bằng React <Activity> thay
   * vì unmount, nên state của client component vẫn còn nguyên khi quay lại trang.
   * Vì vậy mỗi lần vào trang checkout là một lần đặt hàng mới: rời trang thì reset,
   * quay lại thì thấy bước nhập thông tin chứ không phải màn "đặt đơn xong" cũ.
   */
  useResetOnHide(resetCheckout);

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

  /** Gõ vào ô thẻ: cập nhật giá trị và xoá lỗi của chính ô đó. */
  const setCardField = (key: keyof CardDetails, value: string) => {
    setCard((prev) => ({ ...prev, [key]: value }));
    setCardErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Bước 1 → 2: kiểm tra thông tin rồi tạo đơn ở API */
  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault();
    const nextErrors = validateCheckout(form);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setBusy(true);
    setPayError("");
    const session = sessionRef.current;
    try {
      const created = await placeOrder(buildOrderPayload(lines, form, promotionCode));
      // Đã rời trang trong lúc chờ API: bỏ qua kết quả, không áp vào lần đặt mới.
      if (sessionRef.current !== session) return;
      setOrder(created);
      setIdemKey(createIdempotencyKey(`ord${created.id}`));
      setStep("payment");
    } catch (err) {
      if (sessionRef.current !== session) return;
      setPayError(err instanceof Error ? err.message : "Không tạo được đơn hàng");
    } finally {
      if (sessionRef.current === session) setBusy(false);
    }
  };

  /** Bước 2 → 3: thanh toán, dùng lại đúng một khoá idempotency cho cả đơn */
  const handlePay = async () => {
    if (!order) return;

    // Thẻ ngân hàng: 4 ô thẻ là bắt buộc, thiếu hoặc sai định dạng thì không gọi API.
    if (method === "THE_NGAN_HANG") {
      const nextCardErrors = validateCard(card);
      setCardErrors(nextCardErrors);
      if (hasCardErrors(nextCardErrors)) return;
    }

    setBusy(true);
    setPayError("");
    const session = sessionRef.current;
    try {
      const result = await pay(order, method, idemKey, !mockFail);
      if (result.success) {
        // API đã ghi nhận thanh toán: xoá giỏ hàng ngay để đơn sau không dính món cũ.
        // Việc này luôn thực hiện, kể cả khi người dùng đã rời trang, vì server đã trừ món.
        dispatch({ type: "clear" });
        // Đã rời trang trong lúc chờ API: bỏ qua cập nhật giao diện.
        if (sessionRef.current !== session) return;
        // Cập nhật trạng thái + điểm tích lũy ngay.
        setOrder(
          result.order ??
            ((prev) =>
              prev
                ? {
                    ...prev,
                    status: result.orderStatus ?? "PAID",
                    loyaltyPointsAwarded: result.loyaltyPointsAwarded,
                  }
                : prev),
        );
        setPointsAwarded(result.loyaltyPointsAwarded);
        setStep("done");
      } else {
        // Cập nhật trạng thái đơn (ví dụ PAYMENT_FAILED) để badge hiển thị đúng
        if (sessionRef.current !== session) return;
        if (result.order) setOrder(result.order);
        setPayError(result.message || "Thanh toán không thành công.");
        // Lần thử sau phải dùng khoá mới: API từ chối tái sử dụng khoá cũ
        // cho một yêu cầu khác (ADR-005).
        setIdemKey(createIdempotencyKey(`ord${order.id}`));
      }
    } catch (err) {
      if (sessionRef.current !== session) return;
      setPayError(err instanceof Error ? err.message : "Không thanh toán được");
      setIdemKey(createIdempotencyKey(`ord${order.id}`));
    } finally {
      if (sessionRef.current === session) setBusy(false);
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

                <div>
                  <label htmlFor="checkout-promo" className={labelClass}>
                    Mã khuyến mãi <span className="font-normal text-muted">(không bắt buộc)</span>
                  </label>
                  <input
                    id="checkout-promo"
                    name="promotionCode"
                    value={promotionCode}
                    onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                    className={inputClass}
                    placeholder="WELCOME10"
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
              {order.discountAmount ? (
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Mã {order.discountCode}: giảm {formatVND(order.discountAmount)}
                </p>
              ) : null}
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
                      onChange={() => {
                        setMethod(m.id);
                        setCardErrors({});
                        setPayError("");
                      }}
                      className="size-4 accent-[var(--color-caramel-dark)]"
                    />
                    <span aria-hidden className="text-lg">
                      {m.emoji}
                    </span>
                    <span className="text-sm">{m.label}</span>
                  </label>
                ))}
              </div>

              {method === "THE_NGAN_HANG" && (
                <div className="mt-3 space-y-3 rounded-xl bg-cream p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted">
                      Thông tin thẻ dưới đây chỉ để demo, không được gửi lên máy chủ.
                      <span className="mt-0.5 block font-semibold text-espresso">
                        Các ô <span aria-hidden className="text-caramel-dark">*</span> là bắt buộc.
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCard(DEMO_CARD);
                        setCardErrors({});
                        setPayError("");
                      }}
                      className="shrink-0 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-espresso hover:bg-background"
                    >
                      Điền thẻ demo
                    </button>
                  </div>
                  <div>
                    <label htmlFor="card-number" className="mb-1 block text-xs font-semibold text-espresso">
                      Số thẻ <span aria-hidden className="text-caramel-dark">*</span>
                    </label>
                    <input
                      id="card-number"
                      name="cardNumber"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      required
                      value={card.number}
                      onChange={(e) => setCardField("number", formatCardNumber(e.target.value))}
                      aria-invalid={Boolean(cardErrors.number)}
                      aria-describedby={cardErrors.number ? "card-number-error" : undefined}
                      className={inputClass}
                      placeholder="4242 4242 4242 4242"
                    />
                    {cardErrors.number && (
                      <p id="card-number-error" role="alert" className="mt-1 text-xs text-red-600">
                        {cardErrors.number}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="card-holder" className="mb-1 block text-xs font-semibold text-espresso">
                      Tên chủ thẻ <span aria-hidden className="text-caramel-dark">*</span>
                    </label>
                    <input
                      id="card-holder"
                      name="cardHolder"
                      autoComplete="cc-name"
                      required
                      value={card.holder}
                      onChange={(e) => setCardField("holder", e.target.value)}
                      aria-invalid={Boolean(cardErrors.holder)}
                      aria-describedby={cardErrors.holder ? "card-holder-error" : undefined}
                      className={inputClass}
                      placeholder="NGUYEN VAN A"
                    />
                    {cardErrors.holder && (
                      <p id="card-holder-error" role="alert" className="mt-1 text-xs text-red-600">
                        {cardErrors.holder}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="card-expiry" className="mb-1 block text-xs font-semibold text-espresso">
                        Hạn thẻ <span aria-hidden className="text-caramel-dark">*</span>
                      </label>
                      <input
                        id="card-expiry"
                        name="cardExpiry"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        required
                        value={card.expiry}
                        onChange={(e) => setCardField("expiry", formatCardExpiry(e.target.value))}
                        aria-invalid={Boolean(cardErrors.expiry)}
                        aria-describedby={cardErrors.expiry ? "card-expiry-error" : undefined}
                        className={inputClass}
                        placeholder="MM/YY"
                      />
                      {cardErrors.expiry && (
                        <p id="card-expiry-error" role="alert" className="mt-1 text-xs text-red-600">
                          {cardErrors.expiry}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="card-cvv" className="mb-1 block text-xs font-semibold text-espresso">
                        CVV <span aria-hidden className="text-caramel-dark">*</span>
                      </label>
                      <input
                        id="card-cvv"
                        name="cardCvv"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        required
                        value={card.cvv}
                        onChange={(e) => setCardField("cvv", formatCardCvv(e.target.value))}
                        aria-invalid={Boolean(cardErrors.cvv)}
                        aria-describedby={cardErrors.cvv ? "card-cvv-error" : undefined}
                        className={inputClass}
                        placeholder="123"
                      />
                      {cardErrors.cvv && (
                        <p id="card-cvv-error" role="alert" className="mt-1 text-xs text-red-600">
                          {cardErrors.cvv}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

            {hasCardErrors(cardErrors) && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                Vui lòng nhập đầy đủ và đúng định dạng thông tin thẻ ngân hàng.
              </p>
            )}

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
            {pointsAwarded > 0 && (
              <p className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                Bạn được tích lũy {pointsAwarded} điểm
              </p>
            )}
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
