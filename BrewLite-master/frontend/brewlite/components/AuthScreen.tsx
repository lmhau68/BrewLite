"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "./AuthProvider";
import { SubPageHeader } from "./SubPageHeader";

type Mode = "login" | "register";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

interface Errors {
  email?: string;
  password?: string;
  confirm?: string;
}

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted focus:border-espresso focus:outline-2 focus:outline-espresso";
const labelClass = "mb-1 block text-sm font-semibold text-espresso";

export function validateAuth(mode: Mode, v: { email: string; password: string; confirm: string }): Errors {
  const errors: Errors = {};
  if (!v.email.trim()) errors.email = "Vui lòng nhập email.";
  else if (!EMAIL_PATTERN.test(v.email.trim())) errors.email = "Email không hợp lệ.";

  if (!v.password) errors.password = "Vui lòng nhập mật khẩu.";
  else if (mode === "register" && v.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`;

  if (mode === "register" && v.password && v.confirm !== v.password) errors.confirm = "Mật khẩu nhập lại chưa khớp.";
  return errors;
}

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { login, register, session } = useAuth();
  const isLogin = mode === "login";

  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);

  // Next.js (cacheComponents) giữ nguyên trạng thái trang đã mở, nên form cũ sẽ còn nguyên chữ đã gõ.
  // Xoá trắng form mỗi khi phiên đăng nhập đổi (đăng nhập xong / đăng xuất).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đặt lại form theo phiên đăng nhập
    setForm({ email: "", password: "", confirm: "" });
    setErrors({});
    setApiError("");
  }, [session]);

  // Quay lại trang bằng nút Back: trình duyệt có thể khôi phục trang cũ cùng chữ đã gõ -> xoá trắng form
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setForm({ email: "", password: "", confirm: "" });
      setErrors({});
      setApiError("");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validateAuth(mode, form);
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setApiError("");
    try {
      await (isLogin ? login : register)(form.email, form.password);
      setForm({ email: "", password: "", confirm: "" }); // không để lại mật khẩu trong state của trang
      router.push("/");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-10 shadow-xl">
      <SubPageHeader title={isLogin ? "Đăng nhập" : "Đăng ký"} backHref="/" backLabel="Về menu" />

      <main className="flex-1 space-y-4 px-4 pt-4">
        <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <p className="text-sm text-muted">
            {isLogin
              ? "Đăng nhập để đơn hàng được lưu vào tài khoản và tích điểm."
              : "Tạo tài khoản để lưu lịch sử đơn và tích điểm thân thiết."}
          </p>

          <div>
            <label htmlFor="auth-email" className={labelClass}>
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "auth-email-error" : undefined}
              className={inputClass}
              placeholder="ban@example.com"
            />
            {errors.email && (
              <p id="auth-email-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="auth-password" className={labelClass}>
              Mật khẩu
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "auth-password-error" : undefined}
              className={inputClass}
              placeholder={isLogin ? "Mật khẩu của bạn" : `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}
            />
            {errors.password && (
              <p id="auth-password-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.password}
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="auth-confirm" className={labelClass}>
                Nhập lại mật khẩu
              </label>
              <input
                id="auth-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setField("confirm", e.target.value)}
                aria-invalid={Boolean(errors.confirm)}
                aria-describedby={errors.confirm ? "auth-confirm-error" : undefined}
                className={inputClass}
              />
              {errors.confirm && (
                <p id="auth-confirm-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.confirm}
                </p>
              )}
            </div>
          )}

          {apiError && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {apiError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-espresso py-3 font-semibold text-cream hover:bg-caramel-dark disabled:opacity-60"
          >
            {busy ? "Đang xử lý…" : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>

        <p className="text-center text-sm text-muted">
          {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
          <Link href={isLogin ? "/register" : "/login"} className="font-semibold text-caramel-dark underline">
            {isLogin ? "Đăng ký" : "Đăng nhập"}
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link href="/" className="text-muted underline hover:text-espresso">
            Tiếp tục với tư cách khách
          </Link>
        </p>
      </main>
    </div>
  );
}
