"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { login as apiLogin, register as apiRegister } from "@/lib/api";
import { readSession, writeSession } from "@/lib/auth";
import type { AuthSession } from "@/lib/types";

interface AuthContextValue {
  session: AuthSession | null;
  /** false cho tới khi đã đọc xong localStorage (tránh nháy giao diện / gọi API sai ngữ cảnh) */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

/** Mặc định khi không có provider: coi như khách (giúp test component riêng lẻ). */
const GUEST: AuthContextValue = {
  session: null,
  ready: true,
  login: async () => {
    throw new Error("AuthProvider chưa được gắn");
  },
  register: async () => {
    throw new Error("AuthProvider chưa được gắn");
  },
  logout: () => {},
};

const AuthContext = createContext<AuthContextValue>(GUEST);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  // Nạp phiên đã lưu sau khi mount (tránh lệch hydration)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc localStorage chỉ có ở client
    setSession(readSession());
    setReady(true);
  }, []);

  // Đồng bộ giữa các tab: đăng xuất/đăng nhập ở tab khác
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "brewlite.auth.v1") setSession(readSession());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const finish = useCallback((next: AuthSession) => {
    writeSession(next);
    setSession(next);
  }, []);

  const login = useCallback(async (email: string, password: string) => finish(await apiLogin(email, password)), [finish]);
  const register = useCallback(
    async (email: string, password: string) => finish(await apiRegister(email, password)),
    [finish],
  );
  const logout = useCallback(() => {
    writeSession(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, ready, login, register, logout }), [session, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
