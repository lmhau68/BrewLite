"use client";

import { useId } from "react";
import { formatVND } from "@/lib/format";
import { SIZES, TOPPINGS } from "@/lib/menu-options";
import type { SizeId } from "@/lib/types";

interface Props {
  size: SizeId;
  /** Danh sách id topping đang chọn */
  toppingIds: string[];
  onSizeChange: (size: SizeId) => void;
  onToggleTopping: (id: string) => void;
}

/**
 * Bộ chọn size + topping dùng chung cho thêm món mới và sửa dòng trong giỏ.
 * Component điều khiển hoàn toàn từ bên ngoài nên dùng được cho cả hai luồng.
 */
export function ProductOptions({ size, toppingIds, onSizeChange, onToggleTopping }: Props) {
  // Tên nhóm radio phải duy nhất để không lẫn giữa các sheet đang mở.
  const groupName = useId();

  return (
    <>
      <fieldset className="pb-4">
        <legend className="mb-2 font-semibold text-espresso">Chọn size</legend>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((s) => (
            <label
              key={s.id}
              className="cursor-pointer rounded-xl border border-line bg-surface p-2 text-center text-sm has-[:checked]:border-espresso has-[:checked]:bg-espresso has-[:checked]:text-cream"
            >
              <input
                type="radio"
                name={groupName}
                value={s.id}
                checked={size === s.id}
                onChange={() => onSizeChange(s.id)}
                className="sr-only"
              />
              <span className="block font-semibold">{s.id} · {s.label}</span>
              <span className="block text-xs opacity-80">{s.extra ? `+${formatVND(s.extra)}` : "Giá gốc"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold text-espresso">
          Topping <span className="font-normal text-muted">(tuỳ chọn)</span>
        </legend>
        <div className="space-y-2">
          {TOPPINGS.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 has-[:checked]:border-caramel has-[:checked]:bg-caramel/10"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={toppingIds.includes(t.id)}
                  onChange={() => onToggleTopping(t.id)}
                  className="size-4 accent-[var(--color-caramel-dark)]"
                />
                <span className="text-sm">{t.name}</span>
              </span>
              <span className="text-sm text-muted">+{formatVND(t.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
