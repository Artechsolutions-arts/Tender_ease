import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Vendor, PendingVendor } from "@/store/admin-store";

const KEYS = {
  all: ["vendors"] as const,
  list: (params?: Record<string, string>) => ["vendors", "list", params] as const,
  pending: ["vendors", "pending"] as const,
  detail: (id: string) => ["vendors", id] as const,
};

function getAdminStore() {
  try {
    const { useAdmin } = require("@/store/admin-store");
    return useAdmin();
  } catch {
    return null;
  }
}

export function useVendors(params?: { category?: string; blacklisted?: string; search?: string }) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      try {
        const res = await apiClient.get<Vendor[]>("/vendors", { params });
        return res.data;
      } catch {
        return [] as Vendor[];
      }
    },
  });
}

export function usePendingVendors() {
  return useQuery({
    queryKey: KEYS.pending,
    queryFn: async () => {
      try {
        const res = await apiClient.get<PendingVendor[]>("/vendors/pending");
        return res.data;
      } catch {
        return [] as PendingVendor[];
      }
    },
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<Vendor>(`/vendors/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useApproveVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/vendors/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.pending });
    },
  });
}

export function useRejectVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/vendors/${id}/reject`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.pending }),
  });
}
