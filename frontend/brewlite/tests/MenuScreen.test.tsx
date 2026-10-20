import { cleanup as cleanupRender, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "@/components/CartProvider";
import { MenuScreen } from "@/components/MenuScreen";
import { MOCK_PRODUCTS } from "@/lib/mock-data";

vi.mock("@/lib/api", () => ({ getProducts: vi.fn() }));
import { getProducts } from "@/lib/api";

const mockedGet = vi.mocked(getProducts);

function setup() {
  render(
    <CartProvider>
      <MenuScreen />
    </CartProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  mockedGet.mockReset();
});

describe("MenuScreen - trạng thái", () => {
  it("hiển thị loading rồi danh sách món", async () => {
    mockedGet.mockResolvedValue(MOCK_PRODUCTS);
    setup();
    expect(screen.getByLabelText("Đang tải menu")).toBeInTheDocument();
    expect(await screen.findByText("Cà phê sữa đá")).toBeInTheDocument();
    expect(screen.queryByLabelText("Đang tải menu")).not.toBeInTheDocument();
  });

  it("hiển thị lỗi và cho phép thử lại", async () => {
    mockedGet.mockRejectedValueOnce(new Error("Mất kết nối"));
    mockedGet.mockResolvedValueOnce(MOCK_PRODUCTS);
    const user = setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Mất kết nối");
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Cà phê sữa đá")).toBeInTheDocument();
  });

  it("hiển thị trạng thái rỗng khi API trả về danh sách trống", async () => {
    mockedGet.mockResolvedValue([]);
    setup();
    expect(await screen.findByText("Chưa có món nào trong menu")).toBeInTheDocument();
  });
});

describe("MenuScreen - lọc & tìm kiếm", () => {
  it("lọc theo danh mục", async () => {
    mockedGet.mockResolvedValue(MOCK_PRODUCTS);
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await user.click(screen.getByRole("button", { name: "Trà sữa" }));
    expect(screen.getByText("Trà sữa matcha")).toBeInTheDocument();
    expect(screen.queryByText("Cà phê sữa đá")).not.toBeInTheDocument();
  });

  it("tìm không dấu và báo rỗng khi không khớp", async () => {
    mockedGet.mockResolvedValue(MOCK_PRODUCTS);
    const user = setup();
    await screen.findByText("Cà phê sữa đá");
    await user.type(screen.getByRole("searchbox"), "tra dao");
    expect(screen.getByText("Trà đào cam sả")).toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "xyz123");
    expect(screen.getByText(/Không tìm thấy/)).toBeInTheDocument();
  });

  it("món hết hàng không thể chọn", async () => {
    mockedGet.mockResolvedValue(MOCK_PRODUCTS);
    setup();
    await screen.findByText("Cà phê sữa đá");
    expect(screen.getByRole("button", { name: "Latte caramel - hết hàng" })).toBeDisabled();
  });
});

describe("MenuScreen - luồng chọn món vào giỏ", () => {
  it("chọn size + topping, thêm vào giỏ và tính tiền đúng", async () => {
    mockedGet.mockResolvedValue(MOCK_PRODUCTS);
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Chọn Cà phê sữa đá" }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/M · Vừa/));
    await user.click(within(dialog).getByLabelText(/Trân châu đen/));
    await user.click(within(dialog).getByRole("button", { name: "Tăng số lượng" }));
    // (29.000 + 6.000 + 8.000) × 2 = 86.000
    await user.click(within(dialog).getByRole("button", { name: /Thêm vào giỏ · 86\.000đ/ }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("cart-badge")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: /Xem giỏ hàng/ }));
    const cart = screen.getByRole("dialog");
    expect(within(cart).getByText("Cà phê sữa đá")).toBeInTheDocument();
    expect(within(cart).getAllByText("86.000đ").length).toBeGreaterThan(0);

    await user.click(within(cart).getByRole("button", { name: "Xoá Cà phê sữa đá" }));
    expect(within(cart).getByText("Giỏ hàng đang trống")).toBeInTheDocument();
  });
});

describe("Giỏ hàng - lưu trữ", () => {
  it("khôi phục giỏ hàng từ localStorage khi tải lại", async () => {
    mockedGet.mockResolvedValue(MOCK_PRODUCTS);
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Chọn Bạc xỉu" }));
    await user.click(screen.getByRole("button", { name: /Thêm vào giỏ/ }));
    await waitFor(() => expect(localStorage.getItem("brewlite.cart.v1")).toContain("Bạc xỉu"));

    cleanupRender();
    setup();
    expect(await screen.findByTestId("cart-badge")).toHaveTextContent("1");
  });
});
