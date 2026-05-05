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
import { tenders, type Tender, type TenderStatus } from "@/data/tenders";
import { StatusBadge } from "./StatusBadge";
import { Search, ArrowUpDown, FileText, Building2, User, IndianRupee, Calendar, Hash, Tag, Layers } from "lucide-react";

const statuses: (TenderStatus | "All")[] = ["All", "Open", "Under Review", "Awarded", "Draft", "Closed"];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const daysLeft = (deadline: string) => {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  return diff;
};

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-sm border border-border/50 bg-secondary/30 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function TenderDetailDialog({ tender, open, onClose }: { tender: Tender | null; open: boolean; onClose: () => void }) {
  if (!tender) return null;
  const days = daysLeft(tender.deadline);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base leading-snug">{tender.title}</DialogTitle>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{tender.id}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={tender.status} />
          {days > 0 ? (
            <span className="rounded-sm bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              {days} day{days !== 1 ? "s" : ""} remaining
            </span>
          ) : (
            <span className="rounded-sm bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              Deadline passed
            </span>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <DetailRow icon={Hash} label="Tender ID" value={tender.id} />
          <DetailRow icon={Tag} label="Category" value={tender.category} />
          <DetailRow icon={Building2} label="Department" value={tender.department} />
          <DetailRow icon={User} label="Officer In-Charge" value={tender.officer} />
          <DetailRow
            icon={IndianRupee}
            label="Estimated Value"
            value={fmtCurrency(tender.value)}
          />
          <DetailRow icon={Layers} label="Total Bids" value={`${tender.bids} bid${tender.bids !== 1 ? "s" : ""} received`} />
          <div className="col-span-2">
            <DetailRow
              icon={Calendar}
              label="Bid Closing Date"
              value={
                <span>
                  {fmtDate(tender.deadline)}
                  {days > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">({days} days left)</span>
                  )}
                </span>
              }
            />
          </div>
        </div>
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
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
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
