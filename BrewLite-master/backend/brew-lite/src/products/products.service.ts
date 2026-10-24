import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SIZE_OPTIONS } from './menu-options.js';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(category?: string, q?: string) {
    const keyword = q?.trim();
    return this.prisma.product.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' as const } },
                { description: { contains: keyword, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }
    return product;
  }

  /** Danh sách size + topping đang bán (topping `id` = mã `code`). */
  async findOptions() {
    const toppings = await this.prisma.topping.findMany({
      where: { active: true },
      orderBy: { id: 'asc' },
    });
    return {
      sizes: SIZE_OPTIONS,
      toppings: toppings.map((t) => ({ id: t.code, name: t.name, price: t.price })),
    };
  }
}
