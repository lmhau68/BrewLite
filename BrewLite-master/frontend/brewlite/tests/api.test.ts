import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** api.ts đọc NEXT_PUBLIC_API_URL lúc import -> nạp lại module cho mỗi test. */
async function loadApi() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  return import("@/lib/api");
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("normalizeProduct", () => {
  it("điền mặc định an toàn khi API thiếu trường (customizable=true, description rỗng)", async () => {
    const { normalizeProduct } = await loadApi();
    const p = normalizeProduct({ id: 1, name: "A", price: 10000, stock: 3 });
    expect(p).toMatchObject({ customizable: true, description: "", category: "coffee", emoji: "🧋", stock: 3 });
  });

  it("giữ customizable=false và loại category lạ", async () => {
    const { normalizeProduct } = await loadApi();
    const p = normalizeProduct({ id: 2, name: "Nước", price: 1, stock: 1, customizable: false, category: "xyz" as never });
    expect(p.customizable).toBe(false);
    expect(p.category).toBe("coffee");
  });
});

describe("getOptions", () => {
  it("đọc size/topping từ GET /options", async () => {
    const { getOptions } = await loadApi();
    fetchMock.mockReturnValueOnce(
      json({ sizes: [{ id: "S", label: "Nhỏ", extra: 0 }], toppings: [{ id: "pearl", name: "Trân châu", price: 8000 }] }),
    );
    const opts = await getOptions();
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/options");
    expect(opts.toppings[0].name).toBe("Trân châu");
  });

  it("lỗi mạng -> dùng bảng dự phòng, không ném lỗi", async () => {
    const { getOptions } = await loadApi();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const opts = await getOptions();
    expect(opts.sizes.map((s) => s.id)).toEqual(["S", "M", "L"]);
  });
});

describe("login / register", () => {
  const token = `h.${btoa(JSON.stringify({ sub: 7, email: "a@b.vn", exp: 4102444800 }))}.s`;

  it("login: gọi /auth/login và trả phiên với userId lấy từ token", async () => {
    const { login } = await loadApi();
    fetchMock.mockReturnValueOnce(json({ message: "ok", accessToken: token }));
    const session = await login(" a@b.vn ", "secret1");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/login");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "a@b.vn", password: "secret1" });
    expect(session).toEqual({ accessToken: token, userId: 7, email: "a@b.vn" });
  });

  it("login sai mật khẩu: hiển thị message của API", async () => {
    const { login } = await loadApi();
    fetchMock.mockReturnValueOnce(json({ message: "Email hoặc mật khẩu không chính xác" }, 401));
    await expect(login("a@b.vn", "x")).rejects.toThrow("Email hoặc mật khẩu không chính xác");
  });

  it("register: tạo tài khoản rồi tự đăng nhập", async () => {
    const { register } = await loadApi();
    fetchMock.mockReturnValueOnce(json({ message: "Đăng ký thành công", userId: 7, email: "a@b.vn" }, 201));
    fetchMock.mockReturnValueOnce(json({ accessToken: token }));
    const session = await register("a@b.vn", "secret1");
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(["http://api.test/auth/register", "http://api.test/auth/login"]);
    expect(session.userId).toBe(7);
  });

  it("register: email đã tồn tại -> báo lỗi từ API", async () => {
    const { register } = await loadApi();
    fetchMock.mockReturnValueOnce(json({ message: "Email này đã được sử dụng!" }, 400));
    await expect(register("a@b.vn", "secret1")).rejects.toThrow("Email này đã được sử dụng!");
  });
});

describe("đơn hàng với API thật", () => {
  const apiOrder = {
    id: 5,
    status: "PAID",
    total: 42000,
    createdAt: "2026-10-24T05:00:00.000Z",
    customerName: "An",
    customerPhone: "0901234567",
    address: null,
    note: null,
    items: [
      {
        id: 1,
        productId: 1,
        size: "M",
        qty: 1,
        lineTotal: 42000,
        toppings: [{ id: "pearl", name: "Trân châu đen", price: 8000 }],
        product: { id: 1, name: "Cà phê sữa đá", emoji: "☕" },
      },
    ],
    payments: [
      { method: "THE_NGAN_HANG", amount: 42000, idempotencyKey: "k0", status: "FAILED", createdAt: "2026-10-24T05:01:00.000Z" },
      { method: "VI_DIEN_TU", amount: 42000, idempotencyKey: "k1", status: "SUCCEEDED", createdAt: "2026-10-24T05:02:00.000Z" },
    ],
  };

  it("map đúng thông tin khách, topping và giao dịch thành công từ mảng payments", async () => {
    const { getOrder } = await loadApi();
    fetchMock.mockReturnValueOnce(json(apiOrder));
    const order = await getOrder(5);
    expect(order.customer).toMatchObject({ name: "An", phone: "0901234567" });
    expect(order.items[0].toppings).toEqual([{ id: "pearl", name: "Trân châu đen", price: 8000 }]);
    expect(order.payment).toEqual({ method: "VI_DIEN_TU", amount: 42000, idempotencyKey: "k1" });
  });

  it("đơn chỉ có giao dịch thất bại thì chưa có payment", async () => {
    const { getOrder } = await loadApi();
    fetchMock.mockReturnValueOnce(json({ ...apiOrder, status: "PAYMENT_FAILED", payments: [apiOrder.payments[0]] }));
    expect((await getOrder(5)).payment).toBeNull();
  });

  it("gửi Authorization khi đã đăng nhập và lấy lịch sử theo token", async () => {
    const { getOrders } = await loadApi();
    const token = `h.${btoa(JSON.stringify({ sub: 7, email: "a@b.vn", exp: 4102444800 }))}.s`;
    localStorage.setItem("brewlite.auth.v1", JSON.stringify({ accessToken: token, userId: 7, email: "a@b.vn" }));
    fetchMock.mockReturnValueOnce(json([apiOrder]));
    await getOrders();
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/orders");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("khách: không gọi /orders trần; chỉ hỏi các đơn đã đặt trên thiết bị", async () => {
    const { getOrders } = await loadApi();
    expect(await getOrders()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    localStorage.setItem("brewlite.guestOrders.v1", JSON.stringify([9, 4]));
    fetchMock.mockReturnValueOnce(json([]));
    await getOrders();
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/orders?ids=9,4");
  });

  it("thanh toán: phát lại giao dịch thất bại KHÔNG bị coi là thành công", async () => {
    const { payOrder } = await loadApi();
    fetchMock.mockReturnValueOnce(json({ success: false, isIdempotent: true, orderStatus: "PAYMENT_FAILED", message: "x" }, 201));
    const res = await payOrder({ orderId: 5, amount: 42000, method: "VI_DIEN_TU", idempotencyKey: "k0", mockSuccess: false });
    expect(res.success).toBe(false);
  });

  it("thanh toán: phát lại giao dịch thành công vẫn là thành công", async () => {
    const { payOrder } = await loadApi();
    fetchMock.mockReturnValueOnce(json({ success: true, isIdempotent: true, orderStatus: "PAID", message: "x" }, 201));
    const res = await payOrder({ orderId: 5, amount: 42000, method: "VI_DIEN_TU", idempotencyKey: "k1" });
    expect(res.success).toBe(true);
  });
});
