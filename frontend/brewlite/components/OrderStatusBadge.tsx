import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE } from "@/lib/orders";
import type { OrderStatus } from "@/lib/types";

const TONE_CLASS = {
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
  grey: "bg-line text-muted",
} as const;

/** Badge trạng thái đơn hàng */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[ORDER_STATUS_TONE[status]]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
