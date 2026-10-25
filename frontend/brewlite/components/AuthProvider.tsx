"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  clearToken,
  getToken,
  loginRequest,
  registerRequest,
  saveToken,
  subscribeAuth,
  userFromToken,
  type AuthUser,
} from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  /** Đăng ký rồi tự đăng nhập */
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // localStorage là nguồn sự thật; server render luôn là "chưa đăng nhập"
  const token = useSyncExternalStore(subscribeAuth, getToken, () => null);
  const user = useMemo(() => userFromToken(token), [token]);

  const login = useCallback(async (email: string, password: string) => {
    saveToken(await loginRequest(email.trim(), password));
  }, []);

  const register = useCallback(
    async (email: string, password: string) => {
      await registerRequest(email.trim(), password);
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => clearToken(), []);

  const value = useMemo(() => ({ user, login, register, logout }), [user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  return ctx;
}
