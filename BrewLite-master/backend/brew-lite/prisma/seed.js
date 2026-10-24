import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Dữ liệu menu — giữ khớp với frontend/brewlite/lib/mock-data.ts.
// Frontend cần đủ category / description / emoji / customizable để hiển thị và bật Size/Topping.
const products = [
  { id: 1, name: 'Cà phê sữa đá', description: 'Cà phê phin đậm vị, sữa đặc béo ngọt, nhiều đá.', category: 'coffee', price: 29000, emoji: '☕', stock: 50, customizable: true, bestSeller: true },
  { id: 2, name: 'Bạc xỉu', description: 'Nhiều sữa, ít cà phê - nhẹ nhàng, dễ uống.', category: 'coffee', price: 32000, emoji: '🥛', stock: 40, customizable: true, bestSeller: false },
  { id: 3, name: 'Americano', description: 'Espresso pha loãng với nước nóng, vị đắng thanh.', category: 'coffee', price: 35000, emoji: '🫖', stock: 30, customizable: true, bestSeller: false },
  { id: 4, name: 'Latte caramel', description: 'Espresso, sữa tươi đánh nóng và sốt caramel.', category: 'coffee', price: 45000, emoji: '🍮', stock: 25, customizable: true, bestSeller: false },
  { id: 5, name: 'Trà đào cam sả', description: 'Trà đen, đào miếng, cam tươi và sả thơm.', category: 'tea', price: 42000, emoji: '🍑', stock: 35, customizable: true, bestSeller: true },
  { id: 6, name: 'Trà vải hoa hồng', description: 'Trà ô long, vải ngâm và cánh hoa hồng.', category: 'tea', price: 42000, emoji: '🌹', stock: 25, customizable: true, bestSeller: false },
  { id: 7, name: 'Trà chanh mật ong', description: 'Trà xanh, chanh vàng tươi và mật ong rừng.', category: 'tea', price: 36000, emoji: '🍋', stock: 45, customizable: true, bestSeller: false },
  { id: 8, name: 'Trà sữa trân châu đường đen', description: 'Trà sữa đậm vị, trân châu nấu đường đen.', category: 'milk-tea', price: 45000, emoji: '🧋', stock: 60, customizable: true, bestSeller: true },
  { id: 9, name: 'Trà sữa matcha', description: 'Matcha Nhật, sữa tươi, thơm béo.', category: 'milk-tea', price: 48000, emoji: '🍵', stock: 20, customizable: true, bestSeller: false },
  { id: 10, name: 'Trà sữa khoai môn', description: 'Khoai môn nghiền mịn, thơm bùi.', category: 'milk-tea', price: 46000, emoji: '🍠', stock: 18, customizable: true, bestSeller: false },
  { id: 11, name: 'Cookie đá xay', description: 'Bánh cookie xay nhuyễn với kem sữa lạnh.', category: 'blended', price: 52000, emoji: '🍪', stock: 22, customizable: true, bestSeller: false },
  { id: 12, name: 'Sinh tố xoài', description: 'Xoài cát chín, sữa chua và đá xay.', category: 'blended', price: 49000, emoji: '🥭', stock: 15, customizable: true, bestSeller: false },
  { id: 13, name: 'Chocolate đá xay', description: 'Socola Bỉ đậm vị, phủ kem tươi.', category: 'blended', price: 54000, emoji: '🍫', stock: 12, customizable: true, bestSeller: false },
  { id: 14, name: 'Nước suối', description: 'Nước khoáng đóng chai 500ml.', category: 'tea', price: 12000, emoji: '💧', stock: 100, customizable: false, bestSeller: false },
];

// Topping (mã `code` được frontend dùng làm id). Giá do server tính khi tạo đơn.
const toppings = [
  { code: 'pearl', name: 'Trân châu đen', price: 8000 },
  { code: 'jelly', name: 'Thạch trái cây', price: 6000 },
  { code: 'cheese', name: 'Kem cheese', price: 10000 },
  { code: 'pudding', name: 'Pudding trứng', price: 7000 },
];

try {
  for (const product of products) {
    const data = { ...product, imageUrl: '' };
    // Seed lại chỉ cập nhật thông tin hiển thị/giá; KHÔNG ghi đè stock để không làm mất tồn kho đang chạy.
    const { stock, ...updatable } = data;
    await prisma.product.upsert({
      where: { id: product.id },
      update: updatable,
      create: data,
    });
  }

  for (const topping of toppings) {
    await prisma.topping.upsert({
      where: { code: topping.code },
      update: { name: topping.name, price: topping.price, active: true },
      create: topping,
    });
  }

  await prisma.promotion.upsert({
    where: { code: 'WELCOME10' },
    update: {
      discountPercent: 10,
      maxDiscount: 30000,
      minimumSubtotal: 0,
      active: true,
    },
    create: {
      code: 'WELCOME10',
      discountPercent: 10,
      maxDiscount: 30000,
    },
  });

  await prisma.$queryRaw`SELECT setval(pg_get_serial_sequence('"Product"', 'id'), (SELECT MAX("id") FROM "Product"), true)`;
  console.log(`Seeded ${products.length} products, ${toppings.length} toppings and WELCOME10 promotion.`);
} finally {
  await prisma.$disconnect();
}
