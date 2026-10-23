import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  { id: 1, name: 'Cà phê sữa đá', price: 29000, stock: 50 },
  { id: 2, name: 'Bạc xỉu', price: 32000, stock: 40 },
  { id: 3, name: 'Americano', price: 35000, stock: 30 },
  { id: 4, name: 'Latte caramel', price: 45000, stock: 25 },
  { id: 5, name: 'Trà đào cam sả', price: 42000, stock: 35 },
];

try {
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: { name: product.name, price: product.price, imageUrl: '' },
      create: { ...product, imageUrl: '' },
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
  console.log('Seeded 5 products and WELCOME10 promotion.');
} finally {
  await prisma.$disconnect();
}
