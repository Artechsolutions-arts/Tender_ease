import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// ── API base URL ──────────────────────────────────────────────────────────────
// In production, VITE_API_URL must be set. A missing env var is a deployment bug,
// so we warn loudly in the console rather than silently using a broken default.
const BASE_URL: string = (import.meta as any).env?.VITE_API_URL ?? "";
if (!BASE_URL) {
  console.warn(
    "[AP e-Procurement] VITE_API_URL is not set. " +
    "API calls will fail. Set this variable in your .env file."
  );
}
const RESOLVED_BASE = BASE_URL || "http://localhost:8000/api";

// ── Token storage ─────────────────────────────────────────────────────────────
// Tokens are stored in sessionStorage (cleared on browser close, not persistent
// across tabs). httpOnly cookies are set by the server simultaneously and are
// the primary auth mechanism — sessionStorage is the client-side fallback for
// SPA routing that needs to know the current user role.
const store = {
  get: (key: string) => sessionStorage.getItem(key),
  set: (key: string, val: string) => sessionStorage.setItem(key, val),
  del: (key: string) => sessionStorage.removeItem(key),
  clear: () => { sessionStorage.removeItem("accessToken"); sessionStorage.removeItem("refreshToken"); },
};

export const apiClient = axios.create({
  baseURL: RESOLVED_BASE,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  // withCredentials sends httpOnly cookies set by the backend on every request
  withCredentials: true,
});

// Attach JWT to every request (complements the httpOnly cookie)
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.get("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Token refresh on 401 ──────────────────────────────────────────────────────
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = store.get("refreshToken");
  if (!refreshToken) return null;
  try {
    const res = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${RESOLVED_BASE}/auth/refresh`,
      { refreshToken },
      { withCredentials: true },
    );
    store.set("accessToken", res.data.accessToken);
    store.set("refreshToken", res.data.refreshToken);
    return res.data.accessToken;
  } catch {
    store.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const hadToken = !!store.get("accessToken");
    if (error.response?.status === 401 && !original._retry && hadToken) {
      original._retry = true;
      if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth helpers used by Login page ──────────────────────────────────────────
export function saveTokens(accessToken: string, refreshToken: string) {
  store.set("accessToken", accessToken);
  store.set("refreshToken", refreshToken);
}

export function clearTokens() {
  store.clear();
}

export function getAccessToken(): string | null {
  return store.get("accessToken");
}

// ── File URL helpers ──────────────────────────────────────────────────────────
export const BACKEND_ROOT: string = RESOLVED_BASE.replace(/\/api\/?$/, "");

export function getUploadUrl(fileName: string): string {
  return `${BACKEND_ROOT}/uploads/${encodeURIComponent(fileName)}`;
}

export default apiClient;
