import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdmin, fmtINR, fmtDate } from "@/store/admin-store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, Filter, Printer, TrendingUp, Wallet, Users, FileSpreadsheet, FileBarChart, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useT } from "@/lib/useT";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PIE = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

export default function Reports() {
  const { tenders, vendors } = useAdmin();
  const T = useT();
  const [period, setPeriod] = useState<"month" | "quarter" | "fy">("fy");
  const [department, setDepartment] = useState<string>("all");

  useEffect(() => {
    document.title = "MIS Reports — AP e-Procurement";
  }, []);

  const departments = useMemo(() => Array.from(new Set(tenders.map((t) => t.department))), [tenders]);

  const filtered = useMemo(
    () => tenders.filter((t) => department === "all" || t.department === department),
    [tenders, department]
  );

  const totalValue = filtered.reduce((s, t) => s + t.estimatedValue, 0);
  const awarded = filtered.filter((t) => t.status === "Awarded");
  const awardedValue = awarded.reduce((s, t) => s + t.estimatedValue, 0);
  const successRate = filtered.length ? Math.round((awarded.length / filtered.length) * 100) : 0;

  const byCategory = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    filtered.forEach((t) => {
      const cur = m.get(t.category) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += t.estimatedValue;
      m.set(t.category, cur);
    });
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v }));
  }, [filtered]);

  const byDept = useMemo(() => {
    const m = new Map<string, { count: number; value: number }>();
    filtered.forEach((t) => {
      const cur = m.get(t.department) ?? { count: 0, value: 0 };
      cur.count += 1;
      cur.value += t.estimatedValue;
      m.set(t.department, cur);
    });
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v }));
  }, [filtered]);

  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((t) => m.set(t.status, (m.get(t.status) ?? 0) + 1));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const monthly = useMemo(() => {
    const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
    return months.map((month, i) => ({
      month,
      published: 14 + i * 3 + (i % 2 ? 2 : 0),
      awarded: 8 + i * 2,
      value: 120 + i * 18,
    }));
  }, []);

  const downloadCsv = (rows: Record<string, unknown>[], filename: string) => {
    if (!rows.length) {
      toast({ title: "No data to export", description: "Adjust filters or wait for data to load.", variant: "destructive" });
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const STANDARD_REPORTS = [
    { id: "R-01", title: "NIT Publishing Register (GFR-2017 Form-1)", desc: "All tenders published with NIT references, dates and estimated value.", icon: FileText },
    { id: "R-02", title: "Bid Evaluation Summary (CVC Format)", desc: "Comparative bid statement and L1/H1 with technical scoring.", icon: FileBarChart },
    { id: "R-03", title: "Award & LoA Register", desc: "All Letters of Award issued, vendor-wise contract values and timelines.", icon: FileSpreadsheet },
    { id: "R-04", title: "Vendor Participation Report", desc: "Bidder turnout, MSE participation, blacklisting events.", icon: Users },
    { id: "R-05", title: "Procurement Cycle Time", desc: "Avg. days from NIT to LoA, department-wise breakdown.", icon: TrendingUp },
    { id: "R-06", title: "Estimated vs Awarded Value Variance", desc: "Cost savings / overruns vs. departmental estimates.", icon: Wallet },
  ];

  return (
    <AdminLayout
      title={T("reports_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("nav_reports") }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-sm border-primary/40 text-xs text-primary hover:bg-secondary" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" className="h-8 gap-1.5 rounded-sm bg-accent text-xs text-accent-foreground hover:bg-accent/90"
            onClick={() => downloadCsv(filtered.map((t) => ({ id: t.id, name: t.name, dept: t.department, category: t.category, value: t.estimatedValue, status: t.status, endDate: t.endDate })), "mis-tenders.csv")}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-sm border border-border bg-card p-3 shadow-sm">
        <Filter className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">Filters:</span>
        <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} className="h-8 rounded-sm border border-input bg-background px-2 text-xs">
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="fy">FY 2025-26</option>
        </select>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="h-8 rounded-sm border border-input bg-background px-2 text-xs">
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <span className="ml-auto text-[11px] text-muted-foreground">Showing {filtered.length} tenders · Generated 23-Apr-2026 09:42 IST</span>
      </div>

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Total NITs", value: filtered.length, icon: FileText, tone: "text-primary" },
          { label: "Estimated Value", value: fmtINR(totalValue), icon: Wallet, tone: "text-accent" },
          { label: "Contracts Awarded", value: awarded.length, icon: BarChart3, tone: "text-success" },
          { label: "Award Success Rate", value: `${successRate}%`, icon: TrendingUp, tone: "text-info" },
        ].map((k) => (
          <div key={k.label} className="rounded-sm border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <k.icon className={`h-4 w-4 ${k.tone}`} />
            </div>
            <p className={`mt-1 text-xl font-bold ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="rounded-sm bg-secondary">
          <TabsTrigger value="dashboard" className="rounded-sm text-xs">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="standard" className="rounded-sm text-xs">Standard Reports</TabsTrigger>
          <TabsTrigger value="register" className="rounded-sm text-xs">Tender Register</TabsTrigger>
          <TabsTrigger value="vendor" className="rounded-sm text-xs">Vendor Performance</TabsTrigger>
        </TabsList>

        {/* Dashboard tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-sm border border-border bg-card shadow-sm">
              <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Monthly Procurement Volume</h3>
              </div>
              <div className="p-3" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="published" fill="hsl(var(--primary))" name="Published" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="awarded" fill="hsl(var(--accent))" name="Awarded" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-sm border border-border bg-card shadow-sm">
              <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Status Distribution</h3>
              </div>
              <div className="p-3" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 11 }}>
                      {byStatus.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-sm border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-accent bg-secondary/60 px-3 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">By Category</h3>
                <button className="text-[11px] text-info hover:underline" onClick={() => downloadCsv(byCategory, "by-category.csv")}>Export</button>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">NITs</th>
                    <th className="px-3 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byCategory.map((r) => (
                    <tr key={r.name} className="hover:bg-secondary/40">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-right">{r.count}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtINR(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-sm border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-accent bg-secondary/60 px-3 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">By Department</h3>
                <button className="text-[11px] text-info hover:underline" onClick={() => downloadCsv(byDept, "by-department.csv")}>Export</button>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-right">NITs</th>
                    <th className="px-3 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byDept.map((r) => (
                    <tr key={r.name} className="hover:bg-secondary/40">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-right">{r.count}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtINR(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Standard reports */}
        <TabsContent value="standard">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {STANDARD_REPORTS.map((r) => (
              <div key={r.id} className="rounded-sm border border-border bg-card p-4 shadow-sm transition hover:border-accent hover:shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="rounded-sm bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{r.id}</span>
                  <r.icon className="h-4 w-4 text-accent" />
                </div>
                <h4 className="text-sm font-semibold leading-snug text-foreground">{r.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 rounded-sm text-[11px]"
                    onClick={() => downloadCsv(filtered.map((t) => ({ id: t.id, name: t.name, dept: t.department, value: t.estimatedValue, status: t.status })), `${r.id}.csv`)}>
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                  <Button size="sm" className="h-7 flex-1 gap-1 rounded-sm bg-primary text-[11px] text-primary-foreground hover:bg-primary/90" onClick={() => window.print()}>
                    <FileText className="h-3 w-3" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Tender register */}
        <TabsContent value="register">
          <div className="rounded-sm border border-border bg-card shadow-sm">
            <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Detailed Tender Register</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">NIT No.</th>
                    <th className="px-3 py-2 text-left">Tender</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-left">Closing</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/40">
                      <td className="px-3 py-2 font-mono text-[11px] text-info">{t.id}</td>
                      <td className="px-3 py-2 font-medium">{t.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.department}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.category}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtINR(t.estimatedValue)}</td>
                      <td className="px-3 py-2">{fmtDate(t.endDate)}</td>
                      <td className="px-3 py-2"><Badge variant="secondary" className="rounded-sm text-[10px]">{t.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Vendor performance */}
        <TabsContent value="vendor">
          <div className="rounded-sm border border-border bg-card shadow-sm">
            <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Vendor Performance Matrix</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Vendor ID</th>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-right">Completed</th>
                    <th className="px-3 py-2 text-right">Performance</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-secondary/40">
                      <td className="px-3 py-2 font-mono text-[11px] text-info">{v.id}</td>
                      <td className="px-3 py-2 font-medium">{v.companyName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.category}</td>
                      <td className="px-3 py-2 text-right">{v.completedTenders}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-bold ${v.pastPerformance >= 85 ? "text-success" : v.pastPerformance >= 70 ? "text-warning" : "text-destructive"}`}>
                          {v.pastPerformance}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {v.blacklisted
                          ? <Badge variant="destructive" className="rounded-sm text-[10px]">Blacklisted</Badge>
                          : <Badge variant="secondary" className="rounded-sm text-[10px]">Active</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <p className="mt-4 flex items-center gap-1 text-[11px] text-muted-foreground">
        <ChevronRight className="h-3 w-3" /> Reports compliant with GFR 2017, CVC Manual on Procurement and AP Financial Code.
      </p>
    </AdminLayout>
  );
}