import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "@/components/CartProvider";
import { CheckoutScreen } from "@/components/CheckoutScreen";
import { OrdersProvider } from "@/components/OrdersProvider";
import type { CartLine, Order } from "@/lib/types";
import { AuthProvider } from "@/components/AuthProvider";

vi.mock("@/lib/api", () => ({
  createOrder: vi.fn(),
  payOrder: vi.fn(),
  getOrders: vi.fn(),
  getOrder: vi.fn(),
}));
import { createOrder, getOrder, getOrders, payOrder } from "@/lib/api";

const mockedCreateOrder = vi.mocked(createOrder);
const mockedPayOrder = vi.mocked(payOrder);
const mockedGetOrder = vi.mocked(getOrder);
const mockedGetOrders = vi.mocked(getOrders);

const CART_KEY = "brewlite.cart.v1";

const cartLine: CartLine = {
  key: "1|S|",
  productId: 1,
  name: "Cà phê sữa đá",
  emoji: "☕",
  size: "S",
  toppings: [],
  qty: 1,
  unitPrice: 29000,
};

const pendingOrder: Order = {
  id: 1,
  status: "PENDING",
  total: 29000,
  createdAt: "2026-10-23T02:35:00.000Z",
  customer: { name: "Nguyễn Văn A", phone: "0901234567" },
  items: [
    {
      productId: 1,
      name: "Cà phê sữa đá",
      emoji: "☕",
      size: "S",
      toppings: [],
      qty: 1,
      unitPrice: 29000,
      lineTotal: 29000,
    },
  ],
  payment: null,
};

const paidOrder: Order = {
  ...pendingOrder,
  status: "PAID",
  payment: { method: "VI_DIEN_TU", amount: 29000, idempotencyKey: "ord1_key" },
};

function setup() {
  render(
    <AuthProvider>
      <CartProvider>
        <OrdersProvider>
          <CheckoutScreen />
        </OrdersProvider>
      </CartProvider>
    </AuthProvider>,
  );
  return userEvent.setup();
}

/** Nạp sẵn giỏ hàng vào localStorage để màn checkout mở ra đã có món. */
function seedCart() {
  localStorage.setItem(CART_KEY, JSON.stringify([cartLine]));
}

beforeEach(() => {
  mockedCreateOrder.mockReset();
  mockedPayOrder.mockReset();
  mockedGetOrder.mockReset();
  mockedGetOrders.mockReset();
  mockedGetOrders.mockResolvedValue([]);
  mockedCreateOrder.mockResolvedValue(pendingOrder);
  mockedPayOrder.mockResolvedValue({ success: true, message: "Thanh toán thành công", order: null, loyaltyPointsAwarded: 0 });
  mockedGetOrder.mockResolvedValue(paidOrder);
});

describe("CheckoutScreen - xác nhận đơn", () => {
  it("hiển thị tóm tắt giỏ hàng và tổng tiền", async () => {
    seedCart();
    setup();
    expect(await screen.findByText("Cà phê sữa đá")).toBeInTheDocument();
    expect(screen.getAllByText("29.000đ").length).toBeGreaterThan(0);
  });

  it("báo lỗi khi thiếu thông tin người nhận", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.click(screen.getByRole("button", { name: "Tiếp tục thanh toán" }));

    expect(await screen.findByText("Vui lòng nhập tên người nhận.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập số điện thoại.")).toBeInTheDocument();
    expect(mockedCreateOrder).not.toHaveBeenCalled();
  });

  it("tạo đơn rồi chuyển sang bước thanh toán", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await user.click(screen.getByRole("button", { name: "Tiếp tục thanh toán" }));

    expect(await screen.findByRole("button", { name: /Thanh toán 29\.000đ/ })).toBeInTheDocument();
    expect(mockedCreateOrder).toHaveBeenCalledTimes(1);
    expect(mockedCreateOrder.mock.calls[0][0]).toMatchObject({
      customerName: "Nguyễn Văn A",
      customerPhone: "0901234567",
      items: [{ productId: 1, size: "S", qty: 1, toppings: [] }],
    });
  });

  it("báo lỗi khi tạo đơn thất bại", async () => {
    seedCart();
    mockedCreateOrder.mockRejectedValueOnce(new Error("Sản phẩm không đủ tồn kho"));
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await user.click(screen.getByRole("button", { name: "Tiếp tục thanh toán" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm không đủ tồn kho");
  });
});

describe("CheckoutScreen - thanh toán", () => {
  async function goToPayment(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await user.click(screen.getByRole("button", { name: "Tiếp tục thanh toán" }));
    await screen.findByRole("button", { name: /Thanh toán 29\.000đ/ });
  }

  it("thanh toán thành công thì xác nhận đơn và xoá giỏ hàng", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    expect(await screen.findByText(/Đơn #1 đã được xác nhận/)).toBeInTheDocument();
    expect(mockedPayOrder).toHaveBeenCalledTimes(1);
    expect(mockedPayOrder.mock.calls[0][0]).toMatchObject({
      orderId: 1,
      amount: 29000,
      method: "VI_DIEN_TU",
    });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")).toEqual([]));
  });

  it("hiển thị lỗi khi cổng thanh toán từ chối", async () => {
    seedCart();
    mockedPayOrder.mockResolvedValueOnce({
      success: false,
      message: "Thanh toán giả lập thất bại",
      order: null,
      loyaltyPointsAwarded: 0, 
    });
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Thanh toán giả lập thất bại");
    expect(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ })).toBeInTheDocument();
  });

  it("cho chọn cách thanh toán khác", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("radio", { name: /Thẻ ngân hàng/ }));
    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    expect(mockedPayOrder.mock.calls[0][0]).toMatchObject({ method: "THE_NGAN_HANG" });
  });
});

describe("CheckoutScreen - giỏ hàng trống", () => {
  it("hiện thông báo và link về menu", async () => {
    setup();
    expect(await screen.findByText("Giỏ hàng đang trống")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem menu" })).toHaveAttribute("href", "/");
  });
});

describe("CartProvider - Strict Mode", () => {
  it("không ghi đè giỏ hàng đã lưu khi effect chạy hai lần", async () => {
    seedCart();
    render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <OrdersProvider>
          <CheckoutScreen />
        </OrdersProvider>
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
);

    expect(await screen.findByText("Cà phê sữa đá")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")).toHaveLength(1);
  });
});