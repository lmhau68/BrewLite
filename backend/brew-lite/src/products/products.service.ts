import { Injectable, NotFoundException } from '@nestjs/common';
import type { CategoryId, Product } from './product.entity.js';
import { PRODUCTS_SEED } from './products.seed.js';

export interface ProductFilter {
  category?: CategoryId;
  q?: string;
}

@Injectable()
export class ProductsService {
  private readonly products: Product[] = PRODUCTS_SEED;

  findAll(filter: ProductFilter = {}): Product[] {
    const q = filter.q?.trim().toLowerCase();
    return this.products.filter(
      (p) =>
        (!filter.category || p.category === filter.category) &&
        (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    );
  }

  findOne(id: number): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }
}
