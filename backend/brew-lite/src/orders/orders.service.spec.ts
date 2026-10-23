import { BadRequestException, ConflictException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  it('rejects a transition that is not in the order state machine', async () => {
    const prisma = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: 12,
          status: OrderStatus.PENDING,
          version: 0,
        }),
        updateMany: vi.fn(),
      },
    } as unknown as PrismaService;
    const service = new OrdersService(prisma);

    await expect(service.transitionStatus(12, OrderStatus.COMPLETED)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
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
