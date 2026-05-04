import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, Users, Mail, Phone, Building2, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Sparkles, Fingerprint, FileSearch, Briefcase, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin, fmtDate, type PendingVendor } from "@/store/admin-store";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/useT";

export default function Vendors() {
  const { vendors, pendingVendors, approveVendor, rejectVendor, tenders } = useAdmin();
  const T = useT();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"approved" | "pending">("approved");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PendingVendor | null>(null);

  const openAiReport = (pr: PendingVendor) => {
    setSelectedPr(pr);
    setIsAiOpen(true);
  };

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return vendors.filter((v) => !q || v.companyName.toLowerCase().includes(q) || v.id.toLowerCase().includes(q) || v.category.toLowerCase().includes(q));
  }, [vendors, query]);

  const tendersFor = (vid: string) => tenders.filter((t) => t.eligibleVendorIds.includes(vid)).length;

  return (
    <AdminLayout
      title={T("vendors_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("common_officer_console"), to: "/" }, { label: T("nav_vendors") }]}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card className="rounded-sm border-l-4 border-l-primary p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_total")}</p>
          <p className="text-2xl font-bold text-primary">{vendors.length}</p>
        </Card>
        <Card className="rounded-sm border-l-4 border-l-success p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_active")}</p>
          <p className="text-2xl font-bold text-success">{vendors.filter((v) => !v.blacklisted).length}</p>
        </Card>
        <Card className="rounded-sm border-l-4 border-l-destructive p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_blacklisted")}</p>
          <p className="text-2xl font-bold text-destructive">{vendors.filter((v) => v.blacklisted).length}</p>
        </Card>
        <Card className="rounded-sm border-l-4 border-l-accent p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_avg_performance")}</p>
          <p className="text-2xl font-bold text-accent">{vendors.length ? Math.round(vendors.reduce((s, v) => s + v.pastPerformance, 0) / vendors.length) : 0}</p>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-6 border-b border-border">
        <button
          onClick={() => setTab("approved")}
          className={`pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${tab === "approved" ? "border-b-2 border-primary text-primary" : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {T("vendors_approved_tab")} ({vendors.length})
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`pb-3 text-sm font-bold uppercase tracking-wide transition-colors ${tab === "pending" ? "border-b-2 border-primary text-primary" : "border-b-2 border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {T("vendors_pending_tab")}
          {pendingVendors.length > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">{pendingVendors.length}</span>
          )}
        </button>
      </div>

      {tab === "approved" ? (
        <Card className="mt-4 rounded-sm border-border">
        <div className="flex flex-col gap-3 border-b border-border bg-secondary/40 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{T("vendors_directory")}</h3>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T("vendors_search")} className="h-8 pl-8 sm:w-72" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="pl-4">{T("vendors_col_id")}</TableHead>
                <TableHead>{T("vendors_col_company")}</TableHead>
                <TableHead>{T("vendors_col_category")}</TableHead>
                <TableHead>{T("vendors_col_compliance")}</TableHead>
                <TableHead>{T("vendors_col_performance")}</TableHead>
                <TableHead>{T("vendors_col_tenders")}</TableHead>
                <TableHead className="pr-4">{T("vendors_col_status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => (
                <TableRow key={v.id} className="border-border/60">
                  <TableCell className="pl-4 font-mono text-xs">{v.id}</TableCell>
                  <TableCell>
                    <p className="flex items-center gap-1.5 font-medium text-foreground"><Building2 className="h-3 w-3 text-primary" /> {v.companyName}</p>
                    <p className="text-[11px] text-muted-foreground">{v.contactPerson}</p>
                    <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><Mail className="h-3 w-3" /> {v.email}</p>
                    <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><Phone className="h-3 w-3" /> {v.phone}</p>
                  </TableCell>
                  <TableCell className="text-xs">{v.category}</TableCell>
                  <TableCell className="text-xs">
                    <p className="font-mono">GST: {v.gst}</p>
                    <p className="font-mono">PAN: {v.pan}</p>
                    <p className="text-[10px] text-muted-foreground">{T("vendors_reg")} {fmtDate(v.registeredOn)}</p>
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={v.pastPerformance} className="h-1.5" />
                      <span className="text-xs font-bold text-primary">{v.pastPerformance}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{v.completedTenders} {T("vendors_completed")}</p>
                  </TableCell>
                  <TableCell className="text-xs text-center">{tendersFor(v.id)}</TableCell>
                  <TableCell className="pr-4">
                    {v.blacklisted ? (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive ring-1 ring-inset ring-destructive/30">
                        <AlertTriangle className="h-3 w-3" /> {T("vendors_status_blacklisted")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-inset ring-success/30">
                        <ShieldCheck className="h-3 w-3" /> {T("vendors_status_active")}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      ) : (
        <Card className="mt-4 rounded-sm border-border">
          <div className="border-b border-border bg-secondary/40 p-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-warning">{T("vendors_pending_verifications")}</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  <TableHead className="pl-4">{T("vendors_col_ref_id")}</TableHead>
                  <TableHead>{T("vendors_col_company_detail")}</TableHead>
                  <TableHead>{T("vendors_col_submitted")}</TableHead>
                  <TableHead>{T("vendors_col_status")}</TableHead>
                  <TableHead className="text-right pr-4">{T("vendors_col_govt_action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingVendors.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">{T("vendors_no_pending")}</TableCell></TableRow>
                ) : (
                  pendingVendors.map((pr) => (
                    <TableRow key={pr.id} className="border-border/60">
                      <TableCell className="pl-4 font-mono text-xs">{pr.id}</TableCell>
                      <TableCell>
                         <p className="font-bold text-foreground flex items-center gap-1"><Building2 className="h-3 w-3 text-primary" /> {pr.company}</p>
                        <p className="text-[11px] text-muted-foreground">{pr.contact}</p>
                        <p className="text-[11px] text-muted-foreground">{pr.email} | {pr.phone}</p>
                      </TableCell>
                      <TableCell className="text-xs">{pr.submittedOn}</TableCell>
                      <TableCell><span className="inline-flex items-center rounded-sm bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning ring-1 ring-inset ring-warning/30">{pr.status}</span></TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] rounded-sm bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground border-primary/30" onClick={() => openAiReport(pr)}>
                            <Sparkles className="h-3 w-3 mr-1" /> {T("vendors_ai_insights")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] rounded-sm bg-success/10 text-success hover:bg-success hover:text-success-foreground border-success/30" onClick={() => approveVendor(pr.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> {T("vendors_approve")}
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[10px] rounded-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30" onClick={() => rejectVendor(pr.id)}>
                            <XCircle className="h-3 w-3 mr-1" /> {T("vendors_reject")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Sheet open={isAiOpen} onOpenChange={setIsAiOpen}>
        <SheetContent className="w-[400px] sm:max-w-[450px] overflow-y-auto">
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5 fill-primary/20" />
              <SheetTitle>{T("vendors_ai_report")}</SheetTitle>
            </div>
            <SheetDescription>
              {T("vendors_ai_eval_for")} {selectedPr?.company}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            <div className="rounded-sm bg-primary/5 p-4 border border-primary/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-primary">{T("vendors_trust_score")}</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">{T("vendors_high_confidence")}</Badge>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-black text-primary">94</span>
                <span className="text-sm text-muted-foreground pb-1">/ 100</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 italic">
                "Profile exhibits high consistency across all government databases and financial filings."
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{T("vendors_verification_metrics")}</h4>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 text-primary">
                  <Fingerprint className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{T("vendors_identity_kyc")}</p>
                    <span className="text-xs font-bold text-success">MATCHED</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">PAN/GSTIN records match the registered company name at 99.8% confidence.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 text-primary">
                  <FileSearch className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{T("vendors_financial_health")}</p>
                    <span className="text-xs font-bold text-warning">CAUTION</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Net profit margin dipped by 4% in Q4 2025. Still well above eligibility thresholds.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 text-primary">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{T("vendors_project_capability")}</p>
                    <span className="text-xs font-bold text-success">OPTIMAL</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Vendor has successfully executed 5+ projects of similar scale in the last 24 months.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-secondary/50 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">{T("vendors_compliance_check")}</p>
                    <span className="text-xs font-bold text-success">PASSED</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">No records found in national debarment or blacklisting registries.</p>
                </div>
              </div>
            </div>

            <div className="rounded-sm bg-accent/5 p-4 border border-accent/20">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="h-4 w-4 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wide text-accent">{T("vendors_ai_recommendation")}</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                Recommend for **IMMEDIATE APPROVAL**.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                The minor financial dip is seasonal. Overall compliance and technical scores are in the top 5th percentile for new registrants.
              </p>
              <div className="mt-4 flex gap-2">
                <Button className="flex-1 h-8 text-[11px] bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => {
                  if (selectedPr) approveVendor(selectedPr.id);
                  setIsAiOpen(false);
                }}>
                  {T("vendors_accept_recommendation")}
                </Button>
                <Button variant="outline" className="h-8 text-[11px]" onClick={() => setIsAiOpen(false)}>
                  {T("vendors_dismiss")}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
