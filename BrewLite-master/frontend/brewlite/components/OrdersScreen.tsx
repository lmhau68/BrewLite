"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatVND } from "@/lib/format";
import { formatOrderId, formatOrderTime, orderItemCount } from "@/lib/orders";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { useOrders } from "./OrdersProvider";
import { SubPageHeader } from "./SubPageHeader";

export function OrdersScreen() {
  const { orders, status, error, refresh } = useOrders();

  const sorted = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders],
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-10 shadow-xl">
      <SubPageHeader
        title="Lịch sử đơn hàng"
        subtitle={status === "ready" ? `${orders.length} đơn` : undefined}
        action={
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Làm mới danh sách đơn"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream/10 text-lg hover:bg-cream/20"
          >
            ⟳
          </button>
        }
      />

      <main className="flex-1 px-4 pt-4">
        {status === "loading" && (
          <ul aria-busy="true" aria-label="Đang tải danh sách đơn" className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex animate-pulse flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
              >
                <div className="h-4 w-24 rounded bg-line" />
                <div className="h-3 w-40 rounded bg-line" />
                <div className="h-4 w-20 rounded bg-line" />
              </li>
            ))}
          </ul>
        )}

        {status === "error" && (
          <div role="alert" className="flex flex-col items-center gap-2 py-16 text-center">
            <span aria-hidden className="text-5xl">
              ⚠️
            </span>
            <p className="font-semibold text-espresso">Không tải được lịch sử đơn</p>
            <p className="max-w-xs text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-2 rounded-full bg-espresso px-5 py-2 text-sm font-medium text-cream hover:bg-caramel-dark"
            >
              Thử lại
            </button>
          </div>
        )}

        {status === "ready" && sorted.length === 0 && (
          <div role="status" className="flex flex-col items-center gap-2 py-16 text-center">
            <span aria-hidden className="text-5xl">
              🧾
            </span>
            <p className="font-semibold text-espresso">Bạn chưa có đơn hàng nào</p>
            <p className="max-w-xs text-sm text-muted">
              Các đơn đã đặt sẽ xuất hiện ở đây để bạn theo dõi trạng thái.
            </p>
            <Link
              href="/"
              className="mt-2 rounded-full bg-espresso px-5 py-2.5 text-sm font-medium text-cream hover:bg-caramel-dark"
            >
              Xem menu
            </Link>
          </div>
        )}

        {status === "ready" && sorted.length > 0 && (
          <ul className="space-y-3" aria-label="Danh sách đơn hàng">
            {sorted.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="block rounded-2xl border border-line bg-surface p-4 hover:border-caramel"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-espresso">Đơn {formatOrderId(o.id)}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{formatOrderTime(o.createdAt)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-espresso">
                    {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                  </p>
                  <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                    <span className="text-xs text-muted">{orderItemCount(o)} ly</span>
                    <span className="font-semibold text-caramel-dark">{formatVND(o.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}