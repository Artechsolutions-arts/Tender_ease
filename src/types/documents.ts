export type DocType =
  | "GST_CERTIFICATE"
  | "PAN_CARD"
  | "COMPANY_REGISTRATION"
  | "EXPERIENCE_CERTIFICATE"
  | "FINANCIAL_STATEMENT"
  | "BANK_GUARANTEE"
  | "BID_DOCUMENT"
  | "TENDER_DOCUMENT"
  | "OTHER";

export type OcrStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ValidationStatus =
  | "PENDING_OCR"
  | "OCR_COMPLETE"
  | "AI_REVIEWED"
  | "OFFICER_APPROVED"
  | "OFFICER_REJECTED"
  | "NEEDS_MORE_INFO";

export type OfficerDecision = "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO";

export type AiRating = "Excellent" | "Good" | "Fair" | "Poor" | "Invalid";

export interface DocFinding {
  category: string;
  status: "Pass" | "Fail" | "Warning";
  detail: string;
}

export interface DocumentValidation {
  id: string;
  documentId: string;
  aiScore: number;
  aiRating: AiRating;
  aiFindings: DocFinding[];
  aiSummary: string;
  aiFlagged: boolean;
  officerUserId?: string;
  officerUser?: { name: string; email: string };
  officerDecision?: OfficerDecision;
  officerRemarks?: string;
  officerReviewedAt?: string;
  status: ValidationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDocument {
  id: string;
  uploadedBy: string;
  uploader?: { name: string; email: string };
  vendorId?: string;
  tenderId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  docType: DocType;
  ocrText?: string;
  ocrStatus: OcrStatus;
  ocrError?: string;
  validation?: DocumentValidation;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentsResponse {
  docs: VendorDocument[];
  total: number;
  page: number;
  limit: number;
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  GST_CERTIFICATE: "GST Certificate",
  PAN_CARD: "PAN Card",
  COMPANY_REGISTRATION: "Company Registration",
  EXPERIENCE_CERTIFICATE: "Experience Certificate",
  FINANCIAL_STATEMENT: "Financial Statement",
  BANK_GUARANTEE: "Bank Guarantee",
  BID_DOCUMENT: "Bid Document",
  TENDER_DOCUMENT: "Tender Document",
  OTHER: "Other",
};

export const RATING_CONFIG: Record<AiRating, { color: string; bg: string; label: string }> = {
  Excellent: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "Excellent" },
  Good: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", label: "Good" },
  Fair: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Fair" },
  Poor: { color: "text-orange-700", bg: "bg-orange-50 border-orange-200", label: "Poor" },
  Invalid: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Invalid / Rejected" },
};

export const STATUS_CONFIG: Record<ValidationStatus, { label: string; color: string }> = {
  PENDING_OCR: { label: "Pending OCR", color: "text-gray-500" },
  OCR_COMPLETE: { label: "OCR Complete", color: "text-blue-500" },
  AI_REVIEWED: { label: "AI Reviewed", color: "text-purple-600" },
  OFFICER_APPROVED: { label: "Approved", color: "text-emerald-600" },
  OFFICER_REJECTED: { label: "Rejected", color: "text-red-600" },
  NEEDS_MORE_INFO: { label: "Needs Info", color: "text-amber-600" },
};
