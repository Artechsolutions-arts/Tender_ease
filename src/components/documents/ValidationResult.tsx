import { CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Brain, RefreshCw, ScanText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { VendorDocument, DocFinding } from "@/types/documents";
import { RATING_CONFIG, STATUS_CONFIG } from "@/types/documents";
import { useRetryDocument } from "@/hooks/useDocuments";
import { useToast } from "@/hooks/use-toast";

interface Props {
  doc: VendorDocument;
  showRetry?: boolean;
}

function FindingRow({ f }: { f: DocFinding }) {
  const Icon =
    f.status === "Pass" ? CheckCircle2 :
    f.status === "Fail" ? XCircle :
    AlertTriangle;

  const color =
    f.status === "Pass" ? "text-emerald-600" :
    f.status === "Fail" ? "text-red-600" :
    "text-amber-600";

  return (
    <div className="flex gap-3 py-2">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
      <div>
        <p className="text-xs font-semibold text-gray-700">{f.category}</p>
        <p className="text-xs text-gray-500">{f.detail}</p>
      </div>
    </div>
  );
}

export function ValidationResult({ doc, showRetry = false }: Props) {
  const { toast } = useToast();
  const retry = useRetryDocument();
  const v = doc.validation;

  // Still processing
  if (doc.ocrStatus === "PENDING" || doc.ocrStatus === "PROCESSING" || !v) {
    const isProcessing = doc.ocrStatus === "PROCESSING";
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-gray-500">
        <Brain className={`h-10 w-10 ${isProcessing ? "animate-pulse text-blue-500" : "text-gray-400"}`} />
        <p className="font-medium">{isProcessing ? "Running OCR & AI validation…" : "Queued for processing"}</p>
        <p className="text-xs">This usually takes 10–30 seconds. The page auto-refreshes.</p>
      </div>
    );
  }

  // OCR failed
  if (doc.ocrStatus === "FAILED") {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <XCircle className="h-10 w-10 text-red-500" />
        <p className="font-medium text-red-700">OCR Failed</p>
        <p className="text-xs text-gray-500 max-w-xs">{doc.ocrError || "Unknown error during text extraction."}</p>
        {showRetry && (
          <Button
            size="sm" variant="outline"
            onClick={() => retry.mutateAsync(doc.id).then(() => toast({ title: "Reprocessing started." }))}
            disabled={retry.isPending}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </div>
    );
  }

  const rating = RATING_CONFIG[v.aiRating];
  const status = STATUS_CONFIG[v.status];
  const scoreColor =
    v.aiScore >= 90 ? "bg-emerald-500" :
    v.aiScore >= 75 ? "bg-blue-500" :
    v.aiScore >= 60 ? "bg-amber-400" :
    v.aiScore >= 40 ? "bg-orange-400" :
    "bg-red-500";

  const findings = Array.isArray(v.aiFindings) ? v.aiFindings as DocFinding[] : [];
  const passes = findings.filter((f) => f.status === "Pass").length;
  const fails = findings.filter((f) => f.status === "Fail").length;
  const warnings = findings.filter((f) => f.status === "Warning").length;

  return (
    <div className="space-y-4">
      {/* Score & rating header */}
      <div className={`rounded-xl border p-4 ${rating.bg}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-3xl font-bold ${rating.color}`}>{v.aiScore}</span>
              <span className={`text-sm font-medium ${rating.color}`}>/ 100</span>
              {v.aiFlagged && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full ml-1">
                  <ShieldAlert className="h-3 w-3" /> Flagged
                </span>
              )}
            </div>
            <Progress value={v.aiScore} className={`h-2 [&>div]:${scoreColor}`} />
          </div>
          <div className="text-right shrink-0">
            <p className={`text-sm font-bold ${rating.color}`}>{rating.label}</p>
            <p className={`text-xs font-medium mt-0.5 ${status.color}`}>{status.label}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-700">{v.aiSummary}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2">
          <p className="font-bold text-emerald-700 text-base">{passes}</p>
          <p className="text-emerald-600">Passed</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-2">
          <p className="font-bold text-amber-700 text-base">{warnings}</p>
          <p className="text-amber-600">Warnings</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-100 p-2">
          <p className="font-bold text-red-700 text-base">{fails}</p>
          <p className="text-red-600">Failed</p>
        </div>
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">AI Findings</p>
            <div className="divide-y">
              {findings.map((f, i) => <FindingRow key={i} f={f} />)}
            </div>
          </div>
        </>
      )}

      {/* Extracted fields */}
      {v.aiExtractedFields && Object.keys(v.aiExtractedFields).length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ScanText className="h-3.5 w-3.5" />
              Extracted Fields
              {v.aiDetectedType && (
                <span className="ml-1 font-normal normal-case text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 text-[10px]">
                  {v.aiDetectedType}
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {Object.entries(v.aiExtractedFields)
                .filter(([, val]) => val !== null && val !== "" && val !== undefined)
                .map(([key, val]) => (
                  <div key={key} className="min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide truncate">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Officer decision */}
      {v.officerDecision && (
        <>
          <Separator />
          <div className="text-sm space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Officer Decision</p>
            <p className={`font-semibold ${status.color}`}>{status.label}</p>
            {v.officerRemarks && <p className="text-gray-600 text-xs">{v.officerRemarks}</p>}
            {v.officerUser && (
              <p className="text-xs text-gray-400">
                Reviewed by {v.officerUser.name} · {v.officerReviewedAt ? new Date(v.officerReviewedAt).toLocaleDateString("en-IN") : ""}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
