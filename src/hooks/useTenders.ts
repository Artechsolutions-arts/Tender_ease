import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Tender, TenderStatus } from "@/store/admin-store";
import { useAdmin } from "@/store/admin-store";

const KEYS = {
  all: ["tenders"] as const,
  list: (params?: Record<string, string>) => ["tenders", "list", params] as const,
  detail: (id: string) => ["tenders", id] as const,
};

function useAdminFallback() {
  try {
    return useAdmin();
  } catch {
    return null;
  }
}

export function useTenders(params?: { status?: string; category?: string; search?: string }) {
  const adminStore = useAdminFallback();

  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async () => {
      try {
        const res = await apiClient.get<Tender[]>("/tenders", { params });
        return res.data;
      } catch {
        return adminStore?.tenders ?? [];
      }
    },
  });
}

export function useTender(id: string) {
  const adminStore = useAdminFallback();

  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      try {
        const res = await apiClient.get<Tender>(`/tenders/${id}`);
        return res.data;
      } catch {
        return adminStore?.tenders.find((t) => t.id === id) ?? null;
      }
    },
    enabled: Boolean(id),
  });
}

export function useCreateTender() {
  const qc = useQueryClient();
  const adminStore = useAdminFallback();

  return useMutation({
    mutationFn: async (data: Omit<Tender, "id" | "createdAt" | "history" | "status">) => {
      try {
        const res = await apiClient.post<Tender>("/tenders", data);
        return res.data;
      } catch {
        return adminStore?.createTender(data) ?? null;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateTender() {
  const qc = useQueryClient();
  const adminStore = useAdminFallback();

  return useMutation({
    mutationFn: async ({ id, patch, changes }: { id: string; patch: Partial<Tender>; changes: string }) => {
      try {
        const res = await apiClient.put<Tender>(`/tenders/${id}`, { ...patch, changes });
        return res.data;
      } catch {
        adminStore?.updateTender(id, patch, changes);
        return null;
      }
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
    },
  });
}

export function useChangeTenderStatus() {
  const qc = useQueryClient();
  const adminStore = useAdminFallback();

  return useMutation({
    mutationFn: async ({ id, status, awardedVendorId }: { id: string; status: TenderStatus; awardedVendorId?: string }) => {
      try {
        const res = await apiClient.patch<Tender>(`/tenders/${id}/status`, { status, awardedVendorId });
        return res.data;
      } catch {
        adminStore?.changeStatus(id, status, awardedVendorId);
        return null;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteTender() {
  const qc = useQueryClient();
  const adminStore = useAdminFallback();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(`/tenders/${id}`);
      } catch {
        adminStore?.deleteTender(id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useValidateTender() {
  return useMutation({
    mutationFn: async (tenderId: string) => {
      const res = await apiClient.post(`/ai/validate-tender/${tenderId}`);
      return res.data;
    },
  });
}

export function useAnalyzeBids() {
  return useMutation({
    mutationFn: async (tenderId: string) => {
      const res = await apiClient.post(`/ai/analyze-bids/${tenderId}`);
      return res.data;
    },
  });
}
