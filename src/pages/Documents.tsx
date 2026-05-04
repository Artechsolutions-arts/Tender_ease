import { useState } from "react";
import { FileText, Upload, Search, Filter, RefreshCw, ShieldAlert, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useT } from "@/lib/useT";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { ValidationResult } from "@/components/documents/ValidationResult";
import { OfficerReviewPanel } from "@/components/documents/OfficerReviewPanel";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAuth } from "@/store/auth-store";
import { DOC_TYPE_LABELS, RATING_CONFIG, STATUS_CONFIG, type ValidationStatus, type VendorDocument } from "@/types/documents";

function ocrBadge(status: string) {
  if (status === "COMPLETED") return null;
  if (status === "PROCESSING") return (
    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
      <RefreshCw className="h-3 w-3 animate-spin" /> OCR running
    </span>
  );
  if (status === "FAILED") return (
    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">OCR failed</span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" /> Queued
    </span>
  );
}

function ScorePill({ score, rating }: { score: number; rating: string }) {
  const cfg = RATING_CONFIG[rating as keyof typeof RATING_CONFIG];
  if (!cfg) return null;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      {score} · {cfg.label}
    </span>
  );
}

function StatusIcon({ status }: { status: ValidationStatus }) {
  if (status === "OFFICER_APPROVED") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "OFFICER_REJECTED") return <XCircle className="h-4 w-4 text-red-600" />;
  return null;
}

export default function Documents() {
  const { currentUser } = useAuth();
  const T = useT();
  const isAdmin = currentUser?.role === "admin";
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<VendorDocument | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data, isLoading, refetch } = useDocuments(
    statusFilter !== "ALL" ? { status: statusFilter } : {}
  );

  const docs = (data?.docs ?? []).filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.originalName.toLowerCase().includes(q) || d.docType.toLowerCase().includes(q);
  });

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => refetch()}>
        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
      </Button>
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-1" /> Upload Document
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document for AI Validation</DialogTitle>
          </DialogHeader>
          <DocumentUpload onSuccess={() => setUploadOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <AdminLayout
      title={T("docs_title")}
      breadcrumbs={[{ label: T("common_home"), to: isAdmin ? "/" : "/vendor-dashboard" }, { label: T("docs_title") }]}
      actions={actions}
    >
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-gray-500">
        Upload vendor documents for AI-powered OCR analysis and rating. Verification officers can approve, reject, or request additional information.
      </p>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by file name or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isAdmin && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-52">
              <Filter className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {(Object.entries(STATUS_CONFIG) as [ValidationStatus, { label: string; color: string }][]).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Stats row (admin only) */}
      {isAdmin && data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: data.total, color: "text-gray-700" },
            { label: "AI Reviewed", value: data.docs.filter((d) => d.validation?.status === "AI_REVIEWED").length, color: "text-purple-600" },
            { label: "Approved", value: data.docs.filter((d) => d.validation?.status === "OFFICER_APPROVED").length, color: "text-emerald-600" },
            { label: "Flagged", value: data.docs.filter((d) => d.validation?.aiFlagged).length, color: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-white p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading documents…</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 space-y-2">
          <FileText className="h-12 w-12 mx-auto opacity-30" />
          <p>No documents found.</p>
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Upload your first document
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">File</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">AI Score</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Uploaded</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {doc.validation?.aiFlagged && <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />}
                      <div>
                        <p className="font-medium text-gray-800 max-w-[200px] truncate">{doc.originalName}</p>
                        <p className="text-xs text-gray-400">{(doc.fileSize / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                  </td>
                  <td className="px-4 py-3">
                    {doc.validation ? (
                      <ScorePill score={doc.validation.aiScore} rating={doc.validation.aiRating} />
                    ) : (
                      ocrBadge(doc.ocrStatus)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {doc.validation && <StatusIcon status={doc.validation.status} />}
                      <span className={`text-xs font-medium ${doc.validation ? STATUS_CONFIG[doc.validation.status]?.color : "text-gray-400"}`}>
                        {doc.validation ? STATUS_CONFIG[doc.validation.status]?.label : "Processing"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(doc.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!selectedDoc} onOpenChange={(o) => !o && setSelectedDoc(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedDoc && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-blue-600" />
                  {selectedDoc.originalName}
                </SheetTitle>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span>{DOC_TYPE_LABELS[selectedDoc.docType]}</span>
                  <span>·</span>
                  <span>{(selectedDoc.fileSize / 1024).toFixed(0)} KB</span>
                  {selectedDoc.uploader && (
                    <><span>·</span><span>by {selectedDoc.uploader.name}</span></>
                  )}
                </div>
              </SheetHeader>

              <ValidationResult doc={selectedDoc} showRetry={isAdmin} />

              {isAdmin && selectedDoc.validation && (
                <>
                  <Separator className="my-4" />
                  <OfficerReviewPanel
                    doc={selectedDoc}
                    onDone={() => setSelectedDoc(null)}
                  />
                </>
              )}

              {selectedDoc.ocrText && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">OCR Extracted Text</p>
                    <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                      {selectedDoc.ocrText.slice(0, 2000)}
                      {selectedDoc.ocrText.length > 2000 && "\n\n[truncated…]"}
                    </pre>
                  </div>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
    </AdminLayout>
  );
}
