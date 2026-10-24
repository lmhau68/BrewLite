import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthScreen } from "@/components/AuthScreen";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({ login: vi.fn(), register: vi.fn() }));
import { login, register } from "@/lib/api";

const mockedLogin = vi.mocked(login);
const mockedRegister = vi.mocked(register);

const session = { accessToken: "h.e30.s", userId: 7, email: "a@b.vn" };

function setup(mode: "login" | "register") {
  render(
    <AuthProvider>
      <AuthScreen mode={mode} />
    </AuthProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  push.mockReset();
  mockedLogin.mockReset();
  mockedRegister.mockReset();
});

describe("AuthScreen - đăng nhập", () => {
  it("báo lỗi khi bỏ trống / email sai và không gọi API", async () => {
    const user = setup("login");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByText("Vui lòng nhập email.")).toBeInTheDocument();
    expect(screen.getByText("Vui lòng nhập mật khẩu.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Email"), "khong-hop-le");
    await user.type(screen.getByLabelText("Mật khẩu"), "123456");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByText("Email không hợp lệ.")).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("đăng nhập thành công: lưu token vào localStorage rồi về menu", async () => {
    mockedLogin.mockResolvedValue(session);
    const user = setup("login");
    await user.type(screen.getByLabelText("Email"), "a@b.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret1");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(mockedLogin).toHaveBeenCalledWith("a@b.vn", "secret1");
    expect(JSON.parse(localStorage.getItem("brewlite.auth.v1")!)).toEqual(session);
  });

  it("hiển thị lỗi từ API và không chuyển trang", async () => {
    mockedLogin.mockRejectedValue(new Error("Email hoặc mật khẩu không chính xác"));
    const user = setup("login");
    await user.type(screen.getByLabelText("Email"), "a@b.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "sai");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email hoặc mật khẩu không chính xác");
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem("brewlite.auth.v1")).toBeNull();
  });
});

describe("AuthScreen - xoá form khi phiên đổi", () => {
  it("sau khi đăng nhập thành công, form được xoá (trang vẫn được Next giữ trong bộ nhớ)", async () => {
    mockedLogin.mockResolvedValue(session);
    const user = setup("login");
    await user.type(screen.getByLabelText("Email"), "a@b.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret1");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Mật khẩu")).toHaveValue("");
  });

  it("khi đăng xuất (phiên về null) form cũng được xoá", async () => {
    mockedLogin.mockResolvedValue(session);
    const { useAuth } = await import("@/components/AuthProvider");
    function Logout() {
      return <button onClick={useAuth().logout}>logout</button>;
    }
    render(
      <AuthProvider>
        <AuthScreen mode="login" />
        <Logout />
      </AuthProvider>,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "a@b.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret1");
    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
    await waitFor(() => expect(push).toHaveBeenCalled());

    await user.type(screen.getByLabelText("Email"), "lan@x.vn");
    await user.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveValue(""));
  });
});

describe("AuthScreen - đăng ký", () => {
  it("kiểm tra độ dài mật khẩu và nhập lại mật khẩu", async () => {
    const user = setup("register");
    await user.type(screen.getByLabelText("Email"), "a@b.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "123");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "456");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(screen.getByText("Mật khẩu phải có ít nhất 6 ký tự.")).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Mật khẩu"));
    await user.type(screen.getByLabelText("Mật khẩu"), "secret1");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    expect(screen.getByText("Mật khẩu nhập lại chưa khớp.")).toBeInTheDocument();
  });

  it("đăng ký thành công thì đăng nhập luôn và về menu", async () => {
    mockedRegister.mockResolvedValue(session);
    const user = setup("register");
    await user.type(screen.getByLabelText("Email"), "a@b.vn");
    await user.type(screen.getByLabelText("Mật khẩu"), "secret1");
    await user.type(screen.getByLabelText("Nhập lại mật khẩu"), "secret1");
    await user.click(screen.getByRole("button", { name: "Tạo tài khoản" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(localStorage.getItem("brewlite.auth.v1")).toContain("a@b.vn");
  });
});
