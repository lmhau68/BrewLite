import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountButton } from "@/components/AccountButton";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthScreen } from "@/components/AuthScreen";
import { AUTH_STORAGE_KEY, getToken, userFromToken } from "@/lib/auth";
import { CartProvider } from "@/components/CartProvider";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

function setup(mode: "login" | "register" = "login") {
  render(
    <AuthProvider>
      <CartProvider>
        <AuthScreen mode={mode} />
      </CartProvider>
    </AuthProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", ""); // dùng tài khoản giả cục bộ
  replace.mockReset();
});

describe("Đăng ký", () => {
  it("báo lỗi từng ô khi nhập sai, không gọi đăng ký", async () => {
    const user = setup("register");
    await user.type(screen.getByLabelText("Email"), "sai-email");
    await user.type(screen.getByLabelText("Mật khẩu"), "123");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "456");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    expect(screen.getByText("Email không hợp lệ")).toBeInTheDocument();
    expect(screen.getByText(/ít nhất 6 ký tự/, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Mật khẩu nhập lại không khớp")).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it("đăng ký thành công -> tự đăng nhập, lưu token, chuyển về menu", async () => {
    const user = setup("register");
    await user.type(screen.getByLabelText("Email"), "moi@brewlite.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "matkhau1");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "matkhau1");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(userFromToken(localStorage.getItem(AUTH_STORAGE_KEY))).toMatchObject({ email: "moi@brewlite.vn" });
  });
});

describe("Đăng nhập", () => {
  it("sai tài khoản -> hiện lỗi từ máy chủ và không lưu token", async () => {
    const user = setup("login");
    await user.type(screen.getByLabelText("Email"), "khong@co.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "abcdef");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email hoặc mật khẩu không chính xác");
    expect(getToken()).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("ô trống -> báo lỗi bắt buộc", async () => {
    const user = setup("login");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByText("Vui lòng nhập email")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập mật khẩu")).toBeInTheDocument();
  });

  it("nút Hiện/Ẩn đổi kiểu ô mật khẩu", async () => {
    const user = setup("login");
    const input = screen.getByLabelText("Mật khẩu");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("đăng ký xong rồi đăng nhập lại, sau đó đăng xuất xoá token", async () => {
    const reg = setup("register");
    await reg.type(screen.getByLabelText("Email"), "a@b.vn");
    await reg.type(screen.getByLabelText("Mật khẩu"), "123456");
    await reg.type(screen.getByLabelText("Nhập lại mật khẩu"), "123456");
    await reg.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await waitFor(() => expect(getToken()).not.toBeNull());

    // Đã đăng nhập: màn hình hiện trạng thái
    expect(await screen.findByText("Bạn đang đăng nhập")).toBeInTheDocument();
    await reg.click(screen.getByRole("button", { name: "Đăng xuất" }));
    await waitFor(() => expect(getToken()).toBeNull());
    expect(screen.getByRole("button", { name: "Tạo tài khoản" })).toBeInTheDocument();
  });
});
