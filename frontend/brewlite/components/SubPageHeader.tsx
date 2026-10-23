"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  /** Đường dẫn quay lại, mặc định về trang menu */
  backHref?: "/" | "/checkout" | "/orders";
  backLabel?: string;
  action?: ReactNode;
}

/** Header dùng chung cho các trang phụ: checkout, lịch sử đơn, chi tiết đơn. */
export function SubPageHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Quay lại menu",
  action,
}: Props) {
  return (
    <header className="sticky top-0 z-30 bg-espresso px-4 pt-5 pb-4 text-cream">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream/10 text-lg hover:bg-cream/20"
          >
            ←
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">{title}</h1>
            {subtitle && <p className="truncate text-xs text-caramel-light">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </header>
  );
}