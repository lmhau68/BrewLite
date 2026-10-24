import type { CategoryId, SizeOption, ToppingOption } from "./types";

export const CATEGORIES: { id: CategoryId | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "Tất cả", emoji: "✨" },
  { id: "coffee", label: "Cà phê", emoji: "☕" },
  { id: "tea", label: "Trà trái cây", emoji: "🍑" },
  { id: "milk-tea", label: "Trà sữa", emoji: "🧋" },
  { id: "blended", label: "Đá xay", emoji: "🥤" },
];

/** Giá trị dự phòng (khớp backend). Giao diện ưu tiên danh sách lấy từ GET /options. */
export const SIZES: SizeOption[] = [
  { id: "S", label: "Nhỏ", extra: 0 },
  { id: "M", label: "Vừa", extra: 5000 },
  { id: "L", label: "Lớn", extra: 10000 },
];

export const TOPPINGS: ToppingOption[] = [
  { id: "pearl", name: "Trân châu đen", price: 8000 },
  { id: "jelly", name: "Thạch trái cây", price: 6000 },
  { id: "cheese", name: "Kem cheese", price: 10000 },
  { id: "pudding", name: "Pudding trứng", price: 7000 },
];
