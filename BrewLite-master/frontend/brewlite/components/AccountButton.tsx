"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";

/** Nút tài khoản ở header menu: khách -> link đăng nhập; đã đăng nhập -> email + đăng xuất. */
export function AccountButton() {
  const { session, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!ready) return <span aria-hidden className="size-11" />;

  if (!session) {
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Tài khoản ${session.email}`}
        className="flex size-11 items-center justify-center rounded-full bg-caramel text-base font-bold text-white hover:bg-caramel-dark"
      >
        {session.email.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-line bg-surface p-3 text-espresso shadow-lg">
          <p className="truncate text-sm font-semibold">{session.email}</p>
          <button
            type="button"
            onClick={() => {
              logout();
              setOpen(false);
            }}
            className="mt-2 w-full rounded-full border border-line py-2 text-sm font-medium hover:bg-cream"
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
