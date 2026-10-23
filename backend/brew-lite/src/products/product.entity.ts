export type CategoryId = 'coffee' | 'tea' | 'milk-tea' | 'blended';

export interface Product {
  id: number;
  name: string;
  description: string;
  category: CategoryId;
  /** Giá cơ bản (size S), VND */
  price: number;
  emoji: string;
  /** 0 = hết hàng */
  stock: number;
  customizable: boolean;
  bestSeller?: boolean;
}
