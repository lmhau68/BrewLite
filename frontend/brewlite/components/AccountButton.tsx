"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";

/** Nút tài khoản ở header: "Đăng nhập" khi chưa có phiên, menu người dùng khi đã đăng nhập. */
export function AccountButton() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Đăng nhập"
        className="flex size-11 items-center justify-center rounded-full bg-cream/10 text-xl hover:bg-cream/20"
      >
        👤
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`Tài khoản ${user.email}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex size-11 items-center justify-center rounded-full bg-caramel text-lg font-bold text-white hover:bg-caramel-dark"
      >
        {user.email.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-60 rounded-2xl border border-line bg-surface p-2 text-espresso shadow-xl"
        >
          <p className="truncate px-3 py-2 text-sm text-muted" title={user.email}>
            {user.email}
          </p>
          <Link
            href="/orders"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-cream"
          >
            Đơn hàng của tôi
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
