import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CartProvider } from "@/components/CartProvider";
import { CartSheet } from "@/components/CartSheet";
import type { CartLine } from "@/lib/types";

const coffee: CartLine = {
  key: "1|S|",
  productId: 1,
  name: "Cà phê sữa đá",
  emoji: "☕",
  size: "S",
  toppings: [],
  qty: 1,
  unitPrice: 29000,
  basePrice: 29000,
  customizable: true,
};

const water: CartLine = {
  key: "14|S|",
  productId: 14,
  name: "Nước suối",
  emoji: "💧",
  size: "S",
  toppings: [],
  qty: 1,
  unitPrice: 12000,
  basePrice: 12000,
  customizable: false,
};

/** Nạp sẵn giỏ hàng vào localStorage rồi mở sheet giỏ hàng. */
function setup(lines: CartLine[] = [coffee]) {
  localStorage.setItem("brewlite.cart.v1", JSON.stringify(lines));
  render(
    <CartProvider>
      <CartSheet onClose={() => {}} />
    </CartProvider>,
  );
  return userEvent.setup();
}

describe("CartSheet - sửa size/topping", () => {
  it("mở được màn hình sửa và đổi size", async () => {
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.click(screen.getByRole("button", { name: "Sửa Cà phê sữa đá" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Sửa Cà phê sữa đá")).toBeInTheDocument();

    await user.click(within(dialog).getByLabelText(/L · Lớn/));
    await user.click(within(dialog).getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(screen.getByText("Size L")).toBeInTheDocument());
    // Giá hiển thị ở dòng giỏ và ở tổng "Tạm tính" đều là 39.000đ
    expect(screen.getAllByText("39.000đ").length).toBeGreaterThan(0);
  });

  it("đổi topping thì cập nhật giá hiển thị", async () => {
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.click(screen.getByRole("button", { name: "Sửa Cà phê sữa đá" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/Trân châu đen/));
    await user.click(within(dialog).getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(screen.getByText(/Trân châu đen/)).toBeInTheDocument());
    expect(screen.getAllByText("37.000đ").length).toBeGreaterThan(0);
  });

  it("huỷ thì giữ nguyên dòng cũ", async () => {
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.click(screen.getByRole("button", { name: "Sửa Cà phê sữa đá" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/L · Lớn/));
    await user.click(within(dialog).getByRole("button", { name: "Huỷ" }));

    await waitFor(() => expect(screen.getByText("Size S")).toBeInTheDocument());
    expect(screen.queryByText("Sửa Cà phê sữa đá")).not.toBeInTheDocument();
  });

  it("món không có tuỳ chọn thì không hiện nút sửa", async () => {
    setup([water]);
    await screen.findByText("Nước suối");
    expect(screen.queryByRole("button", { name: "Sửa Nước suối" })).not.toBeInTheDocument();
  });

  it("sửa xong thì giỏ hàng vẫn lưu xuống localStorage", async () => {
    const user = setup();
    await screen.findByText("Cà phê sữa đá");

    await user.click(screen.getByRole("button", { name: "Sửa Cà phê sữa đá" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByLabelText(/M · Vừa/));
    await user.click(within(dialog).getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("brewlite.cart.v1") ?? "[]") as CartLine[];
      expect(saved[0].size).toBe("M");
      expect(saved[0].unitPrice).toBe(35000);
    });
  });
});
