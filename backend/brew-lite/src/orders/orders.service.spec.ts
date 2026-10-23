import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  it('returns the wrapped order response expected by the frontend API client', async () => {
    const createdOrder = { id: 20, status: OrderStatus.PENDING, total: 35000 };
    const tx = {
      product: {
        findMany: vi.fn().mockResolvedValue([
          { id: 1, name: 'Cà phê sữa', price: 35000, stock: 5, version: 0 },
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      order: { create: vi.fn().mockResolvedValue(createdOrder) },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    const result = await service.create({ items: [{ productId: 1, size: 'S', qty: 1 }] });

    expect(result).toEqual({
      message: 'Tạo đơn hàng thành công (chờ thanh toán)',
      order: createdOrder,
    });
  });

  it('rejects a transition that is not in the order state machine', async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 12,
          status: OrderStatus.PENDING,
          version: 0,
          items: [],
        }),
        updateMany: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await expect(service.transitionStatus(12, OrderStatus.COMPLETED)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('restores reserved stock and promotion usage when cancelling an unpaid order', async () => {
    const order = {
      id: 12,
      status: OrderStatus.PENDING,
      version: 0,
      discountCode: 'WELCOME10',
      items: [
        { productId: 1, qty: 2 },
        { productId: 1, qty: 1 },
      ],
    };
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue(order),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      product: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      promotion: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      order: {
        findUnique: vi.fn().mockResolvedValue({ ...order, status: OrderStatus.CANCELLED }),
      },
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await service.transitionStatus(12, OrderStatus.CANCELLED);

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { stock: { increment: 3 }, version: { increment: 1 } },
    });
    expect(tx.promotion.updateMany).toHaveBeenCalledWith({
      where: { code: 'WELCOME10', usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  });

  it('does not allow cancelling a paid order when refunds are unsupported', async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 12,
          status: OrderStatus.PAID,
          version: 1,
          items: [],
        }),
        updateMany: vi.fn(),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await expect(service.transitionStatus(12, OrderStatus.CANCELLED)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });

  it('uses an optimistic stock update so concurrent orders cannot oversell', async () => {
    let stock = 1;
    let version = 0;
    let nextOrderId = 1;
    const tx = {
      product: {
        findMany: vi.fn(async () => [
          { id: 1, name: 'Cà phê sữa', price: 35000, stock, version },
        ]),
        updateMany: vi.fn(async (args: {
          where: { version: number; stock: { gte: number } };
          data: { stock: { decrement: number }; version: { increment: number } };
        }) => {
          const { where, data } = args;
          if (where.version !== version || stock < where.stock.gte) return { count: 0 };
          stock -= data.stock.decrement;
          version += data.version.increment;
          return { count: 1 };
        }),
      },
      promotion: { findUnique: vi.fn() },
      order: {
        create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
          id: nextOrderId++,
          ...args.data,
        })),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);
    const dto = { items: [{ productId: 1, size: 'S', qty: 1 }] };

    const results = await Promise.allSettled([service.create(dto), service.create(dto)]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(ConflictException);
    expect(stock).toBe(0);
  });
});
