import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Download, FileCheck2, Gavel, IndianRupee, Search, ShieldCheck, TrendingUp, Trophy } from "lucide-react";
import { fmtDate, fmtINR, useAdmin, type Tender } from "@/store/admin-store";
import { TenderStatusBadge } from "@/components/admin/TenderStatusBadge";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/lib/useT";

export default function Awards() {
  const { tenders, vendors } = useAdmin();
  const T = useT();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Tender | null>(null);

  const awarded = useMemo(
    () => tenders.filter((t) => t.status === "Awarded" && t.awardedVendorId),
    [tenders],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return awarded;
    return awarded.filter((t) => {
      const v = vendors.find((x) => x.id === t.awardedVendorId);
      return [t.id, t.name, t.department, t.category, v?.companyName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [awarded, query, vendors]);

  const totalValue = filtered.reduce((s, t) => s + t.estimatedValue, 0);
  const uniqueVendors = new Set(filtered.map((t) => t.awardedVendorId)).size;
  const avgCycle = 18;

  const vendorOf = (id?: string) => vendors.find((v) => v.id === id);

  const downloadRegister = () => {
    if (!filtered.length) {
      toast({ title: "No data", description: "No awarded tenders to export.", variant: "destructive" });
      return;
    }
    const headers = ["Tender ID", "Name", "Department", "Category", "Vendor", "Value (INR)", "Signed On"];
    const rows = filtered.map((t) => {
      const v = vendorOf(t.awardedVendorId);
      return [t.id, t.name, t.department, t.category, v?.companyName ?? "—", t.estimatedValue, t.signedAt ? fmtDate(t.signedAt) : "—"];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => JSON.stringify(c ?? "")).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `awards-register-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Register exported", description: `${filtered.length} award(s) downloaded as CSV.` });
  };

  const downloadLoA = (t: Tender) => {
    const v = vendorOf(t.awardedVendorId);
    const text = `LETTER OF AWARD (LoA)
Government of Andhra Pradesh — e-Procurement Portal
============================================================
Reference No: LOA/${t.id}/${new Date().getFullYear()}
Issued On  : ${fmtDate(new Date().toISOString())}

To,
${v?.companyName ?? "—"}
${v?.contactPerson ?? ""}
${v?.email ?? ""}

Sub: Award of contract for "${t.name}"

Sir/Madam,
With reference to your bid submitted under tender ${t.id}, the
Tender Inviting Authority is pleased to award the above contract
to your firm at the accepted bid value of ${fmtINR(t.estimatedValue)}.

You are requested to report to the office of the undersigned
within 7 working days along with the performance security and
acceptance of this LoA.

Yours faithfully,
Sri. R. Venkatesh, IAS
Tender Inviting Authority`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `LoA_${t.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "LoA downloaded", description: `Letter of Award for ${t.id} generated.` });
  };

  return (
    <AdminLayout
      title={T("awards_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("nav_awards") }]}
      actions={
        <Button variant="outline" size="sm" onClick={downloadRegister}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export Register
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card className="border-l-4 border-l-success">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{T("awards_total")}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{awarded.length}</p>
                <p className="text-[11px] text-success">FY 2025-26</p>
              </div>
              <Trophy className="h-7 w-7 text-success/70" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{T("awards_value")}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{fmtINR(totalValue)}</p>
                <p className="text-[11px] text-muted-foreground">across {filtered.length} contract(s)</p>
              </div>
              <IndianRupee className="h-7 w-7 text-primary/60" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-info">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{T("vendors_total")}</p>
                <p className="mt-1 text-2xl font-bold text-primary">{uniqueVendors}</p>
                <p className="text-[11px] text-info">empanelled & active</p>
              </div>
              <ShieldCheck className="h-7 w-7 text-info/70" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg. Award Cycle</p>
                <p className="mt-1 text-2xl font-bold text-primary">{avgCycle} <span className="text-base font-medium">days</span></p>
                <p className="text-[11px] text-success flex items-center gap-1"><TrendingUp className="h-3 w-3" /> 12% faster YoY</p>
              </div>
              <Gavel className="h-7 w-7 text-accent" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b bg-secondary/40 py-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                <Award className="h-4 w-4 text-accent" /> Award Register
              </CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">All Letter of Award (LoA) issued under GFR 2017 / CVC guidelines.</p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by tender ID, vendor, dept…"
                className="h-9 pl-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead className="w-[140px]">LoA / {T("tenders_col_id")}</TableHead>
                  <TableHead>{T("awards_col_tender")}</TableHead>
                  <TableHead>{T("awards_col_vendor")}</TableHead>
                  <TableHead>{T("awards_col_dept")}</TableHead>
                  <TableHead className="text-right">{T("awards_col_value")}</TableHead>
                  <TableHead>Award Date</TableHead>
                  <TableHead>{T("tenders_col_status")}</TableHead>
                  <TableHead className="text-right">{T("tenders_col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => {
                  const v = vendorOf(t.awardedVendorId);
                  const award = t.history.find((h) => h.changes.toLowerCase().includes("awarded"));
                  return (
                    <TableRow key={t.id} className="text-xs">
                      <TableCell className="font-mono font-semibold text-primary">
                        LOA/{t.id}
                        <p className="font-sans text-[10px] font-normal text-muted-foreground">{t.id}</p>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="line-clamp-1 font-semibold">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.category}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{v?.companyName ?? "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{v?.id} · Score {v?.pastPerformance}/100</p>
                      </TableCell>
                      <TableCell>{t.department}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtINR(t.estimatedValue)}</TableCell>
                      <TableCell>{fmtDate(award?.editedAt ?? t.createdAt)}</TableCell>
                      <TableCell><TenderStatusBadge status={t.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setSelected(t)}>{T("common_view")}</Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => downloadLoA(t)}>
                            <Download className="mr-1 h-3 w-3" /> {T("awards_download_loa")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                      {T("awards_no_awards")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (() => {
            const v = vendorOf(selected.awardedVendorId);
            const award = selected.history.find((h) => h.changes.toLowerCase().includes("awarded"));
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-primary">
                    <FileCheck2 className="h-4 w-4 text-accent" /> Letter of Award · LOA/{selected.id}
                  </DialogTitle>
                  <DialogDescription>
                    Issued {fmtDate(award?.editedAt ?? selected.createdAt)} under GFR 2017 procurement rules.
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="summary">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="vendor">Vendor</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-3 space-y-3 text-xs">
                    <div className="rounded border bg-secondary/30 p-3">
                      <p className="font-semibold text-primary">{selected.name}</p>
                      <p className="mt-1 text-muted-foreground">{selected.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={T("tenders_col_id")} value={selected.id} />
                      <Field label={T("tenders_col_dept")} value={selected.department} />
                      <Field label={T("vendors_col_category")} value={selected.category} />
                      <Field label={T("awards_col_value")} value={fmtINR(selected.estimatedValue)} highlight />
                      <Field label={T("awards_col_bid_period")} value={`${fmtDate(selected.startDate)} → ${fmtDate(selected.endDate)}`} />
                      <Field label={T("awards_col_eligible")} value={`${selected.eligibleVendorIds.length} vendor(s)`} />
                    </div>
                  </TabsContent>

                  <TabsContent value="vendor" className="mt-3 space-y-3 text-xs">
                    {v ? (
                      <>
                        <div className="rounded border bg-success/5 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-success">Awarded Bidder</p>
                          <p className="text-sm font-bold text-primary">{v.companyName}</p>
                          <p className="text-muted-foreground">{v.contactPerson} · {v.email} · {v.phone}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={T("vendors_col_id")} value={v.id} />
                          <Field label={T("vendors_col_category")} value={v.category} />
                          <Field label="GST" value={v.gst} />
                          <Field label="PAN" value={v.pan} />
                          <Field label={T("vendors_col_performance")} value={`${v.pastPerformance}/100`} highlight />
                          <Field label={T("awards_col_completed")} value={`${v.completedTenders}`} />
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Vendor record not found.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="mt-3 space-y-2 text-xs">
                    {selected.history.length === 0 && (
                      <p className="text-muted-foreground">No version history recorded.</p>
                    )}
                    {selected.history.map((h) => (
                      <div key={h.version} className="rounded border-l-2 border-l-accent bg-secondary/30 p-2.5">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-primary">v{h.version} · {h.changes}</p>
                          <span className="text-[10px] text-muted-foreground">{fmtDate(h.editedAt)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">by {h.editedBy}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelected(null)}>{T("common_cancel")}</Button>
                  <Button onClick={() => downloadLoA(selected)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> {T("awards_download_loa")}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded border bg-card p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${highlight ? "font-bold text-success" : "font-semibold text-foreground"}`}>{value}</p>
    </div>
  );
}
