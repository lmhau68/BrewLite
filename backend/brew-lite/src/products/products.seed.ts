import type { Product } from './product.entity.js';

/** Dữ liệu mẫu Sprint 1 (thay bằng Prisma seed khi nối PostgreSQL ở Sprint 2). */
export const PRODUCTS_SEED: Product[] = [
  { id: 1, name: "Cà phê sữa đá", description: "Cà phê phin đậm vị, sữa đặc béo ngọt, nhiều đá.", category: "coffee", price: 29000, emoji: "☕", stock: 50, customizable: true, bestSeller: true },
  { id: 2, name: "Bạc xỉu", description: "Nhiều sữa, ít cà phê - nhẹ nhàng, dễ uống.", category: "coffee", price: 32000, emoji: "🥛", stock: 40, customizable: true },
  { id: 3, name: "Americano", description: "Espresso pha loãng với nước nóng, vị đắng thanh.", category: "coffee", price: 35000, emoji: "🫖", stock: 30, customizable: true },
  { id: 4, name: "Latte caramel", description: "Espresso, sữa tươi đánh nóng và sốt caramel.", category: "coffee", price: 45000, emoji: "🍮", stock: 0, customizable: true },
  { id: 5, name: "Trà đào cam sả", description: "Trà đen, đào miếng, cam tươi và sả thơm.", category: "tea", price: 42000, emoji: "🍑", stock: 35, customizable: true, bestSeller: true },
  { id: 6, name: "Trà vải hoa hồng", description: "Trà ô long, vải ngâm và cánh hoa hồng.", category: "tea", price: 42000, emoji: "🌹", stock: 25, customizable: true },
  { id: 7, name: "Trà chanh mật ong", description: "Trà xanh, chanh vàng tươi và mật ong rừng.", category: "tea", price: 36000, emoji: "🍋", stock: 45, customizable: true },
  { id: 8, name: "Trà sữa trân châu đường đen", description: "Trà sữa đậm vị, trân châu nấu đường đen.", category: "milk-tea", price: 45000, emoji: "🧋", stock: 60, customizable: true, bestSeller: true },
  { id: 9, name: "Trà sữa matcha", description: "Matcha Nhật, sữa tươi, thơm béo.", category: "milk-tea", price: 48000, emoji: "🍵", stock: 20, customizable: true },
  { id: 10, name: "Trà sữa khoai môn", description: "Khoai môn nghiền mịn, thơm bùi.", category: "milk-tea", price: 46000, emoji: "🍠", stock: 18, customizable: true },
  { id: 11, name: "Cookie đá xay", description: "Bánh cookie xay nhuyễn với kem sữa lạnh.", category: "blended", price: 52000, emoji: "🍪", stock: 22, customizable: true },
  { id: 12, name: "Sinh tố xoài", description: "Xoài cát chín, sữa chua và đá xay.", category: "blended", price: 49000, emoji: "🥭", stock: 15, customizable: true },
  { id: 13, name: "Chocolate đá xay", description: "Socola Bỉ đậm vị, phủ kem tươi.", category: "blended", price: 54000, emoji: "🍫", stock: 12, customizable: true },
  { id: 14, name: "Nước suối", description: "Nước khoáng đóng chai 500ml.", category: "tea", price: 12000, emoji: "💧", stock: 100, customizable: false },
];
