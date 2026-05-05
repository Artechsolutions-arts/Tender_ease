import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Search, Users, Mail, Phone, Building2, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Sparkles, Fingerprint, FileSearch, Briefcase, FileCheck, Star, MapPin, IndianRupee, Calendar, Hash, AlertOctagon, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdmin, fmtDate, type PendingVendor, type Vendor } from "@/store/admin-store";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/useT";
import { getVendorDetail, type CompletedProject } from "@/data/vendorDetails";

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= rating ? "fill-accent text-accent" : "text-border"}`} />
      ))}
    </span>
  );
}

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function VendorDetailDialog({ vendor, open, onClose }: { vendor: Vendor | null; open: boolean; onClose: () => void }) {
  if (!vendor) return null;
  const detail = getVendorDetail(vendor);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">{vendor.companyName}</DialogTitle>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{vendor.id}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{vendor.category}</span>
              </div>
            </div>
            {vendor.blacklisted ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive ring-1 ring-inset ring-destructive/30">
                <AlertTriangle className="h-3 w-3" /> Blacklisted
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-inset ring-success/30">
                <ShieldCheck className="h-3 w-3" /> Active
              </span>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="h-8 w-full rounded-sm">
            <TabsTrigger value="profile" className="flex-1 text-xs">Profile</TabsTrigger>
            <TabsTrigger value="projects" className="flex-1 text-xs">
              Projects ({detail.completedProjects.length})
            </TabsTrigger>
            {vendor.blacklisted && (
              <TabsTrigger value="blacklist" className="flex-1 text-xs text-destructive">
                Blacklist Info
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── PROFILE ── */}
          <TabsContent value="profile" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Hash,        label: "Vendor ID",       value: vendor.id },
                { icon: Building2,   label: "Category",        value: vendor.category },
                { icon: Users,       label: "Contact Person",  value: vendor.contactPerson },
                { icon: Phone,       label: "Phone",           value: vendor.phone },
                { icon: Mail,        label: "Email",           value: vendor.email },
                { icon: MapPin,      label: "Location",        value: `${detail.city}, ${detail.state}` },
                { icon: Calendar,    label: "Registered On",   value: fmtDate(vendor.registeredOn) },
                { icon: Users,       label: "Employees",       value: `~${detail.employees}` },
                { icon: IndianRupee, label: "Annual Turnover", value: `₹${detail.turnoverLakhs.toFixed(1)} L` },
                { icon: Briefcase,   label: "Years Active",    value: `${detail.yearsActive} years` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5 rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5">
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-start gap-2.5 rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5">
                <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">GST Number</p>
                  <p className="mt-0.5 font-mono text-sm font-medium text-foreground">{vendor.gst || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5">
                <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">PAN Number</p>
                  <p className="mt-0.5 font-mono text-sm font-medium text-foreground">{vendor.pan || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Performance Score</p>
              <div className="mt-2 flex items-center gap-3">
                <Progress value={vendor.pastPerformance} className="h-2 flex-1" />
                <span className="text-sm font-bold text-primary">{vendor.pastPerformance}/100</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{vendor.completedTenders} tender{vendor.completedTenders !== 1 ? "s" : ""} completed</p>
            </div>
          </TabsContent>

          {/* ── PROJECTS ── */}
          <TabsContent value="projects" className="mt-3">
            {detail.completedProjects.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-30" />
                <p className="text-sm">No completed projects on record.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detail.completedProjects.map((p: CompletedProject) => (
                  <div key={p.id} className="rounded-sm border border-border/60 bg-secondary/10 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{p.tenderRef}</p>
                      </div>
                      <StarRating rating={p.rating} />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div><span className="font-semibold text-foreground/70">Dept.</span> {p.department}</div>
                      <div><span className="font-semibold text-foreground/70">Value</span> {fmtINR(p.value)}</div>
                      <div><span className="font-semibold text-foreground/70">Completed</span> {new Date(p.completedOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                    <p className="mt-2 text-xs italic text-muted-foreground">"{p.remarks}"</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── BLACKLIST ── */}
          {vendor.blacklisted && (
            <TabsContent value="blacklist" className="mt-3">
              {detail.blacklistEntry ? (
                <div className="space-y-3">
                  <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-bold text-destructive">
                      <AlertOctagon className="h-4 w-4" /> Debarment / Blacklist Order
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Order No.</p>
                        <p className="font-mono font-medium">{detail.blacklistEntry.orderNo}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Date of Order</p>
                        <p className="font-medium">{detail.blacklistEntry.date}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Issuing Authority</p>
                        <p className="font-medium">{detail.blacklistEntry.authority}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Duration</p>
                        <p className={`font-semibold ${detail.blacklistEntry.duration === "Permanent" ? "text-destructive" : "text-warning"}`}>
                          {detail.blacklistEntry.duration}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Reason</p>
                        <p className="font-medium text-destructive">{detail.blacklistEntry.reason}</p>
                      </div>
                      {detail.blacklistEntry.relatedTender && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Related Tender</p>
                          <p className="font-mono font-medium">{detail.blacklistEntry.relatedTender}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-sm border border-border/60 bg-secondary/10 p-3">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Detailed Description</p>
                    <p className="text-sm leading-relaxed text-foreground/80">{detail.blacklistEntry.description}</p>
                  </div>

                  <div className="rounded-sm border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                    <p className="font-semibold">Notice to Tendering Officers</p>
                    <p className="mt-0.5 text-muted-foreground">This vendor is debarred from participating in any Government of Andhra Pradesh procurement until the order is explicitly vacated by the competent authority.</p>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Blacklist details not available.</p>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function Vendors() {
  const { vendors, pendingVendors, approveVendor, rejectVendor, tenders } = useAdmin();
  const T = useT();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"approved" | "pending">("approved");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blacklisted">("all");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PendingVendor | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const openAiReport = (pr: PendingVendor) => {
    setSelectedPr(pr);
    setIsAiOpen(true);
  };

  const toggleStatFilter = (next: "active" | "blacklisted") => {
    setStatusFilter((prev) => (prev === next ? "all" : next));
    setTab("approved");
  };

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    return vendors.filter((v) => {
      const matchQ = !q || v.companyName.toLowerCase().includes(q) || v.id.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
      const matchS = statusFilter === "all" || (statusFilter === "active" ? !v.blacklisted : v.blacklisted);
      return matchQ && matchS;
    });
  }, [vendors, query, statusFilter]);

  const tendersFor = (vid: string) => tenders.filter((t) => t.eligibleVendorIds.includes(vid)).length;

  return (
    <AdminLayout
      title={T("vendors_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("common_officer_console"), to: "/" }, { label: T("nav_vendors") }]}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card
          onClick={() => { setStatusFilter("all"); setTab("approved"); }}
          className={`cursor-pointer rounded-sm border-l-4 border-l-primary p-3 transition-colors hover:bg-primary/5 ${statusFilter === "all" ? "ring-2 ring-primary/30 bg-primary/5" : ""}`}
        >
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_total")}</p>
          <p className="text-2xl font-bold text-primary">{vendors.length}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Click to show all</p>
        </Card>
        <Card
          onClick={() => toggleStatFilter("active")}
          className={`cursor-pointer rounded-sm border-l-4 border-l-success p-3 transition-colors hover:bg-success/5 ${statusFilter === "active" ? "ring-2 ring-success/30 bg-success/5" : ""}`}
        >
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_active")}</p>
          <p className="text-2xl font-bold text-success">{vendors.filter((v) => !v.blacklisted).length}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{statusFilter === "active" ? "✓ Filtered" : "Click to filter"}</p>
        </Card>
        <Card
          onClick={() => toggleStatFilter("blacklisted")}
          className={`cursor-pointer rounded-sm border-l-4 border-l-destructive p-3 transition-colors hover:bg-destructive/5 ${statusFilter === "blacklisted" ? "ring-2 ring-destructive/30 bg-destructive/5" : ""}`}
        >
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_blacklisted")}</p>
          <p className="text-2xl font-bold text-destructive">{vendors.filter((v) => v.blacklisted).length}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{statusFilter === "blacklisted" ? "✓ Filtered" : "Click to filter"}</p>
        </Card>
        <Card className="rounded-sm border-l-4 border-l-accent p-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">{T("vendors_avg_performance")}</p>
          <p className="text-2xl font-bold text-accent">{vendors.length ? Math.round(vendors.reduce((s, v) => s + v.pastPerformance, 0) / vendors.length) : 0}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Avg. across all vendors</p>
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
                <TableRow key={v.id} className="cursor-pointer border-border/60 transition-colors hover:bg-accent/5" onClick={() => setSelectedVendor(v)}>
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

      <VendorDetailDialog
        vendor={selectedVendor}
        open={!!selectedVendor}
        onClose={() => setSelectedVendor(null)}
      />
    </AdminLayout>
  );
}
