"use client";

import { useMemo, useState } from "react";
import { unitPriceOf, MAX_QTY_PER_LINE } from "@/lib/cart";
import { formatVND } from "@/lib/format";
import { TOPPINGS } from "@/lib/menu-options";
import type { Product, SizeId, ToppingOption } from "@/lib/types";
import { ProductOptions } from "./ProductOptions";
import { Sheet } from "./Sheet";

interface Props {
  product: Product;
  onClose: () => void;
  onAdd: (product: Product, size: SizeId, toppings: ToppingOption[], qty: number) => void;
}

export function ProductSheet({ product, onClose, onAdd }: Props) {
  const [size, setSize] = useState<SizeId>("S");
  const [toppingIds, setToppingIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);

  const toppings = useMemo(() => TOPPINGS.filter((t) => toppingIds.includes(t.id)), [toppingIds]);
  const unit = unitPriceOf(product, size, toppings);

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
        <ProductOptions
          size={size}
          toppingIds={toppingIds}
          onSizeChange={setSize}
          onToggleTopping={toggleTopping}
        />
      ) : (
        <p className="rounded-xl bg-cream p-3 text-sm text-muted">Món này không có tuỳ chọn size hoặc topping.</p>
      )}
    </Sheet>
  );
}
