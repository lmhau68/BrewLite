import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  const service = new ProductsService();

  it('trả về toàn bộ sản phẩm', () => {
    expect(service.findAll().length).toBeGreaterThan(0);
  });

  it('lọc theo danh mục', () => {
    const list = service.findAll({ category: 'milk-tea' });
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => p.category === 'milk-tea')).toBe(true);
  });

  it('tìm theo từ khoá không phân biệt hoa thường', () => {
    expect(service.findAll({ q: 'MATCHA' }).map((p) => p.name)).toContain('Trà sữa matcha');
    expect(service.findAll({ q: 'khong-co-mon-nay' })).toEqual([]);
  });

  it('findOne trả đúng sản phẩm và ném 404 khi không có', () => {
    expect(service.findOne(1).name).toBe('Cà phê sữa đá');
    expect(() => service.findOne(9999)).toThrow(NotFoundException);
  });
});
