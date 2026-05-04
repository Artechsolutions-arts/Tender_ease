import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

export type UserRole = "admin" | "vendor";

export interface DemoUser {
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  vendorId?: string;
  isVerificationPending?: boolean;
  verificationStep?: 1 | 2 | 3 | 4 | 5;
}

interface AuthCtx {
  currentUser: DemoUser | null;
  login: (email: string, password: string) => Promise<DemoUser | null>;
  logout: () => void;
  registerVendor: (account: { email: string; password: string; name: string; organization: string }) => Promise<void>;
  updateVerificationStep: (step: number) => void;
  submitVerification: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function mapApiRole(role: string): UserRole {
  return role === "ADMIN" ? "admin" : "vendor";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(() => {
    localStorage.removeItem("demoAccounts");
    try {
      const saved = localStorage.getItem("currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  const login = useCallback(async (email: string, password: string): Promise<DemoUser | null> => {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; user: any }>("/auth/login", { email, password });
    const { accessToken, refreshToken, user } = res.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("lastLoginAt", new Date().toISOString());
    const mapped: DemoUser = {
      email: user.email,
      name: user.name,
      role: mapApiRole(user.role),
      organization: user.organization,
      vendorId: user.vendorId ?? undefined,
      isVerificationPending: !user.isVerified,
      verificationStep: user.verificationStep === "COMPLETED" ? 5 : (user.verificationStep ? Number(user.verificationStep.replace("STEP_", "")) as 1 | 2 | 3 | 4 | 5 : undefined),
    };
    setCurrentUser(mapped);
    return mapped;
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (refreshToken) {
      apiClient.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setCurrentUser(null);
  }, []);

  const registerVendor = useCallback(async (account: { email: string; password: string; name: string; organization: string }) => {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; user: any }>("/auth/register-vendor", {
      email: account.email,
      password: account.password,
      name: account.name,
      organization: account.organization,
    });
    const { accessToken, refreshToken, user } = res.data;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setCurrentUser({
      email: user.email,
      name: user.name,
      role: "vendor",
      organization: user.organization,
      vendorId: user.vendorId,
      isVerificationPending: true,
      verificationStep: 1,
    });
  }, []);

  const updateVerificationStep = useCallback((step: number) => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, verificationStep: step as 1 | 2 | 3 | 4 | 5 });
    apiClient.patch("/auth/verification-step", { step }).catch(() => {});
  }, [currentUser]);

  const submitVerification = useCallback(() => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, isVerificationPending: true, verificationStep: 4 });
    apiClient.patch("/auth/verification-step", { step: 4 }).catch(() => {});
  }, [currentUser]);

  return (
    <Ctx.Provider value={{ currentUser, login, logout, registerVendor, updateVerificationStep, submitVerification }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
