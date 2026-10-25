"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { deriveBasePrice, unitPriceFromBase } from "@/lib/cart";
import { formatVND } from "@/lib/format";
import { TOPPINGS } from "@/lib/menu-options";
import type { CartLine, SizeId } from "@/lib/types";
import { useCart } from "./CartProvider";
import { ProductOptions } from "./ProductOptions";
import { Sheet } from "./Sheet";

export function CartSheet({ onClose }: { onClose: () => void }) {
  const { lines, total, count, dispatch } = useCart();

  /** Dòng đang sửa size/topping (null = đang ở danh sách giỏ) */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftSize, setDraftSize] = useState<SizeId>("S");
  const [draftToppingIds, setDraftToppingIds] = useState<string[]>([]);

  const editing = editingKey ? (lines.find((l) => l.key === editingKey) ?? null) : null;
  const draftToppings = useMemo(
    () => TOPPINGS.filter((t) => draftToppingIds.includes(t.id)),
    [draftToppingIds],
  );
  /** Đơn giá sau khi sửa - dùng giá gốc của sản phẩm để tính lại */
  const draftUnit = editing
    ? unitPriceFromBase(editing.basePrice ?? deriveBasePrice(editing), draftSize, draftToppings)
    : 0;

  const startEdit = (line: CartLine) => {
    setEditingKey(line.key);
    setDraftSize(line.size);
    setDraftToppingIds(line.toppings.map((t) => t.id));
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftSize("S");
    setDraftToppingIds([]);
  };

  const saveEdit = () => {
    if (!editing) return;
    dispatch({ type: "update", key: editing.key, size: draftSize, toppings: draftToppings });
    cancelEdit();
  };

  const toggleDraftTopping = (id: string) =>
    setDraftToppingIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  /* ---------------------------------------------------------------- */
  /* Màn hình sửa dòng: chọn lại size + topping                        */
  /* ---------------------------------------------------------------- */
  if (editing) {
    return (
      <Sheet
        title={`Sửa ${editing.name}`}
        onClose={cancelEdit}
        footer={
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted">Thành tiền mới</span>
              <span className="text-lg font-bold text-espresso">
                {formatVND(draftUnit * editing.qty)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-muted hover:text-espresso"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="flex-1 rounded-full bg-espresso py-3 font-semibold text-cream hover:bg-caramel-dark"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-4 pb-4">
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-cream text-3xl"
          >
            {editing.emoji}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-espresso">{editing.name}</p>
            <p className="text-xs text-muted">
              Số lượng {editing.qty} · đơn giá hiện tại {formatVND(editing.unitPrice)}
            </p>
          </div>
        </div>

        <ProductOptions
          size={draftSize}
          toppingIds={draftToppingIds}
          onSizeChange={setDraftSize}
          onToggleTopping={toggleDraftTopping}
        />
      </Sheet>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Danh sách giỏ hàng                                                */
  /* ---------------------------------------------------------------- */
  return (
    <Sheet
      title={`Giỏ hàng${count ? ` (${count})` : ""}`}
      onClose={onClose}
      footer={
        lines.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted">Tạm tính</span>
              <span className="text-lg font-bold text-espresso">{formatVND(total)}</span>
            </div>
            {/* Điều hướng làm MenuScreen unmount nên sheet tự đóng, không cần onClick */}
            <Link
              href="/checkout"
              className="block w-full rounded-full bg-espresso py-3 text-center font-semibold text-cream hover:bg-caramel-dark"
            >
              Đặt đơn
            </Link>
          </div>
        )
      }
    >
      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <span aria-hidden className="text-5xl">🛒</span>
          <p className="font-semibold text-espresso">Giỏ hàng đang trống</p>
          <p className="text-sm text-muted">Chọn vài món ngon từ menu nhé.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {lines.map((l) => (
              <li key={l.key} className="flex gap-3 py-3">
                <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-cream text-3xl">
                  {l.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-espresso">{l.name}</p>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-muted">
                      Size {l.size}
                      {l.toppings.length > 0 && ` · ${l.toppings.map((t) => t.name).join(", ")}`}
                    </p>
                    {l.customizable !== false && (
                      <button
                        type="button"
                        aria-label={`Sửa ${l.name}`}
                        onClick={() => startEdit(l)}
                        className="shrink-0 text-xs font-semibold text-caramel-dark underline"
                      >
                        Sửa
                      </button>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-line">
                      <button
                        type="button"
                        aria-label={`Giảm ${l.name}`}
                        onClick={() => dispatch({ type: "dec", key: l.key })}
                        className="size-8 text-espresso"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold" aria-label={`Số lượng ${l.name}`}>{l.qty}</span>
                      <button
                        type="button"
                        aria-label={`Tăng ${l.name}`}
                        onClick={() => dispatch({ type: "inc", key: l.key })}
                        className="size-8 text-espresso"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-semibold text-caramel-dark">{formatVND(l.unitPrice * l.qty)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Xoá ${l.name}`}
                  onClick={() => dispatch({ type: "remove", key: l.key })}
                  className="self-start text-muted hover:text-red-600"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => dispatch({ type: "clear" })}
            className="mt-2 text-sm text-muted underline hover:text-red-600"
          >
            Xoá toàn bộ giỏ hàng
          </button>
        </>
      )}
    </Sheet>
  );
}
