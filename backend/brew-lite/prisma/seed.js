import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Menu mẫu. Phải khớp với `frontend/brewlite/lib/mock-data.ts` để giao diện
 * hiển thị giống nhau dù đọc từ API hay từ dữ liệu giả (xem ADR-007).
 */
const products = [
  { id: 1, name: 'Cà phê sữa đá', description: 'Cà phê phin đậm vị, sữa đặc béo ngọt, nhiều đá.', category: 'coffee', emoji: '☕', price: 29000, stock: 50, customizable: true, bestSeller: true },
  { id: 2, name: 'Bạc xỉu', description: 'Nhiều sữa, ít cà phê - nhẹ nhàng, dễ uống.', category: 'coffee', emoji: '🥛', price: 32000, stock: 40, customizable: true, bestSeller: false },
  { id: 3, name: 'Americano', description: 'Espresso pha loãng với nước nóng, vị đắng thanh.', category: 'coffee', emoji: '🫖', price: 35000, stock: 30, customizable: true, bestSeller: false },
  { id: 4, name: 'Latte caramel', description: 'Espresso, sữa tươi đánh nóng và sốt caramel.', category: 'coffee', emoji: '🍮', price: 45000, stock: 0, customizable: true, bestSeller: false },
  { id: 5, name: 'Trà đào cam sả', description: 'Trà đen, đào miếng, cam tươi và sả thơm.', category: 'tea', emoji: '🍑', price: 42000, stock: 35, customizable: true, bestSeller: true },
  { id: 6, name: 'Trà vải hoa hồng', description: 'Trà ô long, vải ngâm và cánh hoa hồng.', category: 'tea', emoji: '🌹', price: 42000, stock: 25, customizable: true, bestSeller: false },
  { id: 7, name: 'Trà chanh mật ong', description: 'Trà xanh, chanh vàng tươi và mật ong rừng.', category: 'tea', emoji: '🍋', price: 36000, stock: 45, customizable: true, bestSeller: false },
  { id: 8, name: 'Trà sữa trân châu đường đen', description: 'Trà sữa đậm vị, trân châu nấu đường đen.', category: 'milk-tea', emoji: '🧋', price: 45000, stock: 60, customizable: true, bestSeller: true },
  { id: 9, name: 'Trà sữa matcha', description: 'Matcha Nhật, sữa tươi, thơm béo.', category: 'milk-tea', emoji: '🍵', price: 48000, stock: 20, customizable: true, bestSeller: false },
  { id: 10, name: 'Trà sữa khoai môn', description: 'Khoai môn nghiền mịn, thơm bùi.', category: 'milk-tea', emoji: '🍠', price: 46000, stock: 18, customizable: true, bestSeller: false },
  { id: 11, name: 'Cookie đá xay', description: 'Bánh cookie xay nhuyễn với kem sữa lạnh.', category: 'blended', emoji: '🍪', price: 52000, stock: 22, customizable: true, bestSeller: false },
  { id: 12, name: 'Sinh tố xoài', description: 'Xoài cát chín, sữa chua và đá xay.', category: 'blended', emoji: '🥭', price: 49000, stock: 15, customizable: true, bestSeller: false },
  { id: 13, name: 'Chocolate đá xay', description: 'Socola Bỉ đậm vị, phủ kem tươi.', category: 'blended', emoji: '🍫', price: 54000, stock: 12, customizable: true, bestSeller: false },
  { id: 14, name: 'Nước suối', description: 'Nước khoáng đóng chai 500ml.', category: 'tea', emoji: '💧', price: 12000, stock: 100, customizable: false, bestSeller: false },
];

try {
  for (const product of products) {
    const { id, ...data } = product;
    await prisma.product.upsert({
      where: { id },
      update: { ...data, imageUrl: '' },
      create: { id, ...data, imageUrl: '' },
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
  console.log(`Seeded ${products.length} products and WELCOME10 promotion.`);
} finally {
  await prisma.$disconnect();
}
