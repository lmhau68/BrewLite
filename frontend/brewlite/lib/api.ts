import { unitPriceOf } from "./cart";
import { authFetch, getSessionUser } from "./auth";
import { MOCK_PRODUCTS } from "./mock-data";
import { SIZES, TOPPINGS } from "./menu-options";
import type {
  CategoryId,
  CreateOrderPayload,
  MenuOptions,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  Product,
  SizeId,
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

/** Shape sản phẩm trả về từ GET /products (model Product của Prisma). */
interface ApiProduct {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  emoji?: string | null;
  price: number;
  imageUrl?: string | null;
  stock: number;
  customizable?: boolean | null;
  bestSeller?: boolean | null;
}

const CATEGORY_IDS: readonly CategoryId[] = ["coffee", "tea", "milk-tea", "blended"];

/** Chuẩn hoá danh mục từ API về CategoryId, fallback về "coffee". */
function toCategoryId(value: string | null | undefined): CategoryId {
  return CATEGORY_IDS.includes(value as CategoryId) ? (value as CategoryId) : "coffee";
}

/**
 * Chuyển sản phẩm từ API sang kiểu dùng chung của frontend.
 * API là nguồn sự thật cho giá/tồn kho; các trường trình bày thiếu thì có giá trị mặc định.
 */
function mapApiProduct(raw: ApiProduct): Product {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    category: toCategoryId(raw.category),
    emoji: raw.emoji ?? "🧋",
    price: raw.price,
    stock: raw.stock,
    customizable: raw.customizable ?? true,
    bestSeller: raw.bestSeller ?? false,
  };
}

export async function getProducts(): Promise<Product[]> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error(`Không tải được menu (HTTP ${res.status})`);
    const data = (await res.json()) as ApiProduct[];
    return data.map(mapApiProduct);
  }
  await sleep(MOCK_DELAY_MS);
  const state = demoState();
  if (state === "error") throw new Error("Không thể kết nối máy chủ");
  if (state === "empty") return [];
  return MOCK_PRODUCTS;
}

export async function getProduct(id: number): Promise<Product> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/products/${id}`);
    if (res.status === 404) throw new Error("Sản phẩm không tồn tại");
    if (!res.ok) throw new Error(`Không tải được sản phẩm (HTTP ${res.status})`);
    return mapApiProduct((await res.json()) as ApiProduct);
  }
  await sleep(MOCK_DELAY_MS / 2);
  const found = MOCK_PRODUCTS.find((p) => p.id === id);
  if (!found) throw new Error("Sản phẩm không tồn tại");
  return found;
}

/* ------------------------------------------------------------------ */
/* Đơn hàng - kiểu dữ liệu API                                        */
/* ------------------------------------------------------------------ */

interface ApiProductRef {
  id: number;
  name: string;
  emoji?: string | null;
}

interface ApiOrderItem {
  id: number;
  productId: number;
  size: string;
  toppings?: { id: string; name: string; price: number }[] | null;
  unitPrice?: number | null;
  qty: number;
  lineTotal: number;
  product?: ApiProductRef | null;
}

interface ApiPayment {
  id: number;
  orderId: number;
  idempotencyKey: string;
  amount: number;
  method: string;
  status: string;
  failureReason?: string | null;
  createdAt: string;
}

interface ApiOrder {
  id: number;
  status: OrderStatus;
  total: number;
  discountCode?: string | null;
  discountAmount?: number | null;
  loyaltyPointsAwarded?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  note?: string | null;
  createdAt: string;
  items: ApiOrderItem[];
  payments?: ApiPayment[] | null;
}

/**
 * Chuyển đơn từ API (Prisma) sang kiểu dùng chung của frontend.
 *
 * Lưu ý tương thích: các trường `customerName`, `toppings` có thể chưa tồn tại tuỳ phiên bản API.
 * Giao diện phải hiển thị được mà không in ra `undefined`.
 */
function mapApiOrder(raw: ApiOrder): Order {
  const payments = raw.payments ?? [];
  const latest = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
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
      const toppings = item.toppings ?? [];
      return {
        id: item.id,
        productId: item.productId,
        name: item.product?.name ?? `Sản phẩm #${item.productId}`,
        emoji: item.product?.emoji ?? "🧋",
        size: item.size as SizeId,
        toppings,
        qty: item.qty,
        unitPrice: item.unitPrice ?? (item.qty > 0 ? item.lineTotal / item.qty : item.lineTotal),
        lineTotal: item.lineTotal,
      };
    }),
    payment: latest
      ? {
          method: latest.method as PaymentMethod,
          amount: latest.amount,
          idempotencyKey: latest.idempotencyKey,
          status: latest.status,
          failureReason: latest.failureReason ?? undefined,
        }
      : null,
    discountCode: raw.discountCode ?? null,
    discountAmount: raw.discountAmount ?? 0,
    loyaltyPointsAwarded: raw.loyaltyPointsAwarded ?? 0,
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
    const unitPrice = product ? unitPriceOf(product, item.size, toppings, SIZES) : 0;
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
/** Size/topping cho menu. Khong co API_URL -> dung gia tri du phong. */
export async function getOptions(): Promise<MenuOptions> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/options`);
    if (!res.ok) throw new Error(`Không tải được tuỳ chọn (HTTP ${res.status})`);
    const data = (await res.json()) as Partial<MenuOptions>;
    return {
      sizes: data.sizes?.length ? data.sizes : SIZES,
      toppings: data.toppings ?? TOPPINGS,
    };
  }
  return { sizes: SIZES, toppings: TOPPINGS };
}
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
  /** Điểm tích lũy được cộng cho đơn (0 nếu không có) */
  loyaltyPointsAwarded?: number;
  /** Trạng thái đơn sau khi cố gắng thanh toán */
  orderStatus?: OrderStatus;
  /** Giao dịch mà API trả về (dùng để hiển thị phương thức đã trả) */
  payment?: {
    method: PaymentMethod;
    amount: number;
    idempotencyKey: string;
    status: string;
    failureReason?: string;
  };
}

/** Tạo đơn. Trả về đơn đã được chuẩn hoá theo kiểu Order của frontend. */
export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  if (API_URL) {
    // Đã đăng nhập: gắn token + userId để đơn được liên kết với tài khoản (và tích điểm)
    const user = getSessionUser();
    const res = await authFetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user ? { ...payload, userId: user.id } : payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, "Không tạo được đơn hàng"));
    const data = (await res.json()) as { order: ApiOrder };
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
    loyaltyPointsAwarded: 0,
  };
  writeMockOrders([order, ...orders]);
  return order;
}

/** Danh sách đơn hàng, mới nhất trước. */
export async function getOrders(): Promise<Order[]> {
  if (API_URL) {
    // Đã đăng nhập: chỉ lấy đơn của tài khoản này
    const user = getSessionUser();
    const res = await authFetch(`${API_URL}/orders${user ? `?userId=${user.id}` : ""}`);
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
    const res = await authFetch(`${API_URL}/orders/${id}`);
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
    const res = await authFetch(`${API_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      /** API trả isIdempotent khi khoá đã dùng -> giao dịch trước đó đã thành công */
      isIdempotent?: boolean;
      message?: string;
      orderStatus?: OrderStatus;
      loyaltyPointsAwarded?: number;
      order?: ApiOrder;
      payment?: {
        method?: string;
        amount?: number;
        idempotencyKey?: string;
        status?: string;
        failureReason?: string | null;
      };
    };
    // Chỉ khi API báo thành công mới coi là thanh toán thành công. isIdempotent=true
    // chỉ nói "giao dịch này đã được xử lý trước đó", không nói là thành công.
    const success = data.success === true || data.orderStatus === "PAID";
    return {
      success,
      message: data.message ?? "",
      order: data.order ? mapApiOrder(data.order) : null,
      loyaltyPointsAwarded: data.loyaltyPointsAwarded ?? 0,
      orderStatus: data.orderStatus,
      payment: data.payment
        ? {
            method: (data.payment.method ?? "VI_DIEN_TU") as PaymentMethod,
            amount: data.payment.amount ?? input.amount,
            idempotencyKey: data.payment.idempotencyKey ?? input.idempotencyKey,
            status: data.payment.status ?? "SUCCEEDED",
            failureReason: data.payment.failureReason ?? undefined,
          }
        : undefined,
    };
  }

  await sleep(MOCK_DELAY_MS);
  const orders = readMockOrders();
  const index = orders.findIndex((o) => o.id === input.orderId);
  if (index === -1) throw new Error("Không tìm thấy đơn hàng");

  const current = orders[index];
  // Đã thanh toán rồi -> trả kết quả cũ, không tạo giao dịch mới
  if (current.payment) {
    return {
      success: true,
      message: "Yêu cầu thanh toán đã được xử lý trước đó.",
      order: current,
      loyaltyPointsAwarded: current.loyaltyPointsAwarded ?? 0,
      orderStatus: current.status,
    };
  }

  if (input.mockSuccess === false) {
    const failed: Order = { ...current, status: "PAYMENT_FAILED" };
    orders[index] = failed;
    writeMockOrders(orders);
    return {
      success: false,
      message: "Thanh toán giả lập thất bại (thẻ bị từ chối hoặc số dư không đủ).",
      order: failed,
      loyaltyPointsAwarded: 0,
      orderStatus: failed.status,
    };
  }

  const points = Math.floor(current.total / 10000);
  const paid: Order = {
    ...current,
    status: "PAID",
    loyaltyPointsAwarded: points,
    payment: {
      method: input.method,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
      status: "SUCCEEDED",
    },
  };
  orders[index] = paid;
  writeMockOrders(orders);
  return {
    success: true,
    message: "Thanh toán đơn hàng thành công qua cổng giả lập.",
    order: paid,
    loyaltyPointsAwarded: points,
    orderStatus: paid.status,
  };
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
