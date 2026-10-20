import { formatVND } from "@/lib/format";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, onSelect }: Props) {
  const soldOut = product.stock <= 0;
  return (
    <li>
      <button
        type="button"
        disabled={soldOut}
        onClick={() => onSelect(product)}
        aria-label={soldOut ? `${product.name} - hết hàng` : `Chọn ${product.name}`}
        className="group flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-left shadow-sm transition active:scale-[0.99] enabled:hover:border-caramel disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-cream text-4xl"
        >
          {product.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-espresso">{product.name}</span>
            {product.bestSeller && !soldOut && (
              <span className="shrink-0 rounded-full bg-caramel/15 px-2 py-0.5 text-[11px] font-medium text-caramel-dark">
                Bán chạy
              </span>
            )}
          </span>
          <span className="mt-0.5 line-clamp-2 text-sm text-muted">{product.description}</span>
          <span className="mt-1.5 flex items-center justify-between">
            <span className="font-semibold text-caramel-dark">{formatVND(product.price)}</span>
            {soldOut ? (
              <span className="rounded-full bg-line px-2 py-0.5 text-xs font-medium text-muted">Hết hàng</span>
            ) : (
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-espresso text-lg text-cream transition group-hover:bg-caramel-dark"
              >
                +
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
