/**
 * Catalog tuỳ chọn sản phẩm (size + topping) và bảng giá tương ứng.
 *
 * Đây là nguồn sự thật của phía API: mọi đơn hàng đều được server tự tính giá
 * từ bảng này, không tin giá do client gửi lên (xem ADR-005, nguyên tắc
 * "Server tự tính giá").
 *
 * LƯU Ý: bảng giá ở `frontend/brewlite/lib/menu-options.ts` phải khớp với
 * bảng này. Hai bên đều có test riêng chốt các giá trị này để phát hiện lệch.
 */

export interface SizeOption {
  id: 'S' | 'M' | 'L';
  label: string;
  /** Phí thêm khi chọn size (VND). */
  extra: number;
}

export interface ToppingOption {
  id: string;
  name: string;
  /** Giá của topping (VND). */
  price: number;
}

export const SIZES: readonly SizeOption[] = [
  { id: 'S', label: 'Nhỏ', extra: 0 },
  { id: 'M', label: 'Vừa', extra: 6000 },
  { id: 'L', label: 'Lớn', extra: 10000 },
];

export const TOPPINGS: readonly ToppingOption[] = [
  { id: 'pearl', name: 'Trân châu đen', price: 8000 },
  { id: 'jelly', name: 'Thạch trái cây', price: 6000 },
  { id: 'cheese', name: 'Kem cheese', price: 10000 },
  { id: 'pudding', name: 'Pudding trứng', price: 7000 },
];

export function sizeExtra(size: string): number {
  return SIZES.find((s) => s.id === size)?.extra ?? 0;
}

export function toppingById(id: string): ToppingOption | undefined {
  return TOPPINGS.find((t) => t.id === id);
}
