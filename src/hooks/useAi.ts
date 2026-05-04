import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { TenderValidationResult, BidAnalysisResult, ComplianceCheckResult, ProcurementInsights } from "@/types/ai";

export function useAiInsights(enabled = true, refresh = false) {
  return useQuery<ProcurementInsights>({
    queryKey: ["ai", "insights", refresh],
    queryFn: async () => {
      const res = await apiClient.get("/ai/insights", { params: refresh ? { refresh: "1" } : undefined });
      return res.data;
    },
    staleTime: 3_600_000,
    enabled,
    retry: 1,
  });
}

export function useComplianceCheck(enabled = true) {
  return useQuery<ComplianceCheckResult>({
    queryKey: ["ai", "compliance"],
    queryFn: async () => {
      const res = await apiClient.get("/ai/compliance-check");
      return res.data;
    },
    staleTime: 3_600_000,
    enabled,
    retry: 1,
  });
}

export function useValidateTender() {
  return useMutation<TenderValidationResult, Error, string>({
    mutationFn: async (tenderId: string) => {
      const res = await apiClient.post<TenderValidationResult>(`/ai/validate-tender/${tenderId}`);
      return res.data;
    },
  });
}

export function useAnalyzeBids() {
  return useMutation<BidAnalysisResult, Error, string>({
    mutationFn: async (tenderId: string) => {
      const res = await apiClient.post<BidAnalysisResult>(`/ai/analyze-bids/${tenderId}`);
      return res.data;
    },
  });
}

export function useTenderValidations(tenderId: string) {
  return useQuery({
    queryKey: ["ai", "validations", tenderId],
    queryFn: async () => {
      const res = await apiClient.get(`/ai/tender-validations/${tenderId}`);
      return res.data;
    },
    enabled: Boolean(tenderId),
  });
}
