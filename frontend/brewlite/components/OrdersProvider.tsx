"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createOrder, getOrder, getOrders, payOrder, type PayOrderResult } from "@/lib/api";
import type { CreateOrderPayload, Order, PaymentMethod } from "@/lib/types";

type Status = "loading" | "ready" | "error";

interface OrdersContextValue {
  orders: Order[];
  status: Status;
  error: string;
  /** Tải lại danh sách đơn (dùng khi quay lại trang lịch sử) */
  refresh: () => Promise<void>;
  /** Tạo đơn mới, trả về đơn đã tạo */
  placeOrder: (payload: CreateOrderPayload) => Promise<Order>;
  /**
   * Thanh toán đơn (mô phỏng).
   * Kết quả đã bao gồm đơn mới nhất từ API và số điểm tích lũy được cộng.
   */
  pay: (
    order: Order,
    method: PaymentMethod,
    idempotencyKey: string,
    mockSuccess?: boolean,
  ) => Promise<PayOrderResult>;
  /** Lấy chi tiết một đơn */
  loadOrder: (id: number) => Promise<Order>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const loaded = useRef(false);

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      setOrders(await getOrders());
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định");
      setStatus("error");
    }
  }, []);

  // Nạp danh sách đơn lần đầu khi mount
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void refresh();
  }, [refresh]);

  const placeOrder = useCallback(async (payload: CreateOrderPayload) => {
    const order = await createOrder(payload);
    // Đưa đơn mới lên đầu danh sách để lịch sử cập nhật ngay
    setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    return order;
  }, []);

  const pay = useCallback(
    async (
      order: Order,
      method: PaymentMethod,
      idempotencyKey: string,
      mockSuccess = true,
    ): Promise<PayOrderResult> => {
      const result = await payOrder({
        orderId: order.id,
        amount: order.total,
        method,
        idempotencyKey,
        mockSuccess,
      });

      // Ưu tiên đơn mới nhất do API trả về; nếu không có thì nạp lại từ API.
      let latest = result.order;
      if (!latest) {
        try {
          latest = await getOrder(order.id);
        } catch {
          latest = null;
        }
      }
      if (!latest) {
        // API không trả về đơn: tự ghép kết quả giao dịch vào đơn đang có.
        latest = {
          ...order,
          status: result.orderStatus ?? order.status,
          loyaltyPointsAwarded: result.loyaltyPointsAwarded,
          payment: result.payment
            ? {
                method: result.payment.method,
                amount: result.payment.amount,
                idempotencyKey: result.payment.idempotencyKey,
                status: result.payment.status,
                failureReason: result.payment.failureReason,
              }
            : order.payment,
        };
      }
      setOrders((prev) =>
        prev.some((o) => o.id === latest!.id)
          ? prev.map((o) => (o.id === latest!.id ? latest! : o))
          : [latest!, ...prev],
      );
      return { ...result, order: latest };
    },
    [],
  );

  const loadOrder = useCallback(async (id: number) => {
    const order = await getOrder(id);
    // Cập nhật nếu đơn đã có trong danh sách, nếu chưa thì thêm vào
    setOrders((prev) =>
      prev.some((o) => o.id === order.id)
        ? prev.map((o) => (o.id === order.id ? order : o))
        : [...prev, order],
    );
    return order;
  }, []);

  const value = useMemo(
    () => ({ orders, status, error, refresh, placeOrder, pay, loadOrder }),
    [orders, status, error, refresh, placeOrder, pay, loadOrder],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders phải được dùng bên trong <OrdersProvider>");
  return ctx;
}
