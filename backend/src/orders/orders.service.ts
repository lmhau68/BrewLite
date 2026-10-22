import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một sản phẩm');
    }

    // 1. Kiểm tra các sản phẩm có tồn tại trong CSDL hay không
    const productIds = dto.items.map((i) => i.productId);
    const existingProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map<number, (typeof existingProducts)[0]>();
    for (const prod of existingProducts) {
      productMap.set(prod.id, prod);
    }

    // 2. Tính lineTotal cho từng item và tổng tiền total của đơn hàng
    let total = 0;
    const orderItemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${item.productId}`);
      }

      let unitPrice = item.price ?? product.price;
      if (!item.price) {
        if (item.size === 'M') unitPrice += 5000;
        else if (item.size === 'L') unitPrice += 10000;
      }

      const lineTotal = unitPrice * item.qty;
      total += lineTotal;

      return {
        productId: item.productId,
        size: item.size,
        qty: item.qty,
        lineTotal,
      };
    });

    // 3. Tạo Order với trạng thái PENDING cùng danh sách OrderItem liên kết
    const order = await this.prisma.order.create({
      data: {
        userId: dto.userId ?? null,
        status: OrderStatus.PENDING,
        total,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    return {
      message: 'Tạo đơn hàng thành công (chờ thanh toán)',
      order,
    };
  }

  async findAll(userId?: number) {
    return this.prisma.order.findMany({
      where: userId ? { userId } : {},
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);
    }

    return order;
  }
}

