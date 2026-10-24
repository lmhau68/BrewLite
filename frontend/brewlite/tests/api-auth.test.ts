import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeJwt(payload: object): string {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
  return `${enc({ alg: "HS256" })}.${enc(payload)}.sig`;
}

const apiOrder = {
  id: 5,
  status: "PENDING",
  total: 29000,
  createdAt: "2026-10-24T00:00:00.000Z",
  items: [],
};

/** api.ts đọc NEXT_PUBLIC_API_URL lúc nạp module nên cần nạp lại sau khi đặt biến môi trường */
async function loadApi() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  const api = await import("@/lib/api");
  const auth = await import("@/lib/auth");
  return { api, auth };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ order: apiOrder }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("request đặt đơn có xác thực", () => {
  const payload = {
    customerName: "A",
    customerPhone: "0901234567",
    items: [{ productId: 1, size: "S" as const, qty: 1, toppings: [] }],
  };

  it("đã đăng nhập: gửi Bearer token và userId khi tạo đơn", async () => {
    const { api, auth } = await loadApi();
    const token = makeJwt({ sub: 9, email: "a@b.vn", exp: Math.floor(Date.now() / 1000) + 3600 });
    auth.saveToken(token);

    await api.createOrder(payload);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/orders");
    expect(new Headers(init.headers).get("Authorization")).toBe(`Bearer ${token}`);
    expect(JSON.parse(init.body)).toMatchObject({ customerName: "A", userId: 9 });
  });

  it("khách vãng lai: không gửi token, không có userId", async () => {
    const { api } = await loadApi();
    await api.createOrder(payload);

    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBeNull();
    expect(JSON.parse(init.body)).not.toHaveProperty("userId");
  });

  it("đã đăng nhập: lịch sử đơn lọc theo userId", async () => {
    const { api, auth } = await loadApi();
    auth.saveToken(makeJwt({ sub: 9, email: "a@b.vn", exp: Math.floor(Date.now() / 1000) + 3600 }));
    fetchMock.mockResolvedValueOnce(new Response("[]", { status: 200 }));

    await api.getOrders();
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/orders?userId=9");
  });

  it("thanh toán cũng gửi Bearer token", async () => {
    const { api, auth } = await loadApi();
    const token = makeJwt({ sub: 1, email: "a@b.vn", exp: Math.floor(Date.now() / 1000) + 3600 });
    auth.saveToken(token);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, orderStatus: "PAID", loyaltyPointsAwarded: 2 }), { status: 200 }));

    const result = await api.payOrder({ orderId: 5, amount: 29000, method: "VI_DIEN_TU", idempotencyKey: "k1" });
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe(`Bearer ${token}`);
    expect(result.success).toBe(true);
  });
});

