import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { tenders, type Tender, type TenderStatus } from "@/data/tenders";
import { StatusBadge } from "./StatusBadge";
import {
  Search, ArrowUpDown, FileText, Building2, User, IndianRupee,
  Calendar, Hash, Tag, Layers, MapPin, ClipboardList, Trophy,
  FileCheck, AlertCircle, CheckCircle2, Clock, XCircle,
} from "lucide-react";

const statuses: (TenderStatus | "All")[] = ["All", "Open", "Under Review", "Awarded", "Draft", "Closed"];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const daysLeft = (deadline: string) =>
  Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);

function InfoBlock({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-sm border border-border/60 bg-secondary/20 px-3 py-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

const BID_STATUS_META: Record<string, { icon: React.ElementType; cls: string }> = {
  L1:               { icon: Trophy,        cls: "text-success bg-success/10" },
  L2:               { icon: CheckCircle2,  cls: "text-primary bg-primary/10" },
  L3:               { icon: CheckCircle2,  cls: "text-primary bg-primary/10" },
  "Under Evaluation": { icon: Clock,       cls: "text-warning bg-warning/10" },
  Disqualified:     { icon: XCircle,       cls: "text-destructive bg-destructive/10" },
};

function TenderDetailDialog({ tender, open, onClose }: { tender: Tender | null; open: boolean; onClose: () => void }) {
  if (!tender) return null;
  const days = daysLeft(tender.deadline);
  const savings = tender.awardedValue ? tender.value - tender.awardedValue : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {/* ── Header ── */}
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base leading-snug">{tender.title}</DialogTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{tender.id}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{tender.nitNo}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={tender.status} />
            {days > 0 ? (
              <span className="rounded-sm bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {days} day{days !== 1 ? "s" : ""} to bid close
              </span>
            ) : (
              <span className="rounded-sm bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                Bid period closed
              </span>
            )}
            {tender.awardedTo && (
              <span className="rounded-sm bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Awarded
              </span>
            )}
          </div>
        </DialogHeader>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="h-8 w-full rounded-sm">
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="bids" className="flex-1 text-xs">
              Bids ({tender.bids})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 text-xs">
              Documents ({tender.documents.length})
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <InfoBlock icon={Hash}       label="Tender ID"        value={tender.id} />
              <InfoBlock icon={Tag}        label="Category"         value={tender.category} />
              <InfoBlock icon={Building2}  label="Department"       value={tender.department} />
              <InfoBlock icon={User}       label="Officer In-Charge" value={tender.officer} />
              <InfoBlock icon={MapPin}     label="Location"         value={tender.location} />
              <InfoBlock icon={IndianRupee} label="Estimated Value" value={fmtCurrency(tender.value)} />
              <InfoBlock icon={IndianRupee} label="EMD / Bid Security" value={fmtCurrency(tender.emd)} />
              <InfoBlock icon={Layers}     label="Total Bids Received" value={`${tender.bids} bid${tender.bids !== 1 ? "s" : ""}`} />
              <InfoBlock icon={Calendar}   label="Published Date"   value={fmtDate(tender.publishedDate)} />
              <InfoBlock icon={Calendar}   label="Bid Closing Date" value={
                <span>{fmtDate(tender.deadline)}{days > 0 && <span className="ml-1 text-xs text-muted-foreground">({days}d left)</span>}</span>
              } />
              <div className="col-span-2">
                <InfoBlock icon={Calendar} label="Bid Opening Date" value={fmtDate(tender.openingDate)} />
              </div>
            </div>

            {tender.awardedTo && (
              <div className="rounded-sm border border-success/40 bg-success/5 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                  <Trophy className="h-3.5 w-3.5" /> Award Details
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Awarded To</span>
                    <p className="font-medium">{tender.awardedTo}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Awarded Value</span>
                    <p className="font-medium">{fmtCurrency(tender.awardedValue!)}</p>
                  </div>
                  {savings !== null && (
                    <div className="col-span-2">
                      <span className="text-xs text-muted-foreground">Savings vs Estimate</span>
                      <p className="font-medium text-success">{fmtCurrency(savings)} ({((savings / tender.value) * 100).toFixed(1)}%)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-sm border border-border/60 bg-secondary/10 p-3 text-sm text-foreground/80 leading-relaxed">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scope of Work</p>
              {tender.description}
            </div>

            <div className="rounded-sm border border-border/60 bg-secondary/10 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <AlertCircle className="h-3 w-3" /> Eligibility Criteria
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{tender.eligibility}</p>
            </div>
          </TabsContent>

          {/* ── BIDS ── */}
          <TabsContent value="bids" className="mt-3">
            {tender.bidEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-30" />
                <p>No bids received yet.</p>
                {tender.status === "Draft" && <p className="text-xs">Tender is in Draft — bids open after publishing.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Total Bids</p>
                    <p className="text-lg font-bold text-foreground">{tender.bids}</p>
                  </div>
                  <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Lowest Bid</p>
                    <p className="text-sm font-bold text-success">{fmtCurrency(Math.min(...tender.bidEntries.map(b => b.amount)))}</p>
                  </div>
                  <div className="rounded-sm border border-border/60 bg-secondary/20 px-3 py-2">
                    <p className="text-[10px] uppercase text-muted-foreground">Highest Bid</p>
                    <p className="text-sm font-bold text-destructive">{fmtCurrency(Math.max(...tender.bidEntries.map(b => b.amount)))}</p>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[10px] uppercase text-muted-foreground">
                      <th className="pb-1.5 pr-2">Rank</th>
                      <th className="pb-1.5 pr-2">Bidder</th>
                      <th className="pb-1.5 pr-2 text-right">Bid Amount</th>
                      <th className="pb-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {tender.bidEntries.map((b) => {
                      const meta = BID_STATUS_META[b.status] ?? BID_STATUS_META["Under Evaluation"];
                      const Icon = meta.icon;
                      return (
                        <tr key={b.rank} className="group">
                          <td className="py-2 pr-2 font-mono text-xs text-muted-foreground">#{b.rank}</td>
                          <td className="py-2 pr-2 font-medium">{b.bidder}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{fmtCurrency(b.amount)}</td>
                          <td className="py-2 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
                              <Icon className="h-2.5 w-2.5" /> {b.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {tender.bids > tender.bidEntries.length && (
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    + {tender.bids - tender.bidEntries.length} additional bid{tender.bids - tender.bidEntries.length !== 1 ? "s" : ""} under processing
                  </p>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── DOCUMENTS ── */}
          <TabsContent value="documents" className="mt-3">
            <ul className="divide-y divide-border/50">
              {tender.documents.map((doc, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                  <span className="flex-1 text-sm font-medium">{doc}</span>
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">PDF</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Documents available after DSC-based login on AP e-Procurement portal
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export function TenderTable() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(TenderStatus | "All")>("All");
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<Tender | null>(null);

  const rows = useMemo(() => {
    let r = tenders.filter((t) => {
      const q = query.toLowerCase();
      const matchQ =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.officer.toLowerCase().includes(q);
      const matchS = status === "All" || t.status === status;
      return matchQ && matchS;
    });
    r = [...r].sort((a, b) => (sortDesc ? b.value - a.value : a.value - b.value));
    return r;
  }, [query, status, sortDesc]);

  return (
    <>
      <Card className="border-border/60 shadow-elegant">
        <CardHeader className="flex flex-col gap-4 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Active tenders</CardTitle>
            <p className="text-xs text-muted-foreground">{rows.length} of {tenders.length} shown</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tenders, officer…"
                className="pl-9 sm:w-72"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as TenderStatus | "All")}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => setSortDesc((s) => !s)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Value <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Bids</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Officer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow
                    key={t.id}
                    className="cursor-pointer border-border/50 transition-colors hover:bg-accent/5"
                    onClick={() => setSelected(t)}
                  >
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="font-medium text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.category}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.department}</TableCell>
                    <TableCell className="font-medium tabular-nums">{fmtCurrency(t.value)}</TableCell>
                    <TableCell className="text-center tabular-nums">{t.bids}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(t.deadline)}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="pr-6 text-right text-sm text-foreground/80">{t.officer}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                      No tenders match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TenderDetailDialog
        tender={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
