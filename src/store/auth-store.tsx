import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { apiClient, saveTokens, clearTokens } from "@/lib/api";

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
  registerVendor: (account: { company: string; contact: string; phone: string; email: string; password: string }) => Promise<void>;
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
    localStorage.removeItem("currentUser");
    try {
      const saved = sessionStorage.getItem("currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem("currentUser");
    }
  }, [currentUser]);

  const login = useCallback(async (email: string, password: string): Promise<DemoUser | null> => {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; user: any }>("/auth/login", { email, password });
    const { accessToken, refreshToken, user } = res.data;
    saveTokens(accessToken, refreshToken);
    sessionStorage.setItem("lastLoginAt", new Date().toISOString());
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
    const refreshToken = sessionStorage.getItem("refreshToken");
    if (refreshToken) {
      apiClient.post("/auth/logout", { refreshToken }).catch(() => {});
    }
    clearTokens();
    setCurrentUser(null);
  }, []);

  const registerVendor = useCallback(async (account: { company: string; contact: string; phone: string; email: string; password: string }) => {
    const res = await apiClient.post<{ accessToken: string; refreshToken: string; user: any }>("/auth/register-vendor", {
      company: account.company,
      contact: account.contact,
      phone: account.phone,
      email: account.email,
      password: account.password,
    });
    const { accessToken, refreshToken, user } = res.data;
    saveTokens(accessToken, refreshToken);
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
    apiClient.patch("/auth/verification-step", { step: `STEP_${step}` }).catch(() => {});
  }, [currentUser]);

  const submitVerification = useCallback(() => {
    if (!currentUser) return;
    setCurrentUser({ ...currentUser, isVerificationPending: true, verificationStep: 5 });
    apiClient.patch("/auth/verification-step", { step: "COMPLETED" }).catch(() => {});
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
