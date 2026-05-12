import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fmtDate, fmtINR } from "@/store/admin-store";
import { useAuth } from "@/store/auth-store";
import {
  AlertTriangle, CalendarClock, CheckCircle2, Clock, Download,
  FileCheck2, FileText, Send, ShieldCheck, TrendingUp, Wallet,
  ArrowRight, UserCheck, ShieldAlert, RefreshCw, Award, XCircle,
  Upload, Brain, Eye, Trash2,
} from "lucide-react";
import { apiClient as api } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/lib/useT";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { ValidationResult } from "@/components/documents/ValidationResult";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DOC_TYPE_LABELS, RATING_CONFIG, STATUS_CONFIG,
  type VendorDocument as ApiVendorDoc,
} from "@/types/documents";

// ── Types ──────────────────────────────────────────────────────────────────────
interface VendorProfile {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  gst: string;
  pan: string;
  registeredOn: string;
  pastPerformance: number;
  completedTenders: number;
  blacklisted: boolean;
}

interface Tender {
  id: string;
  name: string;
  description?: string;
  department: string;
  category: string;
  estimatedValue: number;
  endDate: string;
  startDate: string;
  status: string;
  awardedVendorId?: string;
  eligibleVendorIds: string[];
  eligibleVendorCount?: number;
  documents?: { id: string; name: string; url?: string; size?: string }[];
}

interface Bid {
  id: string;
  tenderId: string;
  vendorId: string;
  amount: number;
  notes: string;
  status: string;
  submittedAt: string;
}

// ── Status badge helper ────────────────────────────────────────────────────────
function BidStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Awarded:       "bg-success text-success-foreground",
    Submitted:     "bg-primary text-primary-foreground",
    "Under Review":"bg-info text-info-foreground",
    Rejected:      "bg-destructive text-destructive-foreground",
  };
  return (
    <Badge className={`rounded-sm text-[11px] ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </Badge>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────────────────────
function TableSkeleton({ cols, rows = 3 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function VendorDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const T = useT();

  const [bidOpen, setBidOpen] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidNotes, setBidNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [detailTenderId, setDetailTenderId] = useState<string | null>(null);
  const [selectedApiDoc, setSelectedApiDoc] = useState<ApiVendorDoc | null>(null);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [docCardFilter, setDocCardFilter] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<ApiVendorDoc | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [tenderStatusFilter, setTenderStatusFilter] = useState<string | null>(null);
  const tendersRef = useRef<HTMLDivElement>(null);
  const bidsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Vendor Dashboard — AP Tender";
  }, []);

  useEffect(() => {
    if (searchParams.get("profile") === "open") {
      setProfileOpen(true);
      setSearchParams((prev) => { prev.delete("profile"); return prev; }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const vendorId = currentUser?.vendorId ?? "";

  // ── Live data from API ───────────────────────────────────────────────────────

  const { data: vendorData, isLoading: vendorLoading } = useQuery<VendorProfile>({
    queryKey: ["vendor", vendorId],
    queryFn: async () => {
      const res = await api.get<VendorProfile>(`/vendors/${vendorId}`);
      return res.data;
    },
    enabled: Boolean(vendorId),
    staleTime: 60_000,
  });

  const { data: tendersData, isLoading: tendersLoading, isFetching: tendersFetching } = useQuery<{ tenders: Tender[] }>({
    queryKey: ["vendor-tenders"],
    queryFn: async () => {
      const res = await api.get("/tenders", { params: { limit: 100 } });
      return res.data;
    },
    staleTime: 30_000,
  });

  const { data: bidsData, isLoading: bidsLoading, isFetching: bidsFetching, refetch: refetchBids } = useQuery<{ bids: Bid[] }>({
    queryKey: ["my-bids"],
    queryFn: async () => {
      const res = await api.get("/bids", { params: { limit: 100 } });
      return res.data;
    },
    staleTime: 30_000,
  });

  const { data: tenderDetail, isLoading: detailLoading } = useQuery<Tender>({
    queryKey: ["tender-detail", detailTenderId],
    queryFn: async () => (await api.get<Tender>(`/tenders/${detailTenderId}`)).data,
    enabled: Boolean(detailTenderId),
    staleTime: 60_000,
  });

  // ── Real uploaded documents (OCR pipeline) ───────────────────────────────────
  const { data: myDocsData, isLoading: docsLoading, isFetching: docsFetching, refetch: refetchDocs } = useDocuments();
  const myDocs: ApiVendorDoc[] = myDocsData?.docs ?? [];

  async function handleDeleteDoc(docId: string) {
    setDeletingDocId(docId);
    try {
      await api.delete(`/documents/${docId}`);
      toast({ title: "Document deleted", description: "Removed from your account and storage." });
      if (selectedApiDoc?.id === docId) setSelectedApiDoc(null);
      refetchDocs();
    } catch {
      toast({ title: "Delete failed", description: "Could not delete the document. Please try again.", variant: "destructive" });
    } finally {
      setDeletingDocId(null);
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const vendor = vendorData ?? {
    id: vendorId || "—",
    companyName: currentUser?.organization || "—",
    contactPerson: currentUser?.name || "—",
    email: currentUser?.email || "—",
    phone: "—",
    category: "—",
    gst: "—",
    pan: "—",
    registeredOn: "",
    pastPerformance: 100,
    completedTenders: 0,
    blacklisted: false,
  };

  const allTenders: Tender[] = tendersData?.tenders ?? [];
  const myBids: Bid[] = bidsData?.bids ?? [];

  const eligibleTenders = useMemo(
    () => allTenders.filter((t) => t.eligibleVendorIds?.includes(vendorId)),
    [allTenders, vendorId],
  );

  const openTenders = eligibleTenders.filter((t) => t.status === "Published");
  const activeTenders = eligibleTenders.filter(
    (t) => t.status === "Published" || t.status === "Draft",
  );
  const awardedTenders = eligibleTenders.filter((t) => t.awardedVendorId === vendorId);
  const awardedValue = awardedTenders.reduce((s, t) => s + t.estimatedValue, 0);

  // Enrich bids with tender name
  const enrichedBids = useMemo(() => {
    const tenderMap = Object.fromEntries(allTenders.map((t) => [t.id, t]));
    return myBids.map((b) => ({ ...b, tenderName: tenderMap[b.tenderId]?.name ?? "—" }));
  }, [myBids, allTenders]);

  // ── Verification step progress ───────────────────────────────────────────────
  const step = (currentUser?.verificationStep && !isNaN(currentUser.verificationStep)) ? currentUser.verificationStep : 5;

  const stepStyle = (n: number) => {
    if (step > n) return "bg-success text-success-foreground";
    if (step === n) return "bg-warning text-warning-foreground animate-pulse";
    return "bg-muted text-muted-foreground";
  };
  const stepTextStyle = (n: number) => {
    if (step > n) return "text-success";
    if (step === n) return "text-warning";
    return "text-muted-foreground";
  };

  // ── Documents — derived from verification step + real uploads ────────────────
  const documents = useMemo(() => {
    if (step === 2) return [
      { name: "PAN Card",          status: "Pending Review", validTill: "—" },
      { name: "GST Registration",  status: "Pending Review", validTill: "—" },
      { name: "Business License",  status: "Pending Review", validTill: "—" },
      { name: "Identity Proof",    status: "Verified",       validTill: "Permanent" },
    ];
    if (step === 3) return [
      { name: "PAN Card",          status: "Verified",       validTill: "Permanent" },
      { name: "GST Registration",  status: "Verified",       validTill: "31 Mar 2027" },
      { name: "Financial Audits",  status: "Pending Review", validTill: "—" },
      { name: "Work Certificates", status: "Pending Review", validTill: "—" },
    ];
    return [
      { name: "PAN Card",              status: "Verified",       validTill: "Permanent" },
      { name: "GST Registration",      status: "Verified",       validTill: "31 Mar 2027" },
      { name: "Class III DSC",         status: "Expiring Soon",  validTill: "18 May 2026" },
      { name: "Solvency Certificate",  status: "Verified",       validTill: "30 Sep 2026" },
    ];
  }, [step]);

  // ── Download vendor profile ──────────────────────────────────────────────────
  const downloadProfile = () => {
    const lines = [
      `VENDOR PROFILE REPORT`,
      `Government of Andhra Pradesh — AP Tender e-Procurement Portal`,
      `=`.repeat(62),
      ``,
      `Vendor ID          : ${vendor.id}`,
      `Company Name       : ${vendor.companyName}`,
      `Contact Person     : ${vendor.contactPerson}`,
      `Email              : ${vendor.email}`,
      `Phone              : ${vendor.phone}`,
      `Category           : ${vendor.category}`,
      `GST No.            : ${vendor.gst}`,
      `PAN No.            : ${vendor.pan}`,
      `Registered On      : ${vendor.registeredOn ? fmtDate(vendor.registeredOn) : "—"}`,
      `Past Performance   : ${vendor.pastPerformance}/100`,
      `Completed Tenders  : ${vendor.completedTenders}`,
      ``,
      `ELIGIBLE TENDERS (${eligibleTenders.length})`,
      `-`.repeat(40),
      ...eligibleTenders.map(
        (t) => `${t.id}  |  ${t.name}  |  ${fmtINR(t.estimatedValue)}  |  ${t.status}  |  Deadline: ${fmtDate(t.endDate)}`,
      ),
      ``,
      `MY BID HISTORY (${enrichedBids.length})`,
      `-`.repeat(40),
      ...enrichedBids.map(
        (b) => `${b.tenderId}  |  ₹${b.amount.toLocaleString("en-IN")}  |  ${b.status}  |  Submitted: ${fmtDate(b.submittedAt)}`,
      ),
      ``,
      `Generated on: ${new Date().toLocaleString("en-IN")}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-profile-${vendor.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Profile downloaded", description: `${vendor.companyName} — profile saved as .txt` });
  };

  // ── Tender detail helpers ────────────────────────────────────────────────────
  function openDetail(tenderId: string) {
    setDetailTenderId(tenderId);
  }

  function applyFromDetail() {
    if (!tenderDetail) return;
    setDetailTenderId(null);
    setSelectedTenderId(tenderDetail.id);
    setBidOpen(true);
  }

  const alreadyBid = useMemo(
    () => myBids.some((b) => b.tenderId === detailTenderId),
    [myBids, detailTenderId],
  );

  // ── Submit bid ───────────────────────────────────────────────────────────────
  async function handleBidSubmit() {
    if (!selectedTenderId || !bidAmount) return;
    setSubmitting(true);
    try {
      await api.post("/bids", {
        tenderId: selectedTenderId,
        amount: Number(bidAmount),
        notes: bidNotes,
      });
      toast({ title: "Bid submitted successfully", description: `Your bid on ${selectedTenderId} has been recorded.` });
      setBidOpen(false);
      setSelectedTenderId("");
      setBidAmount("");
      setBidNotes("");
      refetchBids();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || "Failed to submit bid. Please try again.";
      toast({ title: "Submission Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout
      title={T("vd_title")}
      breadcrumbs={[
        { label: T("common_home"), to: "/" },
        { label: T("common_vendor_console") },
        { label: vendor.companyName },
      ]}
      actions={
        currentUser?.isVerificationPending ? null : (
          <>
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-sm bg-accent text-xs text-accent-foreground hover:bg-accent/90"
              onClick={() => setBidOpen(true)}
              disabled={openTenders.length === 0}
            >
              <Send className="h-3.5 w-3.5" /> {T("vd_submit_bid")}
            </Button>
          </>
        )
      }
    >
      {/* ── Full profile sheet ── */}
      <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-5 w-5 text-primary" /> My Profile
              </SheetTitle>
              <Button
                variant="outline" size="sm"
                className="h-8 gap-1.5 rounded-sm border-primary/40 text-xs text-primary hover:bg-secondary shrink-0"
                onClick={downloadProfile}
              >
                <Download className="h-3.5 w-3.5" /> {T("vd_download_profile")}
              </Button>
            </div>
          </SheetHeader>

          {/* Company identity */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-primary text-xl font-bold text-primary-foreground shrink-0">
              {vendor.companyName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">{vendor.companyName}</h2>
              <p className="text-xs text-muted-foreground">{vendor.id}</p>
              <Badge className={`mt-1 rounded-sm text-xs ${vendor.blacklisted ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"}`}>
                {vendor.blacklisted ? "Blacklisted" : "Active Vendor"}
              </Badge>
            </div>
          </div>

          <Separator className="mb-5" />

          {/* Registration details grid */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Company Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {[
              { label: "Company Name",   value: vendor.companyName },
              { label: "Contact Person", value: vendor.contactPerson },
              { label: "Email Address",  value: vendor.email },
              { label: "Phone Number",   value: vendor.phone },
              { label: "Category",       value: vendor.category },
              { label: "GST Number",     value: vendor.gst || "—", mono: true },
              { label: "PAN Number",     value: vendor.pan || "—", mono: true },
              { label: "Registered On",  value: vendor.registeredOn ? fmtDate(vendor.registeredOn) : "—" },
              { label: "Vendor ID",      value: vendor.id, mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="rounded-sm border border-border bg-secondary/30 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                <p className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>{value}</p>
              </div>
            ))}
          </div>

          <Separator className="mb-5" />

          {/* Performance */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Performance</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-sm border border-border bg-secondary/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Past Performance Score</p>
              <p className="text-2xl font-bold text-primary">{vendor.pastPerformance}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
              <Progress value={vendor.pastPerformance} className="h-1.5 mt-2" />
            </div>
            <div className="rounded-sm border border-border bg-secondary/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Completed Tenders</p>
              <p className="text-2xl font-bold text-primary">{vendor.completedTenders}</p>
              <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
            </div>
          </div>

          <Separator className="mb-5" />

          {/* Uploaded documents */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Uploaded Documents <span className="font-normal">({myDocs.length})</span>
          </p>
          {myDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {myDocs.map((doc) => {
                const v = doc.validation;
                const rating = v ? RATING_CONFIG[v.aiRating] : null;
                const statusCfg = v ? STATUS_CONFIG[v.status] : null;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-sm border border-border bg-secondary/20 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => { setSelectedApiDoc(doc); setProfileOpen(false); }}
                  >
                    <FileCheck2 className="h-5 w-5 shrink-0 text-primary/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.originalName}</p>
                      <p className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[doc.docType]} · {(doc.fileSize / 1024).toFixed(0)} KB · {new Date(doc.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      {rating && (
                        <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-bold border ${rating.bg} ${rating.color}`}>
                          {v!.aiScore} · {rating.label}
                        </span>
                      )}
                      {statusCfg && (
                        <p className={`text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Upload document dialog ── */}
      <Dialog open={uploadDocOpen} onOpenChange={setUploadDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Upload Document for AI Validation
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            File is uploaded to the server and sent for OCR analysis by Claude AI. Results appear in 10–30 seconds.
          </p>
          <DocumentUpload
            vendorId={vendorId || undefined}
            onSuccess={() => { setUploadDocOpen(false); refetchDocs(); }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Document detail sheet ── */}
      <Sheet open={!!selectedApiDoc} onOpenChange={(o) => !o && setSelectedApiDoc(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedApiDoc && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <FileCheck2 className="h-5 w-5 text-primary" />
                  {selectedApiDoc.originalName}
                </SheetTitle>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{DOC_TYPE_LABELS[selectedApiDoc.docType]}</span>
                  <span>·</span>
                  <span>{(selectedApiDoc.fileSize / 1024).toFixed(0)} KB</span>
                  <span>·</span>
                  <span>Uploaded {new Date(selectedApiDoc.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </SheetHeader>

              {/* Original document preview */}
              <DocumentPreview doc={selectedApiDoc} />

              <Separator className="my-4" />

              <ValidationResult doc={selectedApiDoc} showRetry={false} />

              {selectedApiDoc.ocrText && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">OCR Extracted Text</p>
                    <pre className="text-xs text-muted-foreground bg-secondary/40 rounded-sm p-3 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedApiDoc.ocrText}
                    </pre>
                  </div>
                </>
              )}

              <Separator className="my-4" />
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                disabled={deletingDocId === selectedApiDoc.id}
                onClick={() => setConfirmDeleteDoc(selectedApiDoc)}
              >
                <Trash2 className="h-4 w-4" />
                {deletingDocId === selectedApiDoc.id ? "Deleting…" : "Delete This Document"}
              </Button>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={!!confirmDeleteDoc} onOpenChange={(o) => !o && setConfirmDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDeleteDoc?.originalName}</strong> will be permanently removed from your account,
              the admin panel, and all storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteDoc) handleDeleteDoc(confirmDeleteDoc.id);
                setConfirmDeleteDoc(null);
              }}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bid submission dialog ── */}
      <Dialog open={bidOpen} onOpenChange={setBidOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> {T("vd_bid_dialog_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{T("vd_bid_select_tender")}</label>
              <select
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                value={selectedTenderId}
                onChange={(e) => setSelectedTenderId(e.target.value)}
              >
                <option value="">{T("vd_bid_choose")}</option>
                {openTenders.map((t) => (
                  <option key={t.id} value={t.id}>{t.id} · {t.name}</option>
                ))}
              </select>
              {openTenders.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">{T("vd_no_eligible")}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{T("vd_bid_amount")} (₹)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. 24500000"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{T("vd_bid_notes")}</label>
              <textarea
                className="h-20 w-full resize-none rounded-sm border border-input bg-background px-3 py-2 text-sm"
                placeholder={T("vd_bid_notes_placeholder")}
                value={bidNotes}
                onChange={(e) => setBidNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBidOpen(false)}>{T("vd_bid_cancel")}</Button>
            <Button
              onClick={handleBidSubmit}
              disabled={!selectedTenderId || !bidAmount || submitting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {submitting ? (
                <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />{T("vd_bid_submitting")}</>
              ) : T("vd_bid_submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tender detail dialog ── */}
      <Dialog open={Boolean(detailTenderId)} onOpenChange={(open) => { if (!open) setDetailTenderId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <FileText className="h-4 w-4" />
              {detailLoading ? "Loading…" : tenderDetail?.id}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : tenderDetail ? (
            <div className="space-y-5 py-2">
              {/* Title + status */}
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold text-foreground leading-snug">{tenderDetail.name}</h2>
                <Badge variant="outline" className="shrink-0 rounded-sm text-xs">{tenderDetail.status}</Badge>
              </div>

              {/* Key details grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-sm border border-border bg-secondary/30 p-4 text-sm">
                {[
                  ["Department",        tenderDetail.department],
                  ["Category",          tenderDetail.category],
                  ["Estimated Value",   fmtINR(tenderDetail.estimatedValue)],
                  ["Eligible Vendors",  String(tenderDetail.eligibleVendorCount ?? tenderDetail.eligibleVendorIds?.length ?? "—")],
                  ["Start Date",        fmtDate(tenderDetail.startDate)],
                  ["Bid Deadline",      fmtDate(tenderDetail.endDate)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-semibold text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              {tenderDetail.description && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{tenderDetail.description}</p>
                </div>
              )}

              {/* Documents */}
              {tenderDetail.documents && tenderDetail.documents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Attached Documents</p>
                  <ul className="divide-y divide-border rounded-sm border border-border">
                    {tenderDetail.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-secondary/30 transition-colors">
                        <span className="flex items-center gap-2 font-medium min-w-0">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{doc.name}</span>
                          {doc.size && <span className="text-muted-foreground shrink-0">· {doc.size}</span>}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 shrink-0 gap-1 rounded-sm px-2 text-[10px]"
                          onClick={() => {
                            if (doc.url) {
                              window.open(doc.url, "_blank", "noopener,noreferrer");
                            } else {
                              const content = `Tender Document: ${doc.name}\nTender: ${tenderDetail.name} (${tenderDetail.id})\nDepartment: ${tenderDetail.department}\nFile Size: ${doc.size || "—"}\n\nThis document is part of the AP e-Procurement tender notice.\nReference: ${tenderDetail.id}\nIssued by: ${tenderDetail.department}\nDate: ${new Date().toLocaleDateString("en-IN")}`;
                              const blob = new Blob([content], { type: "text/plain" });
                              const blobUrl = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = blobUrl;
                              a.download = doc.name.replace(/\.[^.]+$/, ".txt");
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                            }
                          }}
                        >
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Already bid notice */}
              {alreadyBid && (
                <div className="flex items-center gap-2 rounded-sm bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  You have already submitted a bid for this tender. Check Bid History for status.
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDetailTenderId(null)}>Close</Button>
            {tenderDetail?.status === "Published" && !alreadyBid && (
              <Button
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={applyFromDetail}
              >
                <Send className="mr-1.5 h-3.5 w-3.5" /> Apply for this Tender
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Verification tracker — only for pending applicants ── */}
      {currentUser?.isVerificationPending && (
        <Card className="mb-6 rounded-sm border border-border bg-card p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{T("vd_registration_tracking")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{T("vd_registration_desc")}</p>
          </div>
          <div className="relative">
            <div className="absolute top-5 left-0 w-full h-0.5 bg-muted" />
            <div className="relative z-10 flex justify-between">
              {[
                { n: 1, icon: <CheckCircle2 className="h-5 w-5" />, label: T("vd_step_signup") },
                { n: 2, icon: <UserCheck className="h-5 w-5" />,    label: T("vd_step_govt_review") },
                { n: 3, icon: <FileText className="h-5 w-5" />,     label: T("vd_step_full_profile") },
                { n: 4, icon: <ShieldAlert className="h-5 w-5" />,  label: T("vd_step_final_audit") },
              ].map(({ n, icon, label }) => (
                <div key={n} className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 shadow-sm ring-4 ring-background ${stepStyle(n)}`}>
                    {icon}
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wide ${stepTextStyle(n)}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 rounded-sm bg-primary/5 p-4 border border-primary/20">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Clock className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-bold text-primary">
                {step === 2 && "Step 2: Awaiting Preliminary Government Review"}
                {step === 3 && "Step 3: Action Required — Complete Full Profile"}
                {step === 4 && "Step 4: Final Compliance Audit in Progress"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {step === 2 && "A nodal officer will review your basic details within 24–48 hours."}
                {step === 3 && "Preliminary review passed. Please click 'Complete Profile' to upload required certificates."}
                {step === 4 && "Final security checks and document audit are in progress."}
              </p>
            </div>
            {step === 3 && (
              <Button
                size="sm"
                className="rounded-sm bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                onClick={() => navigate("/vendor-verification")}
              >
                Complete Profile <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ── Action-required banner (step 3) ── */}
      {currentUser?.isVerificationPending && step === 3 && (
        <Card className="mb-6 rounded-sm border-l-4 border-l-warning bg-warning/5 p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-warning-foreground uppercase tracking-tight">Immediate Action Required</h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
                To proceed to the next stage you must upload your <strong>Financial Audit Reports (Last 3 Years)</strong> and <strong>Class III Digital Signature Certificate (DSC)</strong>.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-sm border-warning/30 text-xs text-warning-foreground hover:bg-warning/10" onClick={() => navigate("/documents")}>
                  Upload Documents
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── Main content (only when verified) ── */}
      {!currentUser?.isVerificationPending && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">

          {/* ── Sidebar ── */}
          <aside className="space-y-4">
            {/* Profile card */}
            <Card className="rounded-sm border-border p-4 shadow-sm">
              {vendorLoading ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-primary text-sm font-bold text-primary-foreground shrink-0">
                      {vendor.companyName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-primary">{vendor.companyName}</h3>
                      <p className="text-xs text-muted-foreground">{vendor.id}</p>
                      <Badge className={`mt-2 rounded-sm ${vendor.blacklisted ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"}`}>
                        {vendor.blacklisted ? "Blacklisted" : "Active"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                    <p className="flex justify-between"><span className="text-muted-foreground">Contact</span><span className="font-medium truncate ml-2">{vendor.contactPerson}</span></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{vendor.category}</span></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">GST No.</span><span className="font-medium font-mono">{vendor.gst || "—"}</span></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">PAN No.</span><span className="font-medium font-mono">{vendor.pan || "—"}</span></p>
                    {vendor.registeredOn && (
                      <p className="flex justify-between"><span className="text-muted-foreground">Registered</span><span className="font-medium">{fmtDate(vendor.registeredOn)}</span></p>
                    )}
                  </div>
                </>
              )}
            </Card>

            {/* Compliance card */}
            <Card className="rounded-sm border-border p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">{T("vendors_compliance_check")}</h3>
              </div>
              {vendorLoading ? <Skeleton className="h-4 w-full" /> : (
                <>
                  <Progress value={vendor.pastPerformance} className="h-2" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Performance Score: <span className="font-bold text-primary">{vendor.pastPerformance}/100</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Completed Tenders: <span className="font-bold text-primary">{vendor.completedTenders}</span>
                  </p>
                </>
              )}
              <div className="mt-3 rounded-sm bg-warning/10 p-2 text-xs text-warning">
                <AlertTriangle className="mr-1 inline h-3 w-3" /> DSC renewal due within 30 days.
              </div>
            </Card>

            {/* Documents card */}
            <Card className="rounded-sm border-border shadow-sm">
              <div className="border-b border-border bg-secondary/50 px-4 py-3">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
                  <FileCheck2 className="h-4 w-4" /> {T("vd_documents")}
                </h3>
              </div>
              <div className="divide-y divide-border">
                {documents.map((d) => (
                  <div key={d.name} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{d.name}</p>
                      <p className="text-muted-foreground">Valid till: {d.validTill}</p>
                    </div>
                    {d.status === "Verified" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : d.status === "Expiring Soon" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </aside>

          {/* ── Main panel ── */}
          <div className="space-y-5">

            {/* KPI cards */}
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { key: "eligible", label: T("vd_kpi_eligible"), value: tendersLoading ? "—" : eligibleTenders.length, sub: "Matched to category", color: "border-l-primary", text: "text-primary", filter: null, ref: tendersRef },
                { key: "open",     label: "Open to Bid",         value: tendersLoading ? "—" : openTenders.length,     sub: "Published tenders",   color: "border-l-warning", text: "text-warning", filter: "Published", ref: tendersRef },
                { key: "bids",     label: "Bids Submitted",      value: bidsLoading    ? "—" : enrichedBids.length,    sub: "Total across tenders", color: "border-l-info",    text: "text-info",    filter: null, ref: bidsRef },
                { key: "awarded",  label: T("vd_kpi_awarded"),   value: tendersLoading ? "—" : awardedTenders.length,  sub: `${fmtINR(awardedValue)} total`, color: "border-l-success", text: "text-success", filter: "Awarded", ref: tendersRef },
              ].map(({ key, label, value, sub, color, text, filter, ref }) => {
                const isActive = activeKpi === key;
                return (
                  <Card
                    key={key}
                    onClick={() => {
                      const next = isActive ? null : key;
                      setActiveKpi(next);
                      setTenderStatusFilter(next ? filter : null);
                      if (next) ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`rounded-sm border-l-4 ${color} p-4 cursor-pointer transition-all hover:shadow-md ${isActive ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
                  >
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                    <p className={`text-2xl font-bold ${text}`}>{value}</p>
                    <p className="text-sm text-muted-foreground">{isActive ? "Click to clear filter" : sub}</p>
                  </Card>
                );
              })}
            </section>

            {/* Eligible tenders */}
            <Card ref={tendersRef} className="rounded-sm border-border shadow-sm">
              <div className="border-b border-border bg-secondary/50 px-4 py-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
                  <FileText className="h-4 w-4" /> {T("vd_eligible_tenders")}
                  {!tendersLoading && <span className="text-xs font-normal text-muted-foreground">({eligibleTenders.length})</span>}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={tendersFetching} onClick={() => qc.invalidateQueries({ queryKey: ["vendor-tenders"] })}>
                  <RefreshCw className={`h-3.5 w-3.5 ${tendersFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead className="pl-4">Tender ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>{T("tenders_col_dept")}</TableHead>
                      <TableHead>{T("tenders_col_value")}</TableHead>
                      <TableHead>{T("tenders_col_deadline")}</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tendersLoading ? (
                      <TableSkeleton cols={6} />
                    ) : eligibleTenders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No eligible tenders found for your vendor category.
                        </TableCell>
                      </TableRow>
                    ) : eligibleTenders.filter((t) => {
                        if (!tenderStatusFilter) return true;
                        if (tenderStatusFilter === "Awarded") return t.status === "Awarded" && t.awardedVendorId === vendorId;
                        return t.status === tenderStatusFilter;
                      }).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No {tenderStatusFilter?.toLowerCase()} tenders found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      eligibleTenders.filter((t) => {
                        if (!tenderStatusFilter) return true;
                        if (tenderStatusFilter === "Awarded") return t.status === "Awarded" && t.awardedVendorId === vendorId;
                        return t.status === tenderStatusFilter;
                      }).map((t) => (
                        <TableRow
                          key={t.id}
                          className="border-border/60 cursor-pointer hover:bg-secondary/40 transition-colors"
                          onClick={() => openDetail(t.id)}
                        >
                          <TableCell className="pl-4 text-sm text-primary">{t.id}</TableCell>
                          <TableCell>
                            <p className="max-w-[260px] truncate text-sm font-medium">{t.name}</p>
                          </TableCell>
                          <TableCell className="text-sm">{t.department}</TableCell>
                          <TableCell className="text-sm font-semibold tabular-nums">{fmtINR(t.estimatedValue)}</TableCell>
                          <TableCell className="text-sm">
                            <CalendarClock className="mr-1 inline h-3 w-3 text-warning" />
                            {fmtDate(t.endDate)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-sm text-[11px]">{t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Bid history */}
            <Card ref={bidsRef} className="rounded-sm border-border shadow-sm">
              <div className="border-b border-border bg-secondary/50 px-4 py-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
                  <TrendingUp className="h-4 w-4" /> {T("vd_bid_history")}
                  {!bidsLoading && <span className="text-xs font-normal text-muted-foreground">({enrichedBids.length} bids)</span>}
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={bidsFetching} onClick={() => refetchBids()}>
                  <RefreshCw className={`h-3.5 w-3.5 ${bidsFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead className="pl-4">Tender ID</TableHead>
                      <TableHead>Tender Name</TableHead>
                      <TableHead>Bid Value</TableHead>
                      <TableHead>Submitted On</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bidsLoading ? (
                      <TableSkeleton cols={5} />
                    ) : enrichedBids.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No bids submitted yet. Use the <strong>Submit Bid</strong> button to participate in open tenders.
                        </TableCell>
                      </TableRow>
                    ) : (
                      enrichedBids.map((b) => (
                        <TableRow
                          key={b.id}
                          className="border-border/60 cursor-pointer hover:bg-secondary/40 transition-colors"
                          onClick={() => openDetail(b.tenderId)}
                        >
                          <TableCell className="pl-4 text-sm">{b.tenderId}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-sm">{b.tenderName}</TableCell>
                          <TableCell className="text-sm font-semibold tabular-nums">
                            <Wallet className="mr-1 inline h-3 w-3 text-accent" />
                            {fmtINR(b.amount)}
                          </TableCell>
                          <TableCell className="text-sm">{fmtDate(b.submittedAt)}</TableCell>
                          <TableCell><BidStatusBadge status={b.status} /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* My Documents — real API + OCR pipeline */}
            <Card className="rounded-sm border-border shadow-sm">
              <div className="border-b border-border bg-secondary/50 px-4 py-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-primary">
                  <FileCheck2 className="h-4 w-4" /> My Documents
                  {!docsLoading && <span className="text-xs font-normal text-muted-foreground">({myDocs.length})</span>}
                </h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={docsFetching} onClick={() => refetchDocs()}>
                    <RefreshCw className={`h-3.5 w-3.5 ${docsFetching ? "animate-spin" : ""}`} />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1 rounded-sm text-[11px]" onClick={() => setUploadDocOpen(true)}>
                    <Upload className="h-3 w-3" /> Upload Document
                  </Button>
                </div>
              </div>

              {/* Summary strip — clickable to filter */}
              {myDocs.length > 0 && (
                <div className="grid grid-cols-4 divide-x divide-border border-b border-border text-center text-xs">
                  {([
                    ["Total",     myDocs.length,                                                                    "text-primary"],
                    ["Approved",  myDocs.filter((d) => d.validation?.status === "OFFICER_APPROVED").length,         "text-success"],
                    ["AI Review", myDocs.filter((d) => d.validation?.status === "AI_REVIEWED").length,              "text-info"],
                    ["Flagged",   myDocs.filter((d) => d.validation?.aiFlagged).length,                             "text-destructive"],
                  ] as [string, number, string][]).map(([label, count, cls]) => {
                    const isActive = docCardFilter === label;
                    return (
                      <button
                        key={label}
                        onClick={() => setDocCardFilter(isActive || label === "Total" ? null : label)}
                        className={`py-3 w-full transition-colors hover:bg-secondary/50 ${isActive ? "bg-secondary/70" : ""}`}
                      >
                        <p className={`text-lg font-bold ${cls}`}>{count}</p>
                        <p className="text-muted-foreground">{label}</p>
                        {isActive && <p className="text-[9px] text-muted-foreground">✕ clear</p>}
                      </button>
                    );
                  })}
                </div>
              )}

              {docsLoading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading documents…
                </div>
              ) : myDocs.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <FileCheck2 className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                  <p className="text-xs text-muted-foreground">Upload your registration documents to start the AI OCR verification process.</p>
                  <Button size="sm" className="mt-1 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setUploadDocOpen(true)}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Document
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-4 py-2.5 text-left">File</th>
                        <th className="px-4 py-2.5 text-left">Type</th>
                        <th className="px-4 py-2.5 text-left">OCR / AI Score</th>
                        <th className="px-4 py-2.5 text-left">Status</th>
                        <th className="px-4 py-2.5 text-left">Uploaded</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {myDocs.filter((doc) => {
                        if (!docCardFilter) return true;
                        if (docCardFilter === "Approved")  return doc.validation?.status === "OFFICER_APPROVED";
                        if (docCardFilter === "AI Review") return doc.validation?.status === "AI_REVIEWED";
                        if (docCardFilter === "Flagged")   return doc.validation?.aiFlagged === true;
                        return true;
                      }).map((doc) => {
                        const v = doc.validation;
                        const rating = v ? RATING_CONFIG[v.aiRating] : null;
                        const statusCfg = v ? STATUS_CONFIG[v.status] : null;
                        const isProcessing = doc.ocrStatus === "PROCESSING" || doc.ocrStatus === "PENDING";
                        const isFailed = doc.ocrStatus === "FAILED";
                        return (
                          <tr key={doc.id} className="hover:bg-secondary/40 transition-colors cursor-pointer" onClick={() => setSelectedApiDoc(doc)}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground max-w-[180px] truncate">{doc.originalName}</p>
                              <p className="text-muted-foreground text-xs">{(doc.fileSize / 1024).toFixed(0)} KB</p>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{DOC_TYPE_LABELS[doc.docType] || doc.docType}</td>
                            <td className="px-4 py-3">
                              {rating ? (
                                <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-bold border ${rating.bg} ${rating.color}`}>
                                  {v!.aiScore} · {rating.label}
                                  {v!.aiFlagged && <AlertTriangle className="h-3 w-3 ml-1" />}
                                </span>
                              ) : isProcessing ? (
                                <span className="flex items-center gap-1 text-xs text-info">
                                  <Brain className="h-3 w-3 animate-pulse" /> OCR running…
                                </span>
                              ) : isFailed ? (
                                <span className="flex items-center gap-1 text-xs text-destructive">
                                  <XCircle className="h-3 w-3" /> OCR Failed
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Queued
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold ${isFailed ? "text-destructive" : statusCfg?.color ?? "text-muted-foreground"}`}>
                                {isFailed ? "OCR Failed" : statusCfg?.label ?? "Processing"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString("en-IN")}</td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 gap-1 rounded-sm text-[11px]" onClick={() => setSelectedApiDoc(doc)}>
                                  <Eye className="h-3.5 w-3.5" /> View
                                </Button>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 gap-1 rounded-sm text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                  disabled={deletingDocId === doc.id}
                                  onClick={() => setConfirmDeleteDoc(doc)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {deletingDocId === doc.id ? "…" : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

          </div>
        </div>
      )}
    </AdminLayout>
  );
}
