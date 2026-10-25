import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, StrictMode, useState, type ReactNode } from "react";
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
    await user.click(screen.getByRole("button", { name: "Điền thẻ demo" }));
    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    expect(mockedPayOrder.mock.calls[0][0]).toMatchObject({ method: "THE_NGAN_HANG" });
  });

  it("hiển thị điểm tích lũy do API trả về ở màn Đặt đơn xong", async () => {
    seedCart();
    mockedPayOrder.mockResolvedValueOnce({
      success: true,
      message: "Thanh toán thành công",
      order: null,
      loyaltyPointsAwarded: 3,
    });
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    expect(await screen.findByText("Bạn được tích lũy 3 điểm")).toBeInTheDocument();
  });

  it("xoay khoá idempotency khi thanh toán thất bại để lần thử sau không bị kẹt", async () => {
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
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    const firstKey = mockedPayOrder.mock.calls[0][0].idempotencyKey;
    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    await waitFor(() => expect(mockedPayOrder).toHaveBeenCalledTimes(2));
    expect(mockedPayOrder.mock.calls[1][0].idempotencyKey).not.toBe(firstKey);
  });

  it("giữ món trong giỏ khi thanh toán thất bại", async () => {
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

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")).toHaveLength(1);
  });

  it("có ô nhập số thẻ ảo khi chọn thẻ ngân hàng", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    expect(screen.queryByLabelText(/Số thẻ/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Thẻ ngân hàng/ }));

    expect(screen.getByLabelText(/Số thẻ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tên chủ thẻ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hạn thẻ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/CVV/)).toBeInTheDocument();
  });

  it("không thanh toán được khi chọn thẻ ngân hàng mà chưa nhập thông tin thẻ", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("radio", { name: /Thẻ ngân hàng/ }));
    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    expect(await screen.findByText("Vui lòng nhập số thẻ.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập tên chủ thẻ.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập hạn thẻ.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập CVV.")).toBeInTheDocument();
    expect(
      screen.getByText("Vui lòng nhập đầy đủ và đúng định dạng thông tin thẻ ngân hàng."),
    ).toBeInTheDocument();
    // Chưa gọi API thanh toán, đơn vẫn đang chờ.
    expect(mockedPayOrder).not.toHaveBeenCalled();
  });

  it("báo lỗi khi số thẻ sai định dạng hoặc thẻ đã hết hạn", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("radio", { name: /Thẻ ngân hàng/ }));
    await user.type(screen.getByLabelText(/Số thẻ/), "4242424242424243");
    await user.type(screen.getByLabelText(/Tên chủ thẻ/), "NGUYEN VAN A");
    await user.type(screen.getByLabelText(/Hạn thẻ/), "0120");
    await user.type(screen.getByLabelText(/CVV/), "12");
    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    expect(await screen.findByText("Số thẻ không hợp lệ, hãy kiểm tra lại.")).toBeInTheDocument();
    expect(screen.getByText("Thẻ đã hết hạn.")).toBeInTheDocument();
    expect(screen.getByText("CVV phải gồm 3-4 chữ số.")).toBeInTheDocument();
    expect(mockedPayOrder).not.toHaveBeenCalled();
  });

  it("thanh toán được khi đã nhập đủ thông tin thẻ hợp lệ", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("radio", { name: /Thẻ ngân hàng/ }));
    // Bấm thanh toán khi thiếu thông tin thẻ: báo lỗi và không gọi API.
    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));
    expect(await screen.findByText("Vui lòng nhập số thẻ.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Số thẻ/), "4242424242424242");
    await user.type(screen.getByLabelText(/Tên chủ thẻ/), "NGUYEN VAN A");
    await user.type(screen.getByLabelText(/Hạn thẻ/), "1228");
    await user.type(screen.getByLabelText(/CVV/), "123");

    // Sửa xong thì thông báo tổng biến mất.
    expect(
      screen.queryByText("Vui lòng nhập đầy đủ và đúng định dạng thông tin thẻ ngân hàng."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Thanh toán 29\.000đ/ }));

    await waitFor(() => expect(mockedPayOrder).toHaveBeenCalledTimes(1));
    expect(mockedPayOrder.mock.calls[0][0]).toMatchObject({ method: "THE_NGAN_HANG" });
    expect(await screen.findByText(/Đơn #1 đã được xác nhận/)).toBeInTheDocument();
  });

  it("nút Điền thẻ demo điền sẵn thông tin thẻ hợp lệ", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await goToPayment(user);

    await user.click(screen.getByRole("radio", { name: /Thẻ ngân hàng/ }));
    expect(screen.getByLabelText(/Số thẻ/)).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Điền thẻ demo" }));

    expect(screen.getByLabelText(/Số thẻ/)).toHaveValue("4242 4242 4242 4242");
    expect(screen.getByLabelText(/Tên chủ thẻ/)).toHaveValue("NGUYEN VAN A");
    expect(screen.getByLabelText(/Hạn thẻ/)).toHaveValue("12/28");
    expect(screen.getByLabelText(/CVV/)).toHaveValue("123");
  });

  it("gửi mã khuyến mãi lên API khi người dùng nhập", async () => {
    seedCart();
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await user.type(screen.getByLabelText(/Mã khuyến mãi/), "WELCOME10");
    await user.click(screen.getByRole("button", { name: "Tiếp tục thanh toán" }));

    await waitFor(() => expect(mockedCreateOrder).toHaveBeenCalled());
    expect(mockedCreateOrder.mock.calls[0][0]).toMatchObject({ promotionCode: "WELCOME10" });
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

/**
 * Next.js 16 (cacheComponents) giữ state của page khi điều hướng: page cũ được
 * ẩn bằng React <Activity> thay vì unmount, nên state của client component vẫn còn
 * nguyên khi quay lại trang. Harness này mô phỏng đúng cơ chế đó.
 */
function PageWithActivity({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setVisible((v) => !v)}>
        Rời trang
      </button>
      <Activity mode={visible ? "visible" : "hidden"}>{children}</Activity>
    </>
  );
}

describe("CheckoutScreen - đặt đơn lần thứ hai", () => {
  it("bắt đầu lại từ bước nhập thông tin khi quay lại trang checkout", async () => {
    seedCart();
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <CartProvider>
          <OrdersProvider>
            <PageWithActivity>
              <CheckoutScreen />
            </PageWithActivity>
          </OrdersProvider>
        </CartProvider>
      </AuthProvider>,
    );

    await screen.findByText("Cà phê sữa đá");
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await user.click(screen.getByRole("button", { name: "Tiếp tục thanh toán" }));
    await screen.findByRole("button", { name: /Thanh toán 29\.000đ/ });

    // Rời trang (page bị ẩn bằng <Activity>) rồi quay lại lần nữa.
    await user.click(screen.getByRole("button", { name: "Rời trang" }));
    await user.click(screen.getByRole("button", { name: "Rời trang" }));

    // Phải quay lại bước 1, không phải màn thanh toán/đặt đơn xong của lần trước.
    expect(screen.getByRole("button", { name: "Tiếp tục thanh toán" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Thanh toán 29\.000đ/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/đã được xác nhận/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Họ và tên/)).toHaveValue("");
  });

  it("không còn màn 'đặt đơn xong' của đơn cũ khi quay lại checkout", async () => {
    seedCart();
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <CartProvider>
          <OrdersProvider>
            <PageWithActivity>
              <CheckoutScreen />
            </PageWithActivity>
          </OrdersProvider>
        </CartProvider>
      </AuthProvider>,
    );

    await screen.findByText("Cà phê sữa đá");
    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0901234567");
    await user.click(screen.getByRole("button", { name: "Tiếp tục thanh toán" }));
    await user.click(await screen.findByRole("button", { name: /Thanh toán 29\.000đ/ }));
    expect(await screen.findByText(/Đơn #1 đã được xác nhận/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rời trang" }));
    await user.click(screen.getByRole("button", { name: "Rời trang" }));

    // Màn "đặt đơn xong" của đơn cũ phải biến mất, tiêu đề quay lại bước xác nhận.
    expect(screen.queryByText(/Đơn #1 đã được xác nhận/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Xác nhận đơn" })).toBeInTheDocument();
    // Giỏ đã bị xoá lúc thanh toán nên màn checkout báo giỏ trống, cho đi chọn món mới.
    expect(screen.getByText("Giỏ hàng đang trống")).toBeInTheDocument();
  });
});