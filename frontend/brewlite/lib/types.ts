export type CategoryId = "coffee" | "tea" | "milk-tea" | "blended";

export interface Product {
  id: number;
  name: string;
  description: string;
  category: CategoryId;
  /** Giá cơ bản (size S), đơn vị VND */
  price: number;
  emoji: string;
  /** Tồn kho. 0 = hết hàng */
  stock: number;
  /** Cho phép chọn size/topping */
  customizable: boolean;
  bestSeller?: boolean;
}

export type SizeId = "S" | "M" | "L";

export interface SizeOption {
  id: SizeId;
  label: string;
  extra: number;
}

export interface ToppingOption {
  id: string;
  name: string;
  price: number;
}

export interface CartLine {
  /** Khoá gộp dòng: cùng sản phẩm + size + topping thì cộng dồn số lượng */
  key: string;
  productId: number;
  name: string;
  emoji: string;
  size: SizeId;
  toppings: ToppingOption[];
  qty: number;
  /** Đơn giá 1 ly đã gồm size + topping */
  unitPrice: number;
}
