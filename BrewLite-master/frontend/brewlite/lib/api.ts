import { unitPriceOf } from "./cart";
import { authHeaders, decodeJwt, readGuestOrderIds, readSession, rememberGuestOrder } from "./auth";
import { MOCK_PRODUCTS } from "./mock-data";
import { CATEGORIES, SIZES, TOPPINGS } from "./menu-options";
import type {
  AuthSession,
  CategoryId,
  CreateOrderPayload,
  MenuOptions,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  Product,
  SizeId,
  ToppingOption,
} from "./types";

/**
 * Lớp truy cập dữ liệu menu.
 * - Không đặt NEXT_PUBLIC_API_URL  -> dùng dữ liệu giả (chạy được ngay, không cần backend).
 * - Đặt NEXT_PUBLIC_API_URL        -> gọi API NestJS: GET /products, GET /products/:id.
 *
 * Demo trạng thái (chỉ khi dùng dữ liệu giả): thêm ?state=error | empty vào URL.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const MOCK_DELAY_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function demoState(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("state");
}

/* ------------------------------------------------------------------ */
/* Menu                                                                */
/* ------------------------------------------------------------------ */

/** Sản phẩm thô từ API: các trường hiển thị có thể thiếu tuỳ phiên bản DB/seed. */
type ApiProductRow = Partial<Product> & Pick<Product, "id" | "name" | "price">;

const CATEGORY_IDS = CATEGORIES.filter((c) => c.id !== "all").map((c) => c.id);

/**
 * Chuẩn hoá sản phẩm từ API sang kiểu Product của frontend.
 * Thiếu trường nào dùng giá trị mặc định an toàn — đặc biệt `customizable` mặc định là true
 * để nút Size/Topping không bị khoá nhầm, và `description` luôn là chuỗi để tìm kiếm không lỗi.
 */
export function normalizeProduct(raw: ApiProductRow): Product {
  const category = CATEGORY_IDS.includes(raw.category as CategoryId)
    ? (raw.category as CategoryId)
    : "coffee";
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    category,
    price: Number(raw.price) || 0,
    emoji: raw.emoji || "🧋",
    stock: Number.isFinite(raw.stock) ? (raw.stock as number) : 0,
    customizable: raw.customizable ?? true,
    bestSeller: raw.bestSeller ?? false,
    imageUrl: raw.imageUrl || undefined,
  };
}

export async function getProducts(): Promise<Product[]> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error(`Không tải được menu (HTTP ${res.status})`);
    return ((await res.json()) as ApiProductRow[]).map(normalizeProduct);
  }
  await sleep(MOCK_DELAY_MS);
  const state = demoState();
  if (state === "error") throw new Error("Không thể kết nối máy chủ");
  if (state === "empty") return [];
  return MOCK_PRODUCTS;
}

export async function getProduct(id: number): Promise<import("./types").Product> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (res.status === 404) throw new Error("Sản phẩm không tồn tại");
    if (!res.ok) throw new Error(`Không tải được sản phẩm (HTTP ${res.status})`);
    return normalizeProduct((await res.json()) as ApiProductRow);
  }
  await sleep(MOCK_DELAY_MS / 2);
  const found = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!found) throw new Error("Sản phẩm không tồn tại");
  return found;
}

/** Danh sách size + topping (GET /options). Lỗi mạng -> dùng bảng giá dự phòng để menu vẫn đặt được. */
export async function getOptions(): Promise<MenuOptions> {
  const fallback: MenuOptions = { sizes: SIZES, toppings: TOPPINGS };
  if (!API_URL) return fallback;
  try {
    const res = await fetch(`${API_URL}/options`);
    if (!res.ok) return fallback;
    const data = (await res.json()) as Partial<MenuOptions>;
    return {
      sizes: data.sizes?.length ? data.sizes : fallback.sizes,
      toppings: Array.isArray(data.toppings) ? data.toppings : fallback.toppings,
    };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Xác thực                                                            */
/* ------------------------------------------------------------------ */

function requireApi(): string {
  if (!API_URL) {
    throw new Error("Đang dùng dữ liệu giả nên chưa đăng nhập được. Hãy đặt NEXT_PUBLIC_API_URL để nối backend.");
  }
  return API_URL;
}

/** POST /auth/login -> { accessToken, userId?, email? }. Trả về phiên đăng nhập đã chuẩn hoá. */
export async function login(email: string, password: string): Promise<AuthSession> {
  const base = requireApi();
  let res: Response;
  try {
    res = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ");
  }
  if (!res.ok) throw new Error(await readApiError(res, "Đăng nhập không thành công"));
  const data = (await res.json()) as { accessToken?: string; userId?: number; email?: string };
  if (!data.accessToken) throw new Error("Máy chủ không trả về token đăng nhập");
  const payload = decodeJwt(data.accessToken);
  const userId = data.userId ?? payload?.sub;
  if (typeof userId !== "number") throw new Error("Token đăng nhập không hợp lệ");
  return { accessToken: data.accessToken, userId, email: data.email ?? payload?.email ?? email.trim() };
}

/** POST /auth/register (API không trả token) rồi đăng nhập luôn. */
export async function register(email: string, password: string): Promise<AuthSession> {
  const base = requireApi();
  let res: Response;
  try {
    res = await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ");
  }
  if (!res.ok) throw new Error(await readApiError(res, "Đăng ký không thành công"));
  return login(email, password);
}

/* ------------------------------------------------------------------ */
/* Đơn hàng - kiểu dữ liệu API                                        */
/* ------------------------------------------------------------------ */

interface ApiProduct {
  id: number;
  name: string;
  emoji?: string;
  imageUrl?: string;
}

interface ApiOrderItem {
  id: number;
  productId: number;
  size: string;
  toppings?: Partial<ToppingOption>[] | null;
  qty: number;
  lineTotal: number;
  product?: ApiProduct | null;
}

interface ApiOrder {
  id: number;
  status: OrderStatus;
  total: number;
  /** Có thể chưa có nếu API chưa hỗ trợ khách không đăng nhập */
  customerName?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  note?: string | null;
  createdAt: string;
  items: ApiOrderItem[];
  /** API trả mảng `payments` (mới nhất có thể ở bất kỳ vị trí nào) */
  payments?: ApiPayment[] | null;
  /** Dạng cũ (một giao dịch) — vẫn đọc được để tương thích */
  payment?: ApiPayment | null;
}

interface ApiPayment {
  method: string;
  amount: number;
  idempotencyKey: string;
  status?: "PROCESSING" | "SUCCEEDED" | "FAILED";
  createdAt?: string;
}

/**
 * Chuyển đơn từ API (Prisma) sang kiểu dùng chung của frontend.
 *
 * Lưu ý tương thích: các trường `customerName`, `customerPhone`, `address`, `note`,
 * `toppings` có thể chưa tồn tại tuỳ phiên bản API. Giao diện phải hiển thị được
 * chứ không in ra `undefined`.
 */
function mapApiOrder(raw: ApiOrder): Order {
  // Giao dịch thành công gần nhất; không có thì đơn chưa thanh toán xong.
  const payment =
    raw.payment ??
    [...(raw.payments ?? [])]
      .filter((p) => p.status === undefined || p.status === "SUCCEEDED")
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0] ??
    null;
  return {
    id: raw.id,
    status: raw.status,
    total: raw.total,
    createdAt: raw.createdAt,
    customer: {
      name: raw.customerName?.trim() || "Khách",
      phone: raw.customerPhone?.trim() || "",
      address: raw.address?.trim() || undefined,
      note: raw.note?.trim() || undefined,
    },
    items: raw.items.map((item): OrderLine => {
      const toppings: ToppingOption[] = (Array.isArray(item.toppings) ? item.toppings : [])
        .filter((t): t is ToppingOption => typeof t?.id === "string" && typeof t?.name === "string")
        .map((t) => ({ id: t.id, name: t.name, price: Number(t.price) || 0 }));
      return {
        id: item.id,
        productId: item.productId,
        name: item.product?.name ?? `Sản phẩm #${item.productId}`,
        emoji: item.product?.emoji ?? "🧋",
        size: item.size as SizeId,
        toppings,
        qty: item.qty,
        unitPrice: item.qty > 0 ? item.lineTotal / item.qty : item.lineTotal,
        lineTotal: item.lineTotal,
      };
    }),
    payment: payment
      ? {
          method: payment.method as PaymentMethod,
          amount: payment.amount,
          idempotencyKey: payment.idempotencyKey,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ */
/* Đơn hàng - kho dữ liệu giả (localStorage)                          */
/* ------------------------------------------------------------------ */

const MOCK_ORDERS_KEY = "brewlite.orders.v1";

function readMockOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MOCK_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeMockOrders(orders: Order[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOCK_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    /* private mode / đầy bộ nhớ -> bỏ qua */
  }
}

/** Dựng dòng đơn giả từ payload, dùng bảng giá phía client (giống hệt server). */
function mockOrderLines(payload: CreateOrderPayload): OrderLine[] {
  return payload.items.map((item) => {
    const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
    const toppings = TOPPINGS.filter((t) => item.toppings.some((x) => x.id === t.id));
    const unitPrice = product ? unitPriceOf(product, item.size, toppings) : 0;
    return {
      productId: item.productId,
      name: product?.name ?? `Sản phẩm #${item.productId}`,
      emoji: product?.emoji ?? "🧋",
      size: item.size,
      toppings,
      qty: item.qty,
      unitPrice,
      lineTotal: unitPrice * item.qty,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Đơn hàng - API công khai                                           */
/* ------------------------------------------------------------------ */

export interface PayOrderInput {
  orderId: number;
  amount: number;
  method: PaymentMethod;
  idempotencyKey: string;
  /** Chỉ dùng khi dùng dữ liệu giả / demo nhánh thất bại */
  mockSuccess?: boolean;
}

export interface PayOrderResult {
  success: boolean;
  message: string;
  order: Order | null;
}

/** Tạo đơn. Trả về đơn đã được chuẩn hoá theo kiểu Order của frontend. */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Không tạo được đơn hàng"));
    const data = (await res.json()) as { order: ApiOrder };
    // Khách chưa đăng nhập: nhớ mã đơn để còn xem lại lịch sử trên thiết bị này
    if (!readSession()) rememberGuestOrder(data.order.id);
    return mapApiOrder(data.order);
  }

  await sleep(MOCK_DELAY_MS / 2);
  const orders = readMockOrders();
  const items = mockOrderLines(payload);
  const order: Order = {
    id: orders.reduce((max, o) => Math.max(max, o.id), 0) + 1,
    status: "PENDING",
    total: items.reduce((sum, i) => sum + i.lineTotal, 0),
    createdAt: new Date().toISOString(),
    customer: {
      name: payload.customerName,
      phone: payload.customerPhone,
      address: payload.address,
      note: payload.note,
    },
    items,
    payment: null,
  };
  writeMockOrders([order, ...orders]);
  return order;
}

/** Danh sách đơn hàng, mới nhất trước. */
export async function getOrders(): Promise<Order[]> {
  if (API_URL) {
    // Đăng nhập: server tự lọc theo token. Khách: chỉ hỏi các đơn đã đặt trên thiết bị này
    // (không gọi /orders trần vì sẽ trả đơn của mọi người).
    let url = `${API_URL}/orders`;
    if (!readSession()) {
      const ids = readGuestOrderIds();
      if (ids.length === 0) return [];
      url += `?ids=${ids.join(",")}`;
    }
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Không tải được lịch sử đơn (HTTP ${res.status})`);
    const data = (await res.json()) as ApiOrder[];
    return data.map(mapApiOrder);
  }
  await sleep(MOCK_DELAY_MS / 2);
  return readMockOrders().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Chi tiết một đơn. */
export async function getOrder(id: number): Promise<Order> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/orders/${id}`, { headers: authHeaders() });
    if (res.status === 404) throw new Error("Không tìm thấy đơn hàng");
    if (!res.ok) throw new Error(`Không tải được đơn hàng (HTTP ${res.status})`);
    return mapApiOrder((await res.json()) as ApiOrder);
  }
  await sleep(MOCK_DELAY_MS / 3);
  const found = readMockOrders().find((o) => o.id === id);
  if (!found) throw new Error("Không tìm thấy đơn hàng");
  return found;
}

/**
 * Thanh toán đơn (mô phỏng).
 * Gửi lại cùng idempotencyKey sẽ không tạo giao dịch thứ hai (ADR-005).
 */
export async function payOrder(input: PayOrderInput): Promise<PayOrderResult> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        orderId: input.orderId,
        amount: input.amount,
        method: input.method,
        idempotencyKey: input.idempotencyKey,
        mockSuccess: input.mockSuccess ?? true,
      }),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Không thanh toán được"));
    const data = (await res.json()) as {
      success?: boolean;
      /** true khi khoá đã dùng: kết quả cũ được phát lại (có thể là thất bại) */
      isIdempotent?: boolean;
      message?: string;
      orderStatus?: OrderStatus;
    };
    return {
      // Phát lại một giao dịch THẤT BẠI cũng có isIdempotent=true, nên chỉ tin `success`/trạng thái đơn
      success: data.success === true || data.orderStatus === "PAID",
      message: data.message ?? "",
      order: null,
    };
  }

  await sleep(MOCK_DELAY_MS);
  const orders = readMockOrders();
  const index = orders.findIndex((o) => o.id === input.orderId);
  if (index === -1) throw new Error("Không tìm thấy đơn hàng");

  const current = orders[index];
  // Đã thanh toán rồi -> trả kết quả cũ, không tạo giao dịch mới
  if (current.payment) {
    return { success: true, message: "Yêu cầu thanh toán đã được xử lý trước đó.", order: current };
  }

  if (input.mockSuccess === false) {
    const failed: Order = { ...current, status: "PAYMENT_FAILED" };
    orders[index] = failed;
    writeMockOrders(orders);
    return {
      success: false,
      message: "Thanh toán giả lập thất bại (thẻ bị từ chối hoặc số dư không đủ).",
      order: failed,
    };
  }

  const paid: Order = {
    ...current,
    status: "PAID",
    payment: {
      method: input.method,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
    },
  };
  orders[index] = paid;
  writeMockOrders(orders);
  return { success: true, message: "Thanh toán đơn hàng thành công qua cổng giả lập.", order: paid };
}

/** Đọc nội dung lỗi do API trả về (NestJS trả { message: string | string[] }). */
async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(" · ");
    if (typeof data.message === "string" && data.message) return data.message;
  } catch {
    /* không phải JSON -> dùng fallback */
  }
  return `${fallback} (HTTP ${res.status})`;
}
