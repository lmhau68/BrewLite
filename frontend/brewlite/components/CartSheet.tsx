"use client";

import { useState } from "react";
import { formatVND } from "@/lib/format";
import { useCart } from "./CartProvider";
import { Sheet } from "./Sheet";

export function CartSheet({ onClose }: { onClose: () => void }) {
  const { lines, total, count, dispatch } = useCart();
  const [notice, setNotice] = useState(false);

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
            {notice && (
              <p role="status" className="rounded-lg bg-cream p-2 text-center text-sm text-muted">
                Chức năng đặt đơn & thanh toán sẽ có ở Sprint 2.
              </p>
            )}
            <button
              type="button"
              onClick={() => setNotice(true)}
              className="w-full rounded-full bg-espresso py-3 font-semibold text-cream hover:bg-caramel-dark"
            >
              Đặt đơn
            </button>
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
                  <p className="text-xs text-muted">
                    Size {l.size}
                    {l.toppings.length > 0 && ` · ${l.toppings.map((t) => t.name).join(", ")}`}
                  </p>
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
