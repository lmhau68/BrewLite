"use client";

import { useMemo, useState } from "react";
import { unitPriceOf, MAX_QTY_PER_LINE } from "@/lib/cart";
import { formatVND } from "@/lib/format";
import type { MenuOptions, Product, SizeId, ToppingOption } from "@/lib/types";
import { Sheet } from "./Sheet";

interface Props {
  product: Product;
  /** Size/topping lấy từ API (GET /options) */
  options: MenuOptions;
  onClose: () => void;
  onAdd: (product: Product, size: SizeId, toppings: ToppingOption[], qty: number) => void;
}

export function ProductSheet({ product, options, onClose, onAdd }: Props) {
  const { sizes, toppings: toppingOptions } = options;
  const [size, setSize] = useState<SizeId>(sizes[0]?.id ?? "S");
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const toppings = useMemo(
    () => toppingOptions.filter((t) => toppingIds.includes(t.id)),
    [toppingOptions, toppingIds],
  );
  const unit = unitPriceOf(product, size, toppings, sizes);

  const toggleTopping = (id: string) =>
    setToppingIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Sheet
      title={product.name}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-full border border-line">
            <button
              type="button"
              aria-label="Giảm số lượng"
              disabled={qty <= 1}
              onClick={() => setQty((q) => q - 1)}
              className="size-10 text-xl text-espresso disabled:opacity-30"
            >
              −
            </button>
            <span aria-live="polite" aria-label="Số lượng" className="w-8 text-center font-semibold">{qty}</span>
            <button
              type="button"
              aria-label="Tăng số lượng"
              disabled={qty >= MAX_QTY_PER_LINE}
              onClick={() => setQty((q) => q + 1)}
              className="size-10 text-xl text-espresso disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => onAdd(product, size, toppings, qty)}
            className="flex-1 rounded-full bg-espresso py-3 font-semibold text-cream hover:bg-caramel-dark"
          >
            Thêm vào giỏ · {formatVND(unit * qty)}
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-4 pb-4">
        <span aria-hidden className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-cream text-6xl">
          {product.emoji}
        </span>
        <div>
          <p className="text-sm text-muted">{product.description}</p>
          <p className="mt-1 font-bold text-caramel-dark">{formatVND(product.price)}</p>
        </div>
      </div>

      {product.customizable ? (
        <>
          <fieldset className="pb-4">
            <legend className="mb-2 font-semibold text-espresso">Chọn size</legend>
            <div className="grid grid-cols-3 gap-2">
              {sizes.map((s) => (
                <label
                  key={s.id}
                  className="cursor-pointer rounded-xl border border-line bg-surface p-2 text-center text-sm has-[:checked]:border-espresso has-[:checked]:bg-espresso has-[:checked]:text-cream"
                >
                  <input
                    type="radio"
                    name="size"
                    value={s.id}
                    checked={size === s.id}
                    onChange={() => setSize(s.id)}
                    className="sr-only"
                  />
                  <span className="block font-semibold">{s.id} · {s.label}</span>
                  <span className="block text-xs opacity-80">{s.extra ? `+${formatVND(s.extra)}` : "Giá gốc"}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {toppingOptions.length > 0 && (
          <fieldset>
            <legend className="mb-2 font-semibold text-espresso">Topping <span className="font-normal text-muted">(tuỳ chọn)</span></legend>
            <div className="space-y-2">
              {toppingOptions.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 has-[:checked]:border-caramel has-[:checked]:bg-caramel/10"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={toppingIds.includes(t.id)}
                      onChange={() => toggleTopping(t.id)}
                      className="size-4 accent-[var(--color-caramel-dark)]"
                    />
                    <span className="text-sm">{t.name}</span>
                  </span>
                  <span className="text-sm text-muted">+{formatVND(t.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          )}
        </>
      ) : (
        <p className="rounded-xl bg-cream p-3 text-sm text-muted">Món này không có tuỳ chọn size hoặc topping.</p>
      )}
    </Sheet>
  );
}
