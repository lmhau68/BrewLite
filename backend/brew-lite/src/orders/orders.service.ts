import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
  READY: [OrderStatus.COMPLETED],
  COMPLETED: [],
  PAYMENT_FAILED: [OrderStatus.PAID, OrderStatus.CANCELLED],
  CANCELLED: [],
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một sản phẩm');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const productIds = [...new Set(dto.items.map((item) => item.productId))];
          const products = await tx.product.findMany({ where: { id: { in: productIds } } });
          const productMap = new Map(products.map((product) => [product.id, product]));

          let subtotal = 0;
          const itemData = dto.items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
              throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${item.productId}`);
            }

            // Giá luôn lấy từ server; client supplied price is intentionally ignored.
            const sizeSurcharge = item.size === 'M' ? 5000 : item.size === 'L' ? 10000 : 0;
            const unitPrice = money(product.price + sizeSurcharge);
            const lineTotal = money(unitPrice * item.qty);
            subtotal = money(subtotal + lineTotal);
            return { productId: item.productId, size: item.size, qty: item.qty, lineTotal };
          });

          let discountCode: string | undefined;
          let discountAmount = 0;
          if (dto.promotionCode) {
            const code = dto.promotionCode.trim().toUpperCase();
            const promotion = await tx.promotion.findUnique({ where: { code } });
            const now = new Date();
            if (
              !promotion ||
              !promotion.active ||
              promotion.discountPercent < 1 ||
              promotion.discountPercent > 100 ||
              (promotion.startsAt && promotion.startsAt > now) ||
              (promotion.expiresAt && promotion.expiresAt < now) ||
              subtotal < promotion.minimumSubtotal ||
              (promotion.maxUses !== null && promotion.usedCount >= promotion.maxUses)
            ) {
              throw new BadRequestException('Mã khuyến mãi không hợp lệ hoặc không còn hiệu lực');
            }

            const rawDiscount = money((subtotal * promotion.discountPercent) / 100);
            discountAmount = money(
              Math.min(
                subtotal,
                promotion.maxDiscount === null
                  ? rawDiscount
                  : Math.min(rawDiscount, promotion.maxDiscount),
              ),
            );
            discountCode = promotion.code;
            const reserved = await tx.promotion.updateMany({
              where: {
                id: promotion.id,
                AND: [
                  { usedCount: promotion.usedCount },
                  ...(promotion.maxUses === null ? [] : [{ usedCount: { lt: promotion.maxUses } }]),
                ],
              },
              data: { usedCount: { increment: 1 } },
            });
            if (reserved.count !== 1) {
              throw new ConflictException('Mã khuyến mãi vừa được sử dụng hết, vui lòng thử lại');
            }
          }

          // Aggregate repeated cart rows so stock is reserved exactly once per product.
          const quantities = new Map<number, number>();
          for (const item of dto.items) {
            quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.qty);
          }
          for (const [productId, qty] of quantities) {
            const product = productMap.get(productId)!;
            const reserved = await tx.product.updateMany({
              where: { id: productId, version: product.version, stock: { gte: qty } },
              data: { stock: { decrement: qty }, version: { increment: 1 } },
            });
            if (reserved.count !== 1) {
              throw new ConflictException(
                `Sản phẩm ${product.name} không đủ tồn kho hoặc vừa được đặt bởi khách khác`,
              );
            }
          }

          return tx.order.create({
            data: {
              userId: dto.userId ?? null,
              status: OrderStatus.PENDING,
              total: money(subtotal - discountAmount),
              discountCode,
              discountAmount,
              items: { create: itemData },
            },
            include: { items: { include: { product: true } }, payments: true },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Tồn kho vừa thay đổi, vui lòng thử đặt lại đơn hàng');
      }
      throw error;
    }
  }

  async transitionStatus(id: number, nextStatus: OrderStatus) {
    if (nextStatus === OrderStatus.PAID) {
      throw new BadRequestException('Đơn chỉ chuyển sang PAID sau khi thanh toán thành công');
    }
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    if (!transitions[order.status].includes(nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển đơn hàng từ ${order.status} sang ${nextStatus}`,
      );
    }

    const updated = await this.prisma.order.updateMany({
      where: { id, status: order.status, version: order.version },
      data: { status: nextStatus, version: { increment: 1 } },
    });
    if (updated.count !== 1) {
      throw new ConflictException('Trạng thái đơn hàng vừa được cập nhật, vui lòng tải lại');
    }
    return this.findOne(id);
  }

  async findAll(userId?: number) {
    return this.prisma.order.findMany({
      where: userId ? { userId } : {},
      include: { items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, payments: true },
    });
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    return order;
  }
}
