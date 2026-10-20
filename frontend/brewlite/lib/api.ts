import { MOCK_PRODUCTS } from "./mock-data";
import type { Product } from "./types";

/**
 * Lớp truy cập dữ liệu menu.
 * - Không đặt NEXT_PUBLIC_API_URL  -> dùng dữ liệu giả (chạy được ngay, không cần backend).
 * - Đặt NEXT_PUBLIC_API_URL        -> gọi API NestJS: GET /products, GET /products/:id.
 *
 * Demo trạng thái (chỉ khi dùng dữ liệu giả): thêm ?state=error | empty vào URL.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const MOCK_DELAY_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function demoState(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("state");
}

export async function getProducts(): Promise<Product[]> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error(`Không tải được menu (HTTP ${res.status})`);
    return (await res.json()) as Product[];
  }
  await sleep(MOCK_DELAY_MS);
  const state = demoState();
  if (state === "error") throw new Error("Không thể kết nối máy chủ");
  if (state === "empty") return [];
  return MOCK_PRODUCTS;
}

export async function getProduct(id: number): Promise<Product> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (res.status === 404) throw new Error("Sản phẩm không tồn tại");
    if (!res.ok) throw new Error(`Không tải được sản phẩm (HTTP ${res.status})`);
    return (await res.json()) as Product;
  }
  await sleep(MOCK_DELAY_MS / 2);
  const found = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!found) throw new Error("Sản phẩm không tồn tại");
  return found;
}
