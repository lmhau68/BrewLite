"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthProvider";
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
  /** Thanh toán đơn (mô phỏng), trả về kết quả và cập nhật danh sách */
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
  const { user } = useAuth();
  const userId = user?.id ?? null;

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

  // Nạp danh sách đơn khi mount và nạp lại mỗi khi đăng nhập/đăng xuất (đổi chủ sở hữu đơn)
  useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu khi phiên đăng nhập đổi
  void refresh();
}, [refresh, userId]);

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
      // Đồng bộ lại trạng thái đơn từ nguồn sự thật
      try {
        const fresh = await getOrder(order.id);
        setOrders((prev) =>
          prev.some((o) => o.id === fresh.id)
            ? prev.map((o) => (o.id === fresh.id ? fresh : o))
            : [fresh, ...prev],
        );
        return { ...result, order: fresh };
      } catch {
        return result;
      }
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
