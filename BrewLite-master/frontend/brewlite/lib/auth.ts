import type { AuthSession } from "./types";

const STORAGE_KEY = "brewlite.auth.v1";
const GUEST_ORDERS_KEY = "brewlite.guestOrders.v1";

/** Giải mã payload JWT (không kiểm chữ ký — việc đó do server làm). */
export function decodeJwt(token: string): { sub?: number; email?: string; exp?: number } | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = new TextDecoder().decode(Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)));
    return JSON.parse(json) as { sub?: number; email?: string; exp?: number };
  } catch {
    return null;
  }
}

export function isExpired(token: string, now = Date.now()): boolean {
  const exp = decodeJwt(token)?.exp;
  return typeof exp === "number" && exp * 1000 <= now;
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.accessToken || typeof parsed.userId !== "number" || !parsed.email) return null;
    if (isExpired(parsed.accessToken)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function writeSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / đầy bộ nhớ -> bỏ qua */
  }
}

/** Header Authorization cho các request cần xác thực (rỗng nếu chưa đăng nhập). */
export function authHeaders(): Record<string, string> {
  const session = readSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

/* Khách chưa đăng nhập: nhớ mã các đơn đã đặt trên thiết bị này để xem lại lịch sử. */

export function readGuestOrderIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_ORDERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function rememberGuestOrder(id: number): void {
  if (typeof window === "undefined") return;
  try {
    const ids = readGuestOrderIds();
    if (!ids.includes(id)) {
      window.localStorage.setItem(GUEST_ORDERS_KEY, JSON.stringify([id, ...ids].slice(0, 100)));
    }
  } catch {
    /* bỏ qua */
  }
}
