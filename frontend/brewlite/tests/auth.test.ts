import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_STORAGE_KEY,
  authFetch,
  clearToken,
  decodeToken,
  getSessionUser,
  getToken,
  loginRequest,
  registerRequest,
  safeNextPath,
  saveToken,
  userFromToken,
  validateAuthForm,
} from "@/lib/auth";

function makeJwt(payload: object): string {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}.signature`;
}

const future = () => Math.floor(Date.now() / 1000) + 3600;
const past = () => Math.floor(Date.now() / 1000) - 10;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("token", () => {
  it("đọc payload JWT", () => {
    const t = makeJwt({ sub: 7, email: "a@b.vn", exp: future() });
    expect(decodeToken(t)).toMatchObject({ sub: 7, email: "a@b.vn" });
    expect(userFromToken(t)).toEqual({ id: 7, email: "a@b.vn" });
  });

  it("từ chối token hỏng hoặc thiếu trường", () => {
    expect(decodeToken("khong-phai-jwt")).toBeNull();
    expect(decodeToken(makeJwt({ foo: 1 }))).toBeNull();
    expect(userFromToken(null)).toBeNull();
  });

  it("token hết hạn không tính là đã đăng nhập", () => {
    expect(userFromToken(makeJwt({ sub: 1, email: "a@b.vn", exp: past() }))).toBeNull();
  });

  it("lưu, đọc và xoá token", () => {
    const t = makeJwt({ sub: 1, email: "a@b.vn", exp: future() });
    saveToken(t);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBe(t);
    expect(getToken()).toBe(t);
    expect(getSessionUser()).toEqual({ id: 1, email: "a@b.vn" });
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("getToken bỏ qua token đã hết hạn", () => {
    localStorage.setItem(AUTH_STORAGE_KEY, makeJwt({ sub: 1, email: "a@b.vn", exp: past() }));
    expect(getToken()).toBeNull();
  });
});

describe("validateAuthForm", () => {
  it("đăng nhập: bắt buộc email hợp lệ và mật khẩu", () => {
    expect(validateAuthForm({ email: "", password: "" }, "login")).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
    });
    expect(validateAuthForm({ email: "sai-email", password: "x" }, "login").email).toBe("Email không hợp lệ");
    expect(validateAuthForm({ email: "a@b.vn", password: "x" }, "login")).toEqual({});
  });

  it("đăng ký: mật khẩu ≥ 6 ký tự và phải khớp", () => {
    expect(validateAuthForm({ email: "a@b.vn", password: "123", confirm: "123" }, "register").password).toMatch(/6/);
    expect(validateAuthForm({ email: "a@b.vn", password: "123456", confirm: "654321" }, "register").confirm).toBeDefined();
    expect(validateAuthForm({ email: "a@b.vn", password: "123456", confirm: "123456" }, "register")).toEqual({});
  });
});

describe("safeNextPath", () => {
  it("chỉ cho phép đường dẫn nội bộ", () => {
    expect(safeNextPath("?next=/checkout")).toBe("/checkout");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("?next=https://evil.com")).toBe("/");
    expect(safeNextPath("?next=//evil.com")).toBe("/");
  });
});

describe("chế độ dữ liệu giả (không có API_URL)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", ""));

  it("đăng ký rồi đăng nhập trả về token hợp lệ", async () => {
    await registerRequest("a@b.vn", "123456");
    const token = await loginRequest("a@b.vn", "123456");
    expect(userFromToken(token)).toMatchObject({ email: "a@b.vn" });
  });

  it("sai mật khẩu và email trùng đều báo lỗi", async () => {
    await registerRequest("a@b.vn", "123456");
    await expect(loginRequest("a@b.vn", "sai-mat-khau")).rejects.toThrow("không chính xác");
    await expect(registerRequest("a@b.vn", "123456")).rejects.toThrow("đã được sử dụng");
  });
});

describe("gọi API thật", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test"));

  it("login: gửi đúng body và lấy accessToken", async () => {
    const token = makeJwt({ sub: 3, email: "a@b.vn", exp: future() });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ accessToken: token }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loginRequest("a@b.vn", "123456")).resolves.toBe(token);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/auth/login");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.vn", password: "123456" });
  });

  it("hiển thị message lỗi từ backend (cả dạng mảng của ValidationPipe)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Email hoặc mật khẩu không chính xác" }), { status: 401 })));
    await expect(loginRequest("a@b.vn", "x")).rejects.toThrow("Email hoặc mật khẩu không chính xác");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: ["Email không hợp lệ", "Mật khẩu quá ngắn"] }), { status: 400 })));
    await expect(registerRequest("x", "1")).rejects.toThrow("Email không hợp lệ · Mật khẩu quá ngắn");
  });

  it("mất kết nối -> báo lỗi dễ hiểu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(loginRequest("a@b.vn", "123456")).rejects.toThrow("Không kết nối được máy chủ");
  });

  it("authFetch gắn Bearer token khi đã đăng nhập, không gắn khi chưa", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await authFetch("http://api.test/orders");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBeNull();

    const token = makeJwt({ sub: 1, email: "a@b.vn", exp: future() });
    saveToken(token);
    await authFetch("http://api.test/orders");
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get("Authorization")).toBe(`Bearer ${token}`);
  });

  it("authFetch xoá phiên khi server trả 401", async () => {
    saveToken(makeJwt({ sub: 1, email: "a@b.vn", exp: future() }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await authFetch("http://api.test/orders");
    expect(getToken()).toBeNull();
  });
});
