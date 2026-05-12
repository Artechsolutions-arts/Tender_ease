import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdmin, fmtINR, fmtDate } from "@/store/admin-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Trophy, FileCheck2, AlertTriangle, CheckCircle2, XCircle, Download, Gavel, Building2, Phone, Mail, Star } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/useT";
import { printAsPdf } from "@/lib/printPdf";

interface Bid {
  vendorId: string;
  bidAmount: number;
  technicalScore: number;
  complianceScore: number;
  deliveryDays: number;
  pastPerformance: number;
  documentsComplete: boolean;
  remarks: string;
}

function generateBids(tenderId: string, vendorIds: string[], estValue: number, vendors: { id: string; pastPerformance: number; blacklisted: boolean }[]): Bid[] {
  let seed = 0;
  for (const ch of tenderId) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return vendorIds.map((vid) => {
    const v = vendors.find((x) => x.id === vid);
    const variance = 0.78 + rand() * 0.28;
    const tech = Math.round(60 + rand() * 38);
    const comp = v?.blacklisted ? Math.round(40 + rand() * 20) : Math.round(70 + rand() * 28);
    const docsOk = comp > 65;
    return {
      vendorId: vid,
      bidAmount: Math.round((estValue * variance) / 1000) * 1000,
      technicalScore: tech,
      complianceScore: comp,
      deliveryDays: Math.round(60 + rand() * 120),
      pastPerformance: v?.pastPerformance ?? 70,
      documentsComplete: docsOk,
      remarks: !docsOk ? "EMD / BG document missing" : tech > 85 ? "Strong technical proposal" : "Acceptable submission",
    };
  });
}

function compositeScore(b: Bid, lowest: number) {
  const priceScore = (lowest / b.bidAmount) * 100;
  return priceScore * 0.4 + b.technicalScore * 0.3 + b.pastPerformance * 0.2 + b.complianceScore * 0.1;
}

type RankedBid = Bid & { composite: number };

export default function BidEvaluation() {
  const { tenders, vendors, changeStatus } = useAdmin();
  const T = useT();
  const [searchParams] = useSearchParams();
  const evaluable = tenders.filter((t) => ["Closed", "Evaluated", "Published"].includes(t.status));
  const [selectedId, setSelectedId] = useState<string>(() => searchParams.get("tender") ?? evaluable[0]?.id ?? tenders[0]?.id ?? "");

  useEffect(() => {
    const param = searchParams.get("tender");
    if (param && tenders.find((t) => t.id === param)) setSelectedId(param);
  }, [searchParams, tenders]);
  const [selectedBid, setSelectedBid] = useState<RankedBid | null>(null);

  const tender = tenders.find((t) => t.id === selectedId);
  const bids = useMemo(() => (tender ? generateBids(tender.id, tender.eligibleVendorIds, tender.estimatedValue, vendors) : []), [tender, vendors]);
  const lowestBid = bids.length ? Math.min(...bids.map((b) => b.bidAmount)) : 0;

  const ranked = useMemo<RankedBid[]>(() => {
    return bids
      .map((b) => ({ ...b, composite: compositeScore(b, lowestBid) }))
      .sort((a, b) => b.composite - a.composite);
  }, [bids, lowestBid]);

  const winner = ranked[0];
  const l1 = ranked.length ? ranked.reduce((a, b) => (a.bidAmount < b.bidAmount ? a : b)) : null;

  const vendorOf = (id: string) => vendors.find((v) => v.id === id);

  const handleAward = () => {
    if (!tender || !winner) return;
    if (tender.status === "Awarded") return;
    if (tender.status === "Closed") {
      changeStatus(tender.id, "Evaluated");
      toast.info("Tender marked as Evaluated. Click Issue LOA again to award.");
      return;
    }
    if (tender.status !== "Evaluated") {
      toast.error("Tender must be Evaluated before issuing an LOA.");
      return;
    }
    changeStatus(tender.id, "Awarded", winner.vendorId);
    toast.success(`Letter of Award issued to ${vendorOf(winner.vendorId)?.companyName}`);
  };

  const handleMarkEvaluated = () => {
    if (!tender) return;
    changeStatus(tender.id, "Evaluated");
    toast.success("Evaluation report finalized");
  };

  const handleExportCER = () => {
    if (!tender) { toast.error("Select a tender first"); return; }

    const bidRows = ranked.map((b, i) => {
      const v = vendorOf(b.vendorId);
      const variance = ((b.bidAmount - tender.estimatedValue) / tender.estimatedValue) * 100;
      return `<tr>
        <td><strong>${i === 0 ? "H1 ★" : `H${i + 1}`}</strong></td>
        <td><strong>${v?.companyName ?? b.vendorId}</strong><br/><small style="color:#666">${b.vendorId} · ${b.deliveryDays}-day delivery</small></td>
        <td style="text-align:right;font-family:monospace">${fmtINR(b.bidAmount)}</td>
        <td style="text-align:right;color:${variance < 0 ? "#27ae60" : "#e67e22"}">${variance > 0 ? "+" : ""}${variance.toFixed(1)}%</td>
        <td style="text-align:center">${b.technicalScore}</td>
        <td style="text-align:center">${b.pastPerformance}</td>
        <td style="text-align:center">${b.complianceScore}</td>
        <td style="text-align:right"><strong style="color:#1a3a6b">${b.composite.toFixed(1)}</strong></td>
        <td style="text-align:center">${b.documentsComplete ? "✓" : '<span style="color:#c0392b">✗ Incomplete</span>'}</td>
      </tr>`;
    }).join("");

    const complianceRows = ranked.map((b) => {
      const v = vendorOf(b.vendorId);
      const ok = (c: boolean) => c ? '<span style="color:#27ae60">✓</span>' : '<span style="color:#c0392b">✗</span>';
      return `<tr>
        <td>${v?.companyName ?? b.vendorId}</td>
        <td style="text-align:center">${ok(!!v?.gst)}</td>
        <td style="text-align:center">${ok(!!v?.pan)}</td>
        <td style="text-align:center">${ok(b.documentsComplete)}</td>
        <td style="text-align:center">${ok(!v?.blacklisted)}</td>
        <td style="font-size:9pt;color:#555">${b.remarks}</td>
      </tr>`;
    }).join("");

    const winnerV = winner ? vendorOf(winner.vendorId) : null;
    const l1V = l1 ? vendorOf(l1.vendorId) : null;
    const l1Var = l1 ? ((l1.bidAmount - tender.estimatedValue) / tender.estimatedValue * 100) : 0;

    const bodyHtml = `
      <div class="doc-title">Comparative Evaluation Report (CER)</div>

      <div class="section-head">A. Tender Details</div>
      <div class="kv"><span class="k">Tender ID:</span>${tender.id}</div>
      <div class="kv"><span class="k">Tender Name:</span>${tender.name}</div>
      <div class="kv"><span class="k">Department:</span>${tender.department}</div>
      <div class="kv"><span class="k">Category:</span>${tender.category}</div>
      <div class="kv"><span class="k">Estimated Value:</span>${fmtINR(tender.estimatedValue)}</div>
      <div class="kv"><span class="k">Bid Closing Date:</span>${fmtDate(tender.endDate)}</div>
      <div class="kv"><span class="k">Status:</span>${tender.status}</div>
      <div class="kv"><span class="k">Total Bids Received:</span>${bids.length}</div>

      <div class="section-head">B. Comparative Statement (QCBS 80:20)</div>
      <p style="font-size:9pt;color:#555;margin:4px 0 6px">Composite = 40% Price + 30% Technical + 20% Past Performance + 10% Compliance</p>
      <table>
        <thead>
          <tr>
            <th>Rank</th><th>Vendor</th><th>Bid Amount</th><th>vs Estimate</th>
            <th>Technical</th><th>Past Perf.</th><th>Compliance</th><th>Composite</th><th>Docs</th>
          </tr>
        </thead>
        <tbody>${bidRows}</tbody>
      </table>

      <div class="section-head">C. Compliance Check</div>
      <table>
        <thead>
          <tr><th>Vendor</th><th>GST</th><th>PAN</th><th>EMD / BG</th><th>Not Blacklisted</th><th>Remarks</th></tr>
        </thead>
        <tbody>${complianceRows}</tbody>
      </table>

      ${winnerV ? `
      <div class="section-head">D. AI-Assisted Recommendation</div>
      <div class="kv"><span class="k">Recommended Vendor (H1):</span><strong>${winnerV.companyName}</strong></div>
      <div class="kv"><span class="k">Composite Score:</span>${winner!.composite.toFixed(1)} / 100</div>
      <div class="kv"><span class="k">Quoted Amount:</span>${fmtINR(winner!.bidAmount)}</div>
      ${l1V ? `<div class="kv"><span class="k">L1 (Lowest Price):</span>${l1V.companyName} — ${fmtINR(l1!.bidAmount)} (${l1Var > 0 ? "+" : ""}${l1Var.toFixed(1)}% vs estimate)</div>` : ""}
      <div class="kv"><span class="k">Risk Flags:</span>${ranked.filter(r => !r.documentsComplete).length} bid(s) with missing EMD/BG &nbsp;·&nbsp; ${ranked.filter(r => vendorOf(r.vendorId)?.blacklisted).length} blacklisted vendor(s)</div>
      ` : ""}

      <div class="stamp">
        <p>Prepared by: AP e-Procurement — AI Evaluation Engine v4.2.1</p>
        <p style="margin-top:50px;border-top:1px solid #bbb;padding-top:8px;width:260px;display:inline-block">
          Signature of Tender Inviting Authority
        </p>
        <p style="margin-top:4px">Designation: ______________________________</p>
        <p>Date: _______________________</p>
        <p>Office Seal:</p>
      </div>
    `;

    printAsPdf(`CER — ${tender.id}`, bodyHtml);
    toast.success("Print dialog opened — choose 'Save as PDF'");
  };

  return (
    <AdminLayout
      title={T("be_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("nav_bid_evaluation") }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCER}>
            <Download className="h-3.5 w-3.5" /> {T("be_export_cer")}
          </Button>
          <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAward} disabled={!tender || tender.status === "Awarded"}>
            <Gavel className="h-3.5 w-3.5" /> {T("be_issue_loa")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Card className="border-l-4 border-l-accent">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-secondary text-primary">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{T("be_select_tender")}</p>
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger className="mt-0.5 h-9 max-w-2xl border-0 bg-transparent p-0 text-sm font-bold text-primary shadow-none focus:ring-0">
                    <SelectValue placeholder={T("be_select_tender")} />
                  </SelectTrigger>
                  <SelectContent>
                    {tenders.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.id} · {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {tender && (
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">{T("tenders_dialog_est_value")}</p>
                  <p className="font-semibold text-primary">{fmtINR(tender.estimatedValue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Closed on</p>
                  <p className="font-semibold text-primary">{fmtDate(tender.endDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bids received</p>
                  <p className="font-semibold text-primary">{bids.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{T("tenders_col_status")}</p>
                  <Badge variant="outline" className="border-accent text-accent">{tender.status}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {tender && winner && l1 && (
          <Card className="border-2 border-accent/40 bg-gradient-to-r from-accent/5 to-transparent">
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">AI-Assisted Recommendation</CardTitle>
              <Badge className="ml-auto bg-accent text-accent-foreground">QCBS 80:20</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded border border-accent/30 bg-card p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-accent">
                  <Trophy className="h-3.5 w-3.5" /> {T("be_winner")}
                </div>
                <p className="mt-1 text-sm font-bold text-primary">{vendorOf(winner.vendorId)?.companyName}</p>
                <p className="text-sm text-muted-foreground">Composite score: <span className="font-semibold text-accent">{winner.composite.toFixed(1)}/100</span></p>
                <p className="text-sm text-muted-foreground">Quoted: {fmtINR(winner.bidAmount)}</p>
              </div>
              <div className="rounded border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-info">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {T("be_l1")}
                </div>
                <p className="mt-1 text-sm font-bold text-primary">{vendorOf(l1.vendorId)?.companyName}</p>
                <p className="text-sm text-muted-foreground">Quoted: <span className="font-semibold">{fmtINR(l1.bidAmount)}</span></p>
                <p className="text-sm text-muted-foreground">Variance vs estimate: {(((l1.bidAmount - tender.estimatedValue) / tender.estimatedValue) * 100).toFixed(1)}%</p>
              </div>
              <div className="rounded border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> Risk Flags
                </div>
                <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                  <li>• {ranked.filter((r) => !r.documentsComplete).length} bid(s) with missing EMD/BG</li>
                  <li>• {ranked.filter((r) => vendorOf(r.vendorId)?.blacklisted).length} blacklisted vendor(s)</li>
                  <li>• Price spread: {((Math.max(...bids.map(b=>b.bidAmount)) - lowestBid) / lowestBid * 100).toFixed(1)}%</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="matrix">
          <TabsList>
            <TabsTrigger value="matrix">{T("be_tab_comparative")}</TabsTrigger>
            <TabsTrigger value="technical">{T("be_tab_ai")}</TabsTrigger>
            <TabsTrigger value="compliance">{T("be_tab_compliance")}</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="mt-3">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/60">
                      <TableHead className="w-12">{T("be_col_rank")}</TableHead>
                      <TableHead>{T("be_col_vendor")}</TableHead>
                      <TableHead className="text-right">{T("be_col_bid")}</TableHead>
                      <TableHead className="text-right">vs Est.</TableHead>
                      <TableHead className="text-center">{T("be_col_technical")}</TableHead>
                      <TableHead className="text-center">{T("be_col_past")}</TableHead>
                      <TableHead className="text-center">{T("be_col_compliance")}</TableHead>
                      <TableHead className="text-right">{T("be_col_composite")}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranked.map((b, i) => {
                      const v = vendorOf(b.vendorId);
                      const variance = tender ? ((b.bidAmount - tender.estimatedValue) / tender.estimatedValue) * 100 : 0;
                      return (
                        <TableRow key={b.vendorId} className={`cursor-pointer hover:bg-secondary/60 transition-colors ${i === 0 ? "bg-accent/5" : ""}`} onClick={() => setSelectedBid(b)}>
                          <TableCell>
                            <Badge variant={i === 0 ? "default" : "outline"} className={i === 0 ? "bg-accent text-accent-foreground" : ""}>
                              {i === 0 ? "H1 ★" : `H${i + 1}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold text-primary">{v?.companyName}</p>
                            <p className="text-xs text-muted-foreground">{b.vendorId} · {b.deliveryDays} days delivery</p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmtINR(b.bidAmount)}</TableCell>
                          <TableCell className={`text-right text-sm font-semibold ${variance < 0 ? "text-success" : "text-warning"}`}>
                            {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center text-sm font-semibold">{b.technicalScore}</TableCell>
                          <TableCell className="text-center text-sm">{b.pastPerformance}</TableCell>
                          <TableCell className="text-center text-sm">{b.complianceScore}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-sm font-bold text-accent">{b.composite.toFixed(1)}</span>
                          </TableCell>
                          <TableCell>
                            {!b.documentsComplete && <Badge variant="destructive" className="text-[10px]">Incomplete</Badge>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {ranked.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">{T("be_no_bids")}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical" className="mt-3 grid gap-3 md:grid-cols-2">
            {ranked.map((b) => {
              const v = vendorOf(b.vendorId);
              return (
                <Card key={b.vendorId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-primary">{v?.companyName}</CardTitle>
                      <Badge variant="outline">{b.vendorId}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{b.remarks}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Technical Capability", val: b.technicalScore },
                      { label: "Past Performance", val: b.pastPerformance },
                      { label: "Compliance", val: b.complianceScore },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className="font-semibold text-primary">{m.val}/100</span>
                        </div>
                        <Progress value={m.val} className="h-1.5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="compliance" className="mt-3">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/60">
                      <TableHead>{T("be_col_vendor")}</TableHead>
                      <TableHead className="text-center">GST</TableHead>
                      <TableHead className="text-center">PAN</TableHead>
                      <TableHead className="text-center">EMD / BG</TableHead>
                      <TableHead className="text-center">Blacklist</TableHead>
                      <TableHead>{T("be_col_remarks")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranked.map((b) => {
                      const v = vendorOf(b.vendorId);
                      const ok = (cond: boolean) => cond ? <CheckCircle2 className="mx-auto h-4 w-4 text-success" /> : <XCircle className="mx-auto h-4 w-4 text-destructive" />;
                      return (
                        <TableRow key={b.vendorId} className="cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => setSelectedBid(b)}>
                          <TableCell className="text-sm font-semibold text-primary">{v?.companyName}</TableCell>
                          <TableCell className="text-center">{ok(!!v?.gst)}</TableCell>
                          <TableCell className="text-center">{ok(!!v?.pan)}</TableCell>
                          <TableCell className="text-center">{ok(b.documentsComplete)}</TableCell>
                          <TableCell className="text-center">{ok(!v?.blacklisted)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{b.remarks}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {tender && tender.status === "Closed" && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleMarkEvaluated} className="gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5" /> {T("be_mark_evaluated")}
            </Button>
          </div>
        )}
      </div>

      {/* Bid detail popup */}
      <Dialog open={!!selectedBid} onOpenChange={(o) => !o && setSelectedBid(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedBid && (() => {
            const v = vendorOf(selectedBid.vendorId);
            const rank = ranked.indexOf(selectedBid) + 1;
            const variance = tender ? ((selectedBid.bidAmount - tender.estimatedValue) / tender.estimatedValue) * 100 : 0;
            const priceScore = lowestBid ? (lowestBid / selectedBid.bidAmount) * 100 : 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-primary">
                    <Badge className={rank === 1 ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground"}>
                      {rank === 1 ? "H1 ★" : `H${rank}`}
                    </Badge>
                    {v?.companyName ?? selectedBid.vendorId}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Vendor profile */}
                  {v && (
                    <div className="rounded-sm border border-border bg-secondary/20 p-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" /> Vendor Profile
                      </p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div><p className="text-muted-foreground">Vendor ID</p><p className="font-mono font-semibold">{v.id}</p></div>
                        <div><p className="text-muted-foreground">Category</p><p className="font-semibold">{v.category}</p></div>
                        <div><p className="text-muted-foreground">GST No.</p><p className="font-mono">{v.gst || "—"}</p></div>
                        <div><p className="text-muted-foreground">PAN No.</p><p className="font-mono">{v.pan || "—"}</p></div>
                        {v.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /><p>{v.email}</p></div>}
                        {v.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /><p>{v.phone}</p></div>}
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          {v.blacklisted
                            ? <Badge variant="destructive" className="rounded-sm text-[10px]">Blacklisted</Badge>
                            : <Badge className="rounded-sm bg-success text-[10px] text-success-foreground">Active</Badge>}
                        </div>
                        <div><p className="text-muted-foreground">Tenders Completed</p><p className="font-semibold">{v.completedTenders}</p></div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Bid details */}
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Bid Details</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-sm border border-border bg-card p-3">
                        <p className="text-muted-foreground">Quoted Amount</p>
                        <p className="mt-0.5 text-lg font-bold text-primary">{fmtINR(selectedBid.bidAmount)}</p>
                        <p className={`text-xs font-semibold ${variance < 0 ? "text-success" : "text-warning"}`}>
                          {variance > 0 ? "+" : ""}{variance.toFixed(1)}% vs estimate
                        </p>
                      </div>
                      <div className="rounded-sm border border-border bg-card p-3">
                        <p className="text-muted-foreground">Delivery Schedule</p>
                        <p className="mt-0.5 text-lg font-bold text-primary">{selectedBid.deliveryDays} days</p>
                        <p className="text-xs text-muted-foreground">from contract date</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Score breakdown */}
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Score Breakdown (QCBS 80:20)</p>
                    <div className="space-y-3">
                      {[
                        { label: "Price Score (40%)", val: priceScore, weight: 0.4 },
                        { label: "Technical Capability (30%)", val: selectedBid.technicalScore, weight: 0.3 },
                        { label: "Past Performance (20%)", val: selectedBid.pastPerformance, weight: 0.2 },
                        { label: "Compliance (10%)", val: selectedBid.complianceScore, weight: 0.1 },
                      ].map(({ label, val, weight }) => (
                        <div key={label}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold text-foreground">{val.toFixed(1)} <span className="text-muted-foreground text-xs">(weighted: {(val * weight).toFixed(1)})</span></span>
                          </div>
                          <Progress value={val} className="h-2" />
                        </div>
                      ))}
                      <div className="mt-3 flex items-center justify-between rounded-sm border border-accent/40 bg-accent/5 px-3 py-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                          <Star className="h-3.5 w-3.5 fill-accent" /> Composite Score
                        </div>
                        <span className="text-xl font-bold text-accent">{selectedBid.composite.toFixed(1)}<span className="text-sm text-muted-foreground">/100</span></span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Compliance */}
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Compliance Status</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { label: "GST Registration", ok: !!v?.gst },
                        { label: "PAN Card", ok: !!v?.pan },
                        { label: "EMD / Bank Guarantee", ok: selectedBid.documentsComplete },
                        { label: "Not Blacklisted", ok: !v?.blacklisted },
                      ].map(({ label, ok }) => (
                        <div key={label} className={`flex items-center gap-2 rounded-sm border px-3 py-2 ${ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
                          {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" /> : <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                          <span className={ok ? "text-success" : "text-destructive"}>{label}</span>
                        </div>
                      ))}
                    </div>
                    {selectedBid.remarks && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        Remarks: {selectedBid.remarks}
                      </p>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
