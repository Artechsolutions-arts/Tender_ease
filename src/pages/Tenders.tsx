import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { TenderStatusBadge } from "@/components/admin/TenderStatusBadge";
import { TenderFormDialog } from "@/components/admin/TenderFormDialog";
import { useAdmin, fmtINR, fmtDate, fmtDateTime, nextStatuses, TENDER_STATUSES, type Tender, type TenderStatus } from "@/store/admin-store";
import { Plus, Search, Pencil, Eye, History, ArrowRight, Trash2, FileText, ShieldCheck, Award, Tag, X, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/useT";
import { useAuth } from "@/store/auth-store";

const CATEGORIES = ["All", "Civil Works", "Goods / Supplies", "Services", "IT / e-Gov", "Consultancy", "Healthcare", "Auction / Sale"];

export default function Tenders() {
  const { tenders, vendors, changeStatus, deleteTender, refreshTenders } = useAdmin();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const T = useT();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<TenderStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("category") ?? "All");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Tender | undefined>();
  const [viewing, setViewing] = useState<Tender | undefined>();
  const [historyFor, setHistoryFor] = useState<Tender | undefined>();
  const [awardFor, setAwardFor] = useState<Tender | undefined>();
  const [awardVendor, setAwardVendor] = useState<string>("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const vendorId = currentUser?.vendorId;
    const eligible = isAdmin
      ? tenders
      : tenders.filter((t) => vendorId && t.eligibleVendorIds.includes(vendorId) && t.status === "Published");
    const exactIdMatch = q ? eligible.find((t) => t.id.toLowerCase() === q) : null;
    return eligible.filter((t) => {
      const matchQ = !q
        || (exactIdMatch ? t.id.toLowerCase() === q : (
          t.id.toLowerCase().includes(q)
          || t.name.toLowerCase().includes(q)
          || t.department.toLowerCase().includes(q)
        ));
      const matchS = statusFilter === "All" || t.status === statusFilter;
      const matchC = categoryFilter === "All" || t.category === categoryFilter;
      return matchQ && matchS && matchC;
    });
  }, [tenders, query, statusFilter, categoryFilter, isAdmin, currentUser]);

  const handleAdvance = (t: Tender) => {
    const nxt = nextStatuses(t.status);
    if (nxt.length === 0) return;
    if (nxt[0] === "Awarded") { setAwardFor(t); setAwardVendor(t.eligibleVendorIds[0] ?? ""); return; }
    changeStatus(t.id, nxt[0]);
    toast.success(`Status updated → ${nxt[0]}`);
  };

  const confirmAward = () => {
    if (!awardFor || !awardVendor) return;
    changeStatus(awardFor.id, "Awarded", awardVendor);
    toast.success("Letter of Award issued");
    setAwardFor(undefined);
  };

  const vendorName = (id?: string) => vendors.find((v) => v.id === id)?.companyName ?? "—";

  return (
    <AdminLayout
      title={T("tenders_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("common_officer_console"), to: "/" }, { label: T("nav_tenders") }]}
      actions={isAdmin ? (
        <>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-sm" onClick={() => { refreshTenders(); toast.info("Refreshing tenders…"); }}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-8 gap-1.5 rounded-sm bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> {T("tenders_create")}
          </Button>
        </>
      ) : undefined}
    >
      <Card className="rounded-sm border-border">
        <div className="flex flex-col gap-3 border-b border-border bg-secondary/40 p-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{isAdmin ? T("tenders_all") : "Open for Bidding"}</h3>
            <span className="text-sm text-muted-foreground">({rows.length} {T("common_of")} {isAdmin ? tenders.length : rows.length})</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T("tenders_search")} className="h-8 pl-8 sm:w-64" />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 sm:w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c === "All" ? "All Categories" : c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TenderStatus | "All")}>
              <SelectTrigger className="h-8 sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">{T("tenders_all_statuses")}</SelectItem>
                {TENDER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {categoryFilter !== "All" && (
          <div className="flex items-center gap-2 border-b border-border bg-accent/5 px-3 py-2">
            <Tag className="h-3.5 w-3.5 text-accent" />
            <span className="text-sm font-medium text-accent">Filtered by category: <strong>{categoryFilter}</strong></span>
            <button onClick={() => setCategoryFilter("All")} className="ml-auto flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-3 w-3" /> Clear filter
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                <TableHead className="pl-4 whitespace-nowrap">{T("tenders_col_id")}</TableHead>
                <TableHead>{T("tenders_col_name")}</TableHead>
                <TableHead>{T("tenders_col_dept")}</TableHead>
                <TableHead>{T("tenders_col_value")}</TableHead>
                <TableHead>{T("tenders_col_deadline")}</TableHead>
                <TableHead>{T("tenders_col_eligible")}</TableHead>
                <TableHead>{T("tenders_col_status")}</TableHead>
                <TableHead className="pr-4 text-right">{T("tenders_col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t.id} className="border-border/60 cursor-pointer hover:bg-secondary/50 transition-colors" onClick={() => setViewing(t)}>
                  <TableCell className="pl-4 text-sm whitespace-nowrap">{t.id}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="font-medium text-foreground line-clamp-1">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.category} · v{t.history.length + 1}</p>
                  </TableCell>
                  <TableCell className="text-sm">{t.department}</TableCell>
                  <TableCell className="text-sm tabular-nums">{fmtINR(t.estimatedValue)}</TableCell>
                  <TableCell className="text-sm">{fmtDate(t.endDate)}</TableCell>
                  <TableCell className="text-sm text-center">{t.eligibleVendorIds.length}</TableCell>
                  <TableCell><TenderStatusBadge status={t.status} /></TableCell>
                  <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={T("tenders_view")} onClick={() => setViewing(t)}><Eye className="h-3.5 w-3.5" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" className="h-7 w-7" title={T("tenders_edit")} onClick={() => setEditing(t)}><Pencil className="h-3.5 w-3.5" /></Button>}
                      {isAdmin && <Button variant="ghost" size="icon" className="h-7 w-7" title={T("tenders_history")} onClick={() => setHistoryFor(t)}><History className="h-3.5 w-3.5" /></Button>}
                      {isAdmin && nextStatuses(t.status).length > 0 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-info" title={`→ ${nextStatuses(t.status)[0]}`} onClick={() => handleAdvance(t)}><ArrowRight className="h-3.5 w-3.5" /></Button>
                      )}
                      {isAdmin && t.status === "Draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={T("tenders_delete")} onClick={() => { deleteTender(t.id); toast.success("Tender deleted"); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">{T("tenders_no_match")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <TenderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TenderFormDialog open={!!editing} onOpenChange={(v) => !v && setEditing(undefined)} tender={editing} />

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(undefined)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{viewing.id}</span> · {viewing.name}</DialogTitle>
                <DialogDescription>
                  <TenderStatusBadge status={viewing.status} /> <span className="ml-2 text-sm">{viewing.department} · {viewing.category}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{viewing.description}</p>
                <div className="grid grid-cols-2 gap-3 rounded-sm bg-secondary/40 p-3 text-sm">
                  <div><p className="text-muted-foreground">{T("tenders_dialog_est_value")}</p><p className="font-bold text-primary">{fmtINR(viewing.estimatedValue)}</p></div>
                  <div><p className="text-muted-foreground">{T("tenders_dialog_created")}</p><p>{fmtDate(viewing.createdAt)}</p></div>
                  <div><p className="text-muted-foreground">{T("tenders_dialog_start")}</p><p>{fmtDate(viewing.startDate)}</p></div>
                  <div><p className="text-muted-foreground">{T("tenders_dialog_deadline")}</p><p>{fmtDate(viewing.endDate)}</p></div>
                  {viewing.awardedVendorId && (
                    <div className="col-span-2 flex items-center gap-2 rounded-sm bg-success/10 p-2"><Award className="h-4 w-4 text-success" /><span className="font-semibold text-success">{T("tenders_dialog_awarded_to")} {vendorName(viewing.awardedVendorId)}</span></div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold uppercase text-primary">{T("tenders_dialog_docs")}</p>
                  <ul className="divide-y divide-border rounded-sm border border-border">
                    {viewing.documents.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-secondary/30 transition-colors">
                        <span className="flex items-center gap-2 font-medium min-w-0">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{d.name}</span>
                          {d.size && <span className="text-muted-foreground shrink-0">· {d.size}</span>}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 shrink-0 gap-1 rounded-sm px-2 text-[10px]"
                          onClick={() => {
                            const blob = new Blob([`Tender Document: ${d.name}\nTender: ${viewing.name} (${viewing.id})\nDepartment: ${viewing.department}\nFile Size: ${d.size || "—"}\n\nThis document is part of the AP e-Procurement tender notice.\nReference: ${viewing.id}\nIssued by: ${viewing.department}\nDate: ${new Date().toLocaleDateString("en-IN")}`], { type: "text/plain" });
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = blobUrl;
                            a.download = d.name.replace(/\.[^.]+$/, ".txt");
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                          }}
                        >
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold uppercase text-primary">{T("tenders_dialog_eligible_vendors")} ({viewing.eligibleVendorIds.length})</p>
                  <ul className="space-y-1 text-sm">{viewing.eligibleVendorIds.map((id) => <li key={id} className="rounded-sm bg-secondary/40 px-2 py-1">🏢 {vendorName(id)} <span className="text-muted-foreground">({id})</span></li>)}</ul>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={!!historyFor} onOpenChange={(v) => !v && setHistoryFor(undefined)}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          {historyFor && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> {T("tenders_history_title")} · {historyFor.id}</DialogTitle>
                <DialogDescription>{historyFor.history.length} {T("common_previous_versions")} {T("common_current_is")} v{historyFor.history.length + 1}.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="rounded-sm border-l-4 border-accent bg-accent/5 p-3">
                  <p className="text-sm font-bold text-accent">{T("tenders_history_current")} · v{historyFor.history.length + 1}</p>
                  <p className="text-sm font-medium">{historyFor.name}</p>
                  <p className="text-sm text-muted-foreground">{T("tenders_history_deadline")}: {fmtDate(historyFor.endDate)} · {T("tenders_col_eligible")}: {historyFor.eligibleVendorIds.length} {T("tenders_history_eligible")} · {T("tenders_col_value")}: {fmtINR(historyFor.estimatedValue)}</p>
                </div>
                {historyFor.history.length === 0 && (
                  <p className="rounded-sm border border-dashed border-border p-6 text-center text-xs text-muted-foreground">{T("tenders_history_no_versions")}</p>
                )}
                {historyFor.history.map((v) => (
                  <div key={v.version} className="rounded-sm border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-primary">v{v.version}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateTime(v.editedAt)} · {v.editedBy}</p>
                    </div>
                    <p className="mt-1 text-sm italic text-muted-foreground">"{v.changes}"</p>
                    <p className="mt-1 text-sm">{T("tenders_history_deadline")}: <span className="font-mono">{fmtDate(v.snapshot.endDate)}</span> · {T("tenders_col_eligible")}: {v.snapshot.eligibleVendorIds.length} {T("tenders_history_eligible")} · {T("tenders_col_value")}: {fmtINR(v.snapshot.estimatedValue)}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Award dialog */}
      <Dialog open={!!awardFor} onOpenChange={(v) => !v && setAwardFor(undefined)}>
        <DialogContent>
          {awardFor && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Award className="h-4 w-4" /> {T("tenders_award_title")} · {awardFor.id}</DialogTitle>
                <DialogDescription>{T("tenders_award_audit_note")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-xs font-semibold">{T("tenders_award_winning_vendor")}</label>
                <Select value={awardVendor} onValueChange={setAwardVendor}>
                  <SelectTrigger><SelectValue placeholder={T("tenders_award_select")} /></SelectTrigger>
                  <SelectContent>
                    {awardFor.eligibleVendorIds.map((id) => {
                      const v = vendors.find((x) => x.id === id);
                      return <SelectItem key={id} value={id}>{v?.companyName} (Score {v?.pastPerformance})</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <div className="rounded-sm border border-info/30 bg-info/5 p-2 text-xs text-info">
                  <ShieldCheck className="mb-0.5 inline h-3 w-3" /> {T("tenders_award_audit_note")}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAwardFor(undefined)}>{T("tenders_award_cancel")}</Button>
                <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={confirmAward}>{T("tenders_award_issue_loa")}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
