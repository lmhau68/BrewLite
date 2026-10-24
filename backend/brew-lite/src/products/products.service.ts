import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ProductFilter {
  /** Danh mục: coffee | tea | milk-tea | blended */
  category?: string;
  /** Từ khoá tìm kiếm trên tên sản phẩm */
  q?: string;
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: ProductFilter = {}) {
    const { category, q } = filter;
    return this.prisma.product.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${id}`);
    }
    return product;
  }
}
