import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import type { CategoryId, Product } from './product.entity.js';
import { ProductsService } from './products.service.js';

const CATEGORIES: CategoryId[] = ['coffee', 'tea', 'milk-tea', 'blended'];

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  /** GET /products?category=coffee&q=sữa */
  @Get()
  findAll(@Query('category') category?: string, @Query('q') q?: string): Product[] {
    return this.products.findAll({
      category: CATEGORIES.includes(category as CategoryId) ? (category as CategoryId) : undefined,
      q,
    });
  }

  /** GET /products/:id  (400 nếu id không phải số, 404 nếu không tồn tại) */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Product {
    return this.products.findOne(id);
  }
}
