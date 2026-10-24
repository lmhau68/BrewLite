import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { sizeSurcharge } from '../products/menu-options.js';

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  PAID: [OrderStatus.PREPARING],
  PREPARING: [OrderStatus.READY],
  READY: [OrderStatus.COMPLETED],
  COMPLETED: [],
  PAYMENT_FAILED: [OrderStatus.CANCELLED],
  CANCELLED: [],
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto, authUserId?: number) {
    if (!dto.items?.length) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một sản phẩm');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const productIds = [...new Set(dto.items.map((item) => item.productId))];
          const products = await tx.product.findMany({ where: { id: { in: productIds } } });
          const productMap = new Map(products.map((product) => [product.id, product]));

          // Topping: chỉ truy vấn khi có món chọn topping; giá luôn lấy từ DB.
          const toppingCodes = [
            ...new Set(dto.items.flatMap((item) => (item.toppings ?? []).map((t) => t.id))),
          ];
          const toppingRows = toppingCodes.length
            ? await tx.topping.findMany({ where: { code: { in: toppingCodes }, active: true } })
            : [];
          const toppingMap = new Map(toppingRows.map((t) => [t.code, t]));

          let subtotal = 0;
          const itemData = dto.items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) {
              throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${item.productId}`);
            }

            // Giá luôn lấy từ server; client supplied price is intentionally ignored.
            const chosen = [...new Set((item.toppings ?? []).map((t) => t.id))].map((code) => {
              const topping = toppingMap.get(code);
              if (!topping) {
                throw new BadRequestException(`Topping không tồn tại hoặc đã ngừng bán: ${code}`);
              }
              return { id: topping.code, name: topping.name, price: topping.price };
            });
            if (!product.customizable && (item.size !== 'S' || chosen.length > 0)) {
              throw new BadRequestException(
                `Sản phẩm ${product.name} không hỗ trợ chọn size hoặc topping`,
              );
            }
            const toppingTotal = chosen.reduce((sum, t) => sum + t.price, 0);
            const unitPrice = money(product.price + sizeSurcharge(item.size) + toppingTotal);
            const lineTotal = money(unitPrice * item.qty);
            subtotal = money(subtotal + lineTotal);
            return {
              productId: item.productId,
              size: item.size,
              toppings: chosen,
              qty: item.qty,
              lineTotal,
            };
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

          const order = await tx.order.create({
            data: {
              // Token JWT (nếu có) luôn thắng userId do client gửi lên.
              userId: authUserId ?? dto.userId ?? null,
              customerName: dto.customerName?.trim() || null,
              customerPhone: dto.customerPhone?.trim() || null,
              address: dto.address?.trim() || null,
              note: dto.note?.trim() || null,
              status: OrderStatus.PENDING,
              total: money(subtotal - discountAmount),
              discountCode,
              discountAmount,
              items: { create: itemData },
            },
            include: { items: { include: { product: true } }, payments: true },
          });
          return { message: 'Tạo đơn hàng thành công (chờ thanh toán)', order };
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
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
          if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
          if (!transitions[order.status].includes(nextStatus)) {
            throw new BadRequestException(
              `Không thể chuyển đơn hàng từ ${order.status} sang ${nextStatus}`,
            );
          }

          const updated = await tx.order.updateMany({
            where: { id, status: order.status, version: order.version },
            data: { status: nextStatus, version: { increment: 1 } },
          });
          if (updated.count !== 1) {
            throw new ConflictException('Trạng thái đơn hàng vừa được cập nhật, vui lòng tải lại');
          }

          if (nextStatus === OrderStatus.CANCELLED) {
            const quantities = new Map<number, number>();
            for (const item of order.items) {
              quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.qty);
            }
            for (const [productId, qty] of quantities) {
              const released = await tx.product.updateMany({
                where: { id: productId },
                data: { stock: { increment: qty }, version: { increment: 1 } },
              });
              if (released.count !== 1) {
                throw new ConflictException('Không thể hoàn lại tồn kho cho đơn hàng');
              }
            }
            if (order.discountCode) {
              await tx.promotion.updateMany({
                where: { code: order.discountCode, usedCount: { gt: 0 } },
                data: { usedCount: { decrement: 1 } },
              });
            }
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Đơn hàng vừa được cập nhật, vui lòng tải lại');
      }
      throw error;
    }
    return this.findOne(id);
  }

  async findAll(userId?: number, ids?: number[]) {
    return this.prisma.order.findMany({
      where: userId ? { userId } : ids ? { id: { in: ids } } : {},
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
