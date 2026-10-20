"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getProducts } from "@/lib/api";
import { formatVND } from "@/lib/format";
import { CATEGORIES } from "@/lib/menu-options";
import type { CategoryId, Product, SizeId, ToppingOption } from "@/lib/types";
import { CartSheet } from "./CartSheet";
import { useCart } from "./CartProvider";
import { EmptyState, ErrorState, MenuSkeleton } from "./MenuStates";
import { ProductCard } from "./ProductCard";
import { ProductSheet } from "./ProductSheet";

type Status = "loading" | "error" | "ready";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase().trim();

export function MenuScreen() {
  const { count, total, dispatch } = useCart();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setProducts(await getProducts());
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu lần đầu khi mount
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const q = normalize(query);
    return products.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || normalize(p.name).includes(q) || normalize(p.description).includes(q)),
    );
  }, [products, category, query]);

  const handleAdd = (product: Product, size: SizeId, toppings: ToppingOption[], qty: number) => {
    dispatch({ type: "add", product, size, toppings, qty });
    setSelected(null);
    setToast(`Đã thêm ${qty} × ${product.name}`);
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("all");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-28 shadow-xl">
      <header className="sticky top-0 z-30 bg-espresso px-4 pt-5 pb-4 text-cream">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-caramel-light">BrewLite</p>
            <h1 className="text-xl font-bold">Hôm nay bạn uống gì?</h1>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Mở giỏ hàng, ${count} món`}
            className="relative flex size-11 items-center justify-center rounded-full bg-cream/10 text-xl hover:bg-cream/20"
          >
            🛒
            {count > 0 && (
              <span
                data-testid="cart-badge"
                className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-caramel px-1 text-xs font-bold text-white"
              >
                {count}
              </span>
            )}
          </button>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Tìm đồ uống</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm đồ uống…"
            className="w-full rounded-full bg-cream px-4 py-2.5 text-sm text-espresso placeholder:text-muted focus:outline-2 focus:outline-caramel"
          />
        </label>
      </header>

      <nav aria-label="Danh mục" className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
            className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-espresso aria-pressed:border-espresso aria-pressed:bg-espresso aria-pressed:text-cream"
          >
            <span aria-hidden>{c.emoji} </span>
            {c.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 px-4">
        {status === "loading" && <MenuSkeleton />}
        {status === "error" && <ErrorState message={error} onRetry={load} />}
        {status === "ready" &&
          (visible.length === 0 ? (
            <EmptyState query={query} onReset={products.length ? resetFilters : undefined} />
          ) : (
            <ul className="space-y-3" aria-label="Danh sách đồ uống">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={setSelected} />
              ))}
            </ul>
          ))}
      </main>

      {count > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md p-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex w-full items-center justify-between rounded-full bg-caramel-dark px-5 py-3.5 font-semibold text-white shadow-lg hover:bg-espresso"
          >
            <span>Xem giỏ hàng · {count} món</span>
            <span>{formatVND(total)}</span>
          </button>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed top-20 left-1/2 z-[60] -translate-x-1/2 whitespace-nowrap rounded-full bg-espresso px-4 py-2 text-sm text-cream shadow-lg">
          {toast}
        </div>
      )}

      {selected && <ProductSheet product={selected} onClose={() => setSelected(null)} onAdd={handleAdd} />}
      {cartOpen && <CartSheet onClose={() => setCartOpen(false)} />}
    </div>
  );
}
