import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AppNotification } from "@/store/admin-store";

const KEYS = {
  all: ["notifications"] as const,
  unread: ["notifications", "unread"] as const,
};

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: KEYS.all,
    queryFn: async () => {
      try {
        const res = await apiClient.get<AppNotification[]>("/notifications");
        return res.data;
      } catch {
        return [];
      }
    },
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: KEYS.unread,
    queryFn: async () => {
      try {
        const res = await apiClient.get<{ count: number }>("/notifications/unread-count");
        return res.data.count;
      } catch {
        return 0;
      }
    },
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.patch("/notifications/read-all");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.unread });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/reports/dashboard");
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}
