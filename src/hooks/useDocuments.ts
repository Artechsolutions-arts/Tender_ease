import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api";
import type { VendorDocument, DocumentsResponse } from "@/types/documents";

export function useDocuments(params?: { vendorId?: string; status?: string; page?: number }) {
  return useQuery<DocumentsResponse>({
    queryKey: ["documents", params],
    queryFn: () =>
      api.get("/documents", { params: { ...params, limit: 20 } }).then((r) => r.data),
    refetchInterval: (data) => {
      // Poll while any document is still being processed
      const hasProcessing = (data as any)?.docs?.some(
        (d: VendorDocument) => d.ocrStatus === "PENDING" || d.ocrStatus === "PROCESSING"
      );
      return hasProcessing ? 4000 : false;
    },
  });
}

export function useDocument(id: string) {
  return useQuery<VendorDocument>({
    queryKey: ["document", id],
    queryFn: () => api.get(`/documents/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: (data) => {
      const d = data as VendorDocument | undefined;
      return d?.ocrStatus === "PENDING" || d?.ocrStatus === "PROCESSING" ? 3000 : false;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useReviewDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, remarks }: { id: string; decision: string; remarks?: string }) =>
      api.patch(`/documents/${id}/review`, { decision, remarks }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document", vars.id] });
    },
  });
}

export function useRetryDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post(`/documents/${id}/retry`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}
