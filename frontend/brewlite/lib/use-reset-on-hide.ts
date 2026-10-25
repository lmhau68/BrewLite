"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * `useLayoutEffect` không làm gì khi render ở server (và React sẽ cảnh báo),
 * nên chỉ dùng bản layout effect ở phía client.
 */
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Next.js 16 (cacheComponents) giữ page cũ trong DOM bằng React <Activity> thay vì
 * unmount, nên state của client component vẫn còn nguyên khi quay lại trang.
 *
 * Hook này gọi `reset` đúng lúc page bị ẩn (hoặc component bị unmount) để lần sau
 * quay lại trang luôn bắt đầu từ trạng thái sạch. Hợp với các luồng "mỗi lần vào
 * trang là một lần làm việc mới", ví dụ đặt đơn.
 */
export function useResetOnHide(reset: () => void) {
  const latest = useRef(reset);

  // Luôn giữ phiên bản mới nhất của reset mà không phụ thuộc vào định danh hàm.
  useIsomorphicLayoutEffect(() => {
    latest.current = reset;
  });

  useIsomorphicLayoutEffect(
    () => () => {
      latest.current();
    },
    [],
  );
}
