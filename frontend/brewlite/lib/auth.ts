/**
 * Xác thực phía frontend: lưu JWT ở localStorage và gắn vào các request cần đăng nhập.
 *
 * - Có NEXT_PUBLIC_API_URL  -> gọi API NestJS: POST /auth/register, POST /auth/login.
 * - Không có                -> dùng tài khoản giả lưu cục bộ để demo (không cần backend).
 *
 * Lưu ý bảo mật: token ở localStorage đọc được bởi mọi script cùng origin (rủi ro XSS).
 * Đây là lựa chọn đơn giản cho phạm vi MVP; có thể đổi sang cookie httpOnly ở giai đoạn sau.
 */

export const AUTH_STORAGE_KEY = "brewlite.auth.v1";
const MOCK_USERS_KEY = "brewlite.mock-users.v1";
const AUTH_EVENT = "brewlite:auth-change";

export interface AuthUser {
  id: number;
  email: string;
}

interface TokenPayload {
  sub: number;
  email: string;
  /** Thời điểm hết hạn, tính bằng giây (chuẩn JWT) */
  exp?: number;
}

/* ------------------------------------------------------------------ */
/* Token                                                               */
/* ------------------------------------------------------------------ */

function apiUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || undefined;
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Đọc payload của JWT (không xác minh chữ ký - việc đó do backend làm). */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const payload = JSON.parse(base64UrlDecode(part)) as Partial<TokenPayload>;
    if (typeof payload.sub !== "number" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: TokenPayload, nowMs = Date.now()): boolean {
  return payload.exp !== undefined && payload.exp * 1000 <= nowMs;
}

/** Trả về user nếu token hợp lệ và chưa hết hạn, ngược lại null. */
export function userFromToken(token: string | null): AuthUser | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload || isTokenExpired(payload)) return null;
  return { id: payload.sub, email: payload.email };
}

/* ------------------------------------------------------------------ */
/* Lưu trữ + đăng ký theo dõi (dùng với useSyncExternalStore)           */
/* ------------------------------------------------------------------ */

function emitChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AUTH_EVENT));
}

export function saveToken(token: string): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
  } catch {
    /* private mode / đầy bộ nhớ -> phiên đăng nhập không được lưu */
  }
  emitChange();
}

export function clearToken(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* bỏ qua */
  }
  emitChange();
}

/** Token đang lưu, hoặc null nếu chưa đăng nhập / token hỏng / đã hết hạn. */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    return userFromToken(token) ? token : null;
  } catch {
    return null;
  }
}

export function getSessionUser(): AuthUser | null {
  return userFromToken(getToken());
}

export function subscribeAuth(callback: () => void): () => void {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback); // đồng bộ giữa các tab
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/* ------------------------------------------------------------------ */
/* fetch có xác thực                                                    */
/* ------------------------------------------------------------------ */

/**
 * fetch tự gắn `Authorization: Bearer <token>` nếu đã đăng nhập.
 * Nếu server trả 401 (token sai/hết hạn) thì xoá phiên để giao diện quay về trạng thái chưa đăng nhập.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && token) clearToken();
  return res;
}

/* ------------------------------------------------------------------ */
/* Gọi API đăng nhập / đăng ký                                          */
/* ------------------------------------------------------------------ */

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(" · ");
    if (typeof data.message === "string" && data.message) return data.message;
  } catch {
    /* không phải JSON */
  }
  return `${fallback} (HTTP ${res.status})`;
}

async function postJson(path: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${apiUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
}

type MockUsers = Record<string, { id: number; password: string }>;

function readMockUsers(): MockUsers {
  try {
    return JSON.parse(localStorage.getItem(MOCK_USERS_KEY) ?? "{}") as MockUsers;
  } catch {
    return {};
  }
}

function makeMockToken(id: number, email: string): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const payload = base64UrlEncode(JSON.stringify({ sub: id, email, exp }));
  return `${header}.${payload}.mock`;
}

/** Đăng ký tài khoản mới. Backend không trả token ở bước này nên cần đăng nhập sau đó. */
export async function registerRequest(email: string, password: string): Promise<void> {
  if (apiUrl()) {
    const res = await postJson("/auth/register", { email, password });
    if (!res.ok) throw new Error(await readError(res, "Đăng ký thất bại"));
    return;
  }
  const users = readMockUsers();
  if (users[email]) throw new Error("Email này đã được sử dụng!");
  const id = Object.keys(users).length + 1;
  localStorage.setItem(MOCK_USERS_KEY, JSON.stringify({ ...users, [email]: { id, password } }));
}

/** Đăng nhập, trả về accessToken. */
export async function loginRequest(email: string, password: string): Promise<string> {
  if (apiUrl()) {
    const res = await postJson("/auth/login", { email, password });
    if (!res.ok) throw new Error(await readError(res, "Đăng nhập thất bại"));
    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken || !userFromToken(data.accessToken)) {
      throw new Error("Máy chủ trả về token không hợp lệ");
    }
    return data.accessToken;
  }
  const user = readMockUsers()[email];
  if (!user || user.password !== password) {
    throw new Error("Email hoặc mật khẩu không chính xác");
  }
  return makeMockToken(user.id, email);
}

/* ------------------------------------------------------------------ */
/* Validate form (khớp quy tắc của backend: email hợp lệ, mật khẩu ≥ 6)  */
/* ------------------------------------------------------------------ */

export const MIN_PASSWORD_LENGTH = 6;

export interface AuthFormValues {
  email: string;
  password: string;
  confirm?: string;
}

export type AuthFormErrors = Partial<Record<"email" | "password" | "confirm", string>>;

export function validateAuthForm(values: AuthFormValues, mode: "login" | "register"): AuthFormErrors {
  const errors: AuthFormErrors = {};
  const email = values.email.trim();
  if (!email) errors.email = "Vui lòng nhập email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Email không hợp lệ";

  if (!values.password) errors.password = "Vui lòng nhập mật khẩu";
  else if (mode === "register" && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`;
  }

  if (mode === "register" && values.password && values.confirm !== values.password) {
    errors.confirm = "Mật khẩu nhập lại không khớp";
  }
  return errors;
}

/** Chỉ cho phép chuyển hướng nội bộ (chống open-redirect qua ?next=). */
export function safeNextPath(search: string): string {
  const next = new URLSearchParams(search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) return next;
  return "/";
}
