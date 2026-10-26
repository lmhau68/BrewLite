import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderDetailScreen } from "@/components/OrderDetailScreen";
import { OrdersProvider } from "@/components/OrdersProvider";
import { OrdersScreen } from "@/components/OrdersScreen";
import type { CartLine, Order } from "@/lib/types";
import { AuthProvider } from "@/components/AuthProvider";
import { CartProvider, useCart } from "@/components/CartProvider";

vi.mock("@/lib/api", () => ({
  createOrder: vi.fn(),
  payOrder: vi.fn(),
  getOrders: vi.fn(),
  getOrder: vi.fn(),
  clearGuestData: vi.fn(),
}));
import { getOrder, getOrders, payOrder } from "@/lib/api";

const mockedGetOrders = vi.mocked(getOrders);
const mockedGetOrder = vi.mocked(getOrder);
const mockedPayOrder = vi.mocked(payOrder);

function makeOrder(over: Partial<Order> = {}): Order {
  return {
    id: 1,
    status: "PAID",
    total: 29000,
    createdAt: "2026-10-23T02:35:00.000Z",
    customer: { name: "Nguyễn Văn A", phone: "0901234567" },
    items: [
      {
        productId: 1,
        name: "Cà phê sữa đá",
        emoji: "☕",
        size: "M",
        toppings: [{ id: "pearl", name: "Trân châu đen", price: 8000 }],
        qty: 2,
        unitPrice: 43000,
        lineTotal: 86000,
      },
    ],
    ...over,
  };
}

const orderA = makeOrder({ id: 1, total: 86000, createdAt: "2026-10-23T02:35:00.000Z" });
const orderB = makeOrder({ id: 2, status: "PENDING", total: 35000, createdAt: "2026-10-24T09:00:00.000Z" });

/** Giỏ hàng còn sót lại của đơn #2 (2 ly size M + trân châu đen). */
const cartLine: CartLine = {
  key: "1|M|pearl",
  productId: 1,
  name: "Cà phê sữa đá",
  emoji: "☕",
  size: "M",
  toppings: [{ id: "pearl", name: "Trân châu đen", price: 8000 }],
  qty: 2,
  unitPrice: 43000,
  basePrice: 29000,
  customizable: true,
};

/** Hiển thị số lượng trong giỏ để kiểm tra giỏ có được dọn hay không. */
function CartCountProbe() {
  const { count } = useCart();
  return <span data-testid="cart-count">{count}</span>;
}

function renderWithOrders(ui: React.ReactElement) {
  return render(
    <AuthProvider>
      <CartProvider>
        <OrdersProvider>
          <CartCountProbe />
          {ui}
        </OrdersProvider>
      </CartProvider>
    </AuthProvider>,
  );
}

beforeEach(() => {
  mockedGetOrders.mockReset();
  mockedGetOrder.mockReset();
  mockedPayOrder.mockReset();
  // Provider luôn nạp danh sách đơn khi mount
  mockedGetOrders.mockResolvedValue([]);
});

describe("OrdersScreen - danh sách đơn", () => {
  it("hiển thị đơn mới nhất trước, kèm trạng thái và tổng tiền", async () => {
    mockedGetOrders.mockResolvedValue([orderB, orderA]);
    renderWithOrders(<OrdersScreen />);

    const list = await screen.findByRole("list", { name: "Danh sách đơn hàng" });
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Đơn #2");
    expect(items[0]).toHaveTextContent("Chờ thanh toán");
    expect(items[1]).toHaveTextContent("Đơn #1");
    expect(items[1]).toHaveTextContent("Đã thanh toán");
    expect(items[1]).toHaveTextContent("86.000đ");
  });

  it("liên kết tới trang chi tiết đơn", async () => {
    mockedGetOrders.mockResolvedValue([orderA]);
    renderWithOrders(<OrdersScreen />);

    expect(await screen.findByRole("link", { name: /Đơn #1/ })).toHaveAttribute("href", "/orders/1");
  });

  it("hiển thị trạng thái rỗng khi chưa có đơn nào", async () => {
    mockedGetOrders.mockResolvedValue([]);
    renderWithOrders(<OrdersScreen />);

    expect(await screen.findByText("Bạn chưa có đơn hàng nào")).toBeInTheDocument();
  });

  it("báo lỗi và cho thử lại", async () => {
    mockedGetOrders.mockRejectedValueOnce(new Error("Mất kết nối")).mockResolvedValueOnce([orderA]);
    const user = userEvent.setup();
    renderWithOrders(<OrdersScreen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Mất kết nối");
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("link", { name: /Đơn #1/ })).toBeInTheDocument();
  });
});

describe("OrderDetailScreen - chi tiết đơn", () => {
  it("hiển thị món, tổng tiền và thông tin người nhận", async () => {
    mockedGetOrder.mockResolvedValue(orderA);
    renderWithOrders(<OrderDetailScreen id={1} />);

    expect(await screen.findByText("Cà phê sữa đá")).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn A · 0901234567")).toBeInTheDocument();
    expect(screen.getByText("Nhận tại quầy")).toBeInTheDocument();
    // Tổng tiền xuất hiện ở dòng món và ở dòng tổng cộng
    expect(screen.getAllByText("86.000đ")).toHaveLength(2);
  });

  it("báo lỗi khi không tìm thấy đơn", async () => {
    mockedGetOrder.mockRejectedValue(new Error("Không tìm thấy đơn hàng"));
    renderWithOrders(<OrderDetailScreen id={99} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy đơn hàng");
  });

  it("không hiện nút thanh toán với đơn đã thanh toán", async () => {
    mockedGetOrder.mockResolvedValue({ ...orderA, payment: { method: "VI_DIEN_TU", amount: 86000, idempotencyKey: "k1" } });
    renderWithOrders(<OrderDetailScreen id={1} />);

    expect(await screen.findByText("Cà phê sữa đá")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thanh toán/ })).not.toBeInTheDocument();
  });

  it("cho thanh toán lại đơn chờ thanh toán", async () => {
    mockedGetOrder.mockResolvedValue(orderB);
    mockedPayOrder.mockResolvedValue({ success: true, message: "Thanh toán thành công", order: null, loyaltyPointsAwarded: 0 });
    mockedGetOrder.mockResolvedValueOnce(orderB).mockResolvedValue({ ...orderB, status: "PAID" });
    const user = userEvent.setup();
    renderWithOrders(<OrderDetailScreen id={2} />);

    await user.click(await screen.findByRole("button", { name: /Thanh toán 35\.000đ/ }));

    expect(mockedPayOrder).toHaveBeenCalledTimes(1);
    expect(mockedPayOrder.mock.calls[0][0]).toMatchObject({ orderId: 2, amount: 35000 });
    expect(await screen.findByText("Đã thanh toán")).toBeInTheDocument();
  });

  it("xoá món đã thanh toán khỏi giỏ hàng", async () => {
    // Giỏ hàng còn sót lại sau khi tải lại trang ở bước thanh toán
    localStorage.setItem("brewlite.cart.v1", JSON.stringify([cartLine]));
    mockedPayOrder.mockResolvedValue({ success: true, message: "Thanh toán thành công", order: null, loyaltyPointsAwarded: 0 });
    mockedGetOrder.mockResolvedValueOnce(orderB).mockResolvedValue({ ...orderB, status: "PAID" });
    const user = userEvent.setup();
    renderWithOrders(<OrderDetailScreen id={2} />);

    await waitFor(() => expect(screen.getByTestId("cart-count")).toHaveTextContent("2"));

    await user.click(await screen.findByRole("button", { name: /Thanh toán 35\.000đ/ }));

    await waitFor(() => expect(screen.getByTestId("cart-count")).toHaveTextContent("0"));
    expect(await screen.findByText("Đã thanh toán")).toBeInTheDocument();
    // Giỏ đã được ghi xuống localStorage
    expect(JSON.parse(localStorage.getItem("brewlite.cart.v1") ?? "[]")).toEqual([]);
  });

  it("giữ món thêm sau khi đặt đơn khi thanh toán đơn cũ", async () => {
    const extra: CartLine = {
      ...cartLine,
      key: "1|L|",
      size: "L",
      toppings: [],
      qty: 1,
      unitPrice: 39000,
    };
    localStorage.setItem("brewlite.cart.v1", JSON.stringify([cartLine, extra]));
    mockedPayOrder.mockResolvedValue({ success: true, message: "Thanh toán thành công", order: null, loyaltyPointsAwarded: 0 });
    mockedGetOrder.mockResolvedValueOnce(orderB).mockResolvedValue({ ...orderB, status: "PAID" });
    const user = userEvent.setup();
    renderWithOrders(<OrderDetailScreen id={2} />);

    await waitFor(() => expect(screen.getByTestId("cart-count")).toHaveTextContent("3"));

    await user.click(await screen.findByRole("button", { name: /Thanh toán 35\.000đ/ }));

    // Chỉ 2 ly của đơn #2 bị gỡ, ly size L thêm sau đó vẫn còn
    await waitFor(() => expect(screen.getByTestId("cart-count")).toHaveTextContent("1"));
  });

  it("không đụng vào giỏ hàng khi thanh toán thất bại", async () => {
    localStorage.setItem("brewlite.cart.v1", JSON.stringify([cartLine]));
    mockedPayOrder.mockResolvedValue({
      success: false,
      message: "Thẻ bị từ chối",
      order: null,
      loyaltyPointsAwarded: 0,
      orderStatus: "PAYMENT_FAILED",
    });
    mockedGetOrder.mockResolvedValue(orderB);
    const user = userEvent.setup();
    renderWithOrders(<OrderDetailScreen id={2} />);

    await waitFor(() => expect(screen.getByTestId("cart-count")).toHaveTextContent("2"));

    await user.click(await screen.findByRole("button", { name: /Thanh toán 35\.000đ/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Thẻ bị từ chối");
    expect(screen.getByTestId("cart-count")).toHaveTextContent("2");
  });
});