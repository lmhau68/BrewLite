import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async processPayment(dto: CreatePaymentDto) {
    // 1. Kiểm tra Idempotency Key (chống gửi trùng lặp)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: { order: true },
    });

    if (existingPayment) {
      return {
        isIdempotent: true,
        message: 'Yêu cầu thanh toán đã được xử lý trước đó (Idempotent)',
        payment: existingPayment,
        orderStatus: existingPayment.order.status,
      };
    }

    // 2. Kiểm tra Đơn hàng
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${dto.orderId}`);
    }

    if (order.status === OrderStatus.PAID || order.payment) {
      throw new BadRequestException('Đơn hàng này đã được thanh toán thành công trước đó');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_FAILED) {
      throw new BadRequestException(
        `Không thể thanh toán cho đơn hàng đang ở trạng thái: ${order.status}`,
      );
    }

    if (Math.abs(order.total - dto.amount) > 0.01) {
      throw new BadRequestException(
        `Số tiền thanh toán (${dto.amount}) không khớp với tổng đơn hàng (${order.total})`,
      );
    }

    // 3. Giả lập cổng thanh toán
    const isMockSuccess = dto.mockSuccess ?? true;

    if (!isMockSuccess) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAYMENT_FAILED },
      });

      return {
        success: false,
        message: 'Thanh toán giả lập thất bại (thẻ bị từ chối hoặc số dư không đủ)',
        orderStatus: OrderStatus.PAYMENT_FAILED,
      };
    }

    // 4. Thanh toán thành công
    const [payment, updatedOrder] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          orderId: order.id,
          idempotencyKey: dto.idempotencyKey,
          amount: dto.amount,
          method: dto.method,
        },
      }),
      this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PAID },
      }),
    ]);

    return {
      success: true,
      message: 'Thanh toán đơn hàng thành công qua cổng giả lập',
      payment,
      orderStatus: updatedOrder.status,
    };
  }

  async findByOrderId(orderId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy thông tin thanh toán cho đơn hàng ${orderId}`);
    }

    return payment;
  }
}

