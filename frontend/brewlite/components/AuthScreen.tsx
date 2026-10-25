"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  MIN_PASSWORD_LENGTH,
  safeNextPath,
  validateAuthForm,
  type AuthFormErrors,
} from "@/lib/auth";
import { useAuth } from "./AuthProvider";
import { SubPageHeader } from "./SubPageHeader";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted focus:border-espresso focus:outline-2 focus:outline-espresso aria-[invalid=true]:border-red-500";
const labelClass = "mb-1 block text-sm font-semibold text-espresso";

const COPY = {
  login: {
    title: "Đăng nhập",
    subtitle: "Chào mừng bạn quay lại",
    submit: "Đăng nhập",
    busy: "Đang đăng nhập…",
    switchText: "Chưa có tài khoản?",
    switchLink: "Đăng ký",
    switchHref: "/register",
  },
  register: {
    title: "Đăng ký",
    subtitle: "Tạo tài khoản để tích điểm và lưu lịch sử đơn",
    submit: "Tạo tài khoản",
    busy: "Đang tạo tài khoản…",
    switchText: "Đã có tài khoản?",
    switchLink: "Đăng nhập",
    switchHref: "/login",
  },
} as const;

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { user, login, register, logout } = useAuth();
  const copy = COPY[mode];

  const [form, setForm] = useState({ email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const nextErrors = validateAuthForm(form, mode);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setServerError("");
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.email, form.password);
      router.replace(safeNextPath(window.location.search));
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-10 shadow-xl">
      <SubPageHeader title={copy.title} subtitle={copy.subtitle} />

      <main className="flex-1 px-4 pt-6">
        {user ? (
          <div role="status" className="flex flex-col items-center gap-3 py-10 text-center">
            <span aria-hidden className="text-5xl">✅</span>
            <p className="font-semibold text-espresso">Bạn đang đăng nhập</p>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="mt-2 flex gap-2">
              <Link
                href="/"
                className="rounded-full bg-espresso px-5 py-2.5 text-sm font-medium text-cream hover:bg-caramel-dark"
              >
                Về menu
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-espresso px-5 py-2.5 text-sm font-medium text-espresso hover:bg-espresso hover:text-cream"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="text-center">
              <span aria-hidden className="text-5xl">☕</span>
            </div>

            {serverError && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </p>
            )}

            <div>
              <label htmlFor="auth-email" className={labelClass}>Email</label>
              <input
                id="auth-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "auth-email-error" : undefined}
                placeholder="ban@example.com"
                className={inputClass}
              />
              {errors.email && (
                <p id="auth-email-error" className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="auth-password" className={labelClass}>Mật khẩu</label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "auth-password-error" : undefined}
                  placeholder={mode === "register" ? `Ít nhất ${MIN_PASSWORD_LENGTH} ký tự` : "Mật khẩu"}
                  className={`${inputClass} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute inset-y-0 right-2 px-2 text-xs font-medium text-muted hover:text-espresso"
                >
                  {showPassword ? "Ẩn" : "Hiện"}
                </button>
              </div>
              {errors.password && (
                <p id="auth-password-error" className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="auth-confirm" className={labelClass}>Nhập lại mật khẩu</label>
                <input
                  id="auth-confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => setField("confirm", e.target.value)}
                  aria-invalid={Boolean(errors.confirm)}
                  aria-describedby={errors.confirm ? "auth-confirm-error" : undefined}
                  className={inputClass}
                />
                {errors.confirm && (
                  <p id="auth-confirm-error" className="mt-1 text-xs text-red-600">{errors.confirm}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-espresso py-3 font-semibold text-cream hover:bg-caramel-dark disabled:opacity-60"
            >
              {busy ? copy.busy : copy.submit}
            </button>

            <p className="text-center text-sm text-muted">
              {copy.switchText}{" "}
              <Link
                href={`${copy.switchHref}${typeof window !== "undefined" ? window.location.search : ""}`}
                className="font-semibold text-caramel-dark underline"
              >
                {copy.switchLink}
              </Link>
            </p>
            <p className="text-center text-sm">
              <Link href="/" className="text-muted underline hover:text-espresso">
                Tiếp tục mà không đăng nhập
              </Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}
