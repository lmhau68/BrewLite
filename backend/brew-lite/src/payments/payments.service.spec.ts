import { ConflictException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsService', () => {
  const dto = {
    orderId: 41,
    amount: 35000,
    method: 'VI_DIEN_TU',
  };

  it('replays a payment for the same Idempotency-Key without starting another transaction', async () => {
    const savedPayment = {
      id: 8,
      orderId: dto.orderId,
      idempotencyKey: 'charge-41',
      amount: dto.amount,
      method: dto.method,
      status: PaymentStatus.SUCCEEDED,
      order: { status: OrderStatus.PAID },
    };
    const prisma = {
      payment: { findUnique: vi.fn().mockResolvedValue(savedPayment) },
      $transaction: vi.fn(),
    } as unknown as PrismaService;
    const service = new PaymentsService(prisma);

    const result = await service.processPayment(dto, 'charge-41');

    expect(result).toMatchObject({ success: true, isIdempotent: true, orderStatus: OrderStatus.PAID });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects reusing a key with a different payment request', async () => {
    const prisma = {
      payment: {
        findUnique: vi.fn().mockResolvedValue({
          id: 8,
          orderId: dto.orderId,
          amount: dto.amount,
          method: dto.method,
          status: PaymentStatus.SUCCEEDED,
          order: { status: OrderStatus.PAID },
        }),
      },
    } as unknown as PrismaService;
    const service = new PaymentsService(prisma);

    await expect(
      service.processPayment({ ...dto, amount: dto.amount + 1000 }, 'charge-41'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('records and awards loyalty points in the same successful payment transaction', async () => {
    const tx = {
      order: {
        findUnique: vi.fn().mockResolvedValue({
          id: dto.orderId,
          userId: 7,
          total: dto.amount,
          version: 0,
          status: OrderStatus.PENDING,
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        create: vi.fn().mockResolvedValue({ id: 2 }),
        update: vi.fn().mockResolvedValue({ id: 2, status: PaymentStatus.SUCCEEDED }),
      },
      user: { update: vi.fn().mockResolvedValue({}) },
      loyaltyTransaction: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      payment: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    } as unknown as PrismaService;
    const service = new PaymentsService(prisma);

    const result = await service.processPayment(dto, 'charge-42');

    expect(result).toMatchObject({ success: true, orderStatus: OrderStatus.PAID });
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: { userId: 7, orderId: dto.orderId, points: 3 },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { loyaltyPoints: { increment: 3 } },
    });
  });
});
