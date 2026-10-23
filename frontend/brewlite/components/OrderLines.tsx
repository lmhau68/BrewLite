import { formatVND } from "@/lib/format";
import type { SizeId, ToppingOption } from "@/lib/types";

/** Dòng hiển thị thống nhất cho cả giỏ hàng và chi tiết đơn đã tạo. */
export interface DisplayLine {
  key: string;
  name: string;
  emoji: string;
  size: SizeId;
  toppings: ToppingOption[];
  qty: number;
  /** Thành tiền của dòng (unitPrice × qty) */
  lineTotal: number;
}

/** Danh sách món trong đơn, dùng chung cho màn checkout và màn chi tiết đơn. */
export function OrderLines({ items }: { items: DisplayLine[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((l) => (
        <li key={l.key} className="flex gap-3 py-3">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cream text-2xl"
          >
            {l.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-espresso">
              {l.name} <span className="font-normal text-muted">× {l.qty}</span>
            </p>
            <p className="text-xs text-muted">
              Size {l.size}
              {l.toppings.length > 0 && ` · ${l.toppings.map((t) => t.name).join(", ")}`}
            </p>
            <p className="mt-1 text-sm font-semibold text-caramel-dark">
              {formatVND(l.lineTotal)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}