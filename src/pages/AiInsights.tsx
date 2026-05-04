import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdmin, fmtINR, fmtDate } from "@/store/admin-store";
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Brain, Target,
  Lightbulb, Activity, Gauge, FileSearch, BarChart3, Users, Clock, CheckCircle2, XCircle, ArrowRight, Zap,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  LineChart, Line,
} from "recharts";
import { useT } from "@/lib/useT";

type Risk = "Low" | "Medium" | "High";

interface AnomalyFlag {
  id: string;
  tenderId: string;
  tenderName: string;
  type: string;
  severity: Risk;
  description: string;
  recommendation: string;
}

const RISK_TONE: Record<Risk, string> = {
  Low: "bg-success/15 text-success border-success/30",
  Medium: "bg-warning/15 text-warning border-warning/30",
  High: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function AiInsights() {
  const { tenders, vendors } = useAdmin();
  const T = useT();
  const [refreshedAt] = useState(new Date());

  const insights = useMemo(() => {
    const total = tenders.length;
    const awarded = tenders.filter((t) => t.status === "Awarded");
    const closedOrLater = tenders.filter((t) => ["Closed", "Evaluated", "Awarded"].includes(t.status));
    const totalValue = tenders.reduce((s, t) => s + t.estimatedValue, 0);
    const awardedValue = awarded.reduce((s, t) => s + t.estimatedValue, 0);
    const savingsEstimate = Math.round(awardedValue * 0.074); // mock 7.4% savings
    const cycleAvg = 18; // days, mock
    const fraudFlags = 3; // mock
    const avgVendorScore = Math.round(vendors.reduce((s, v) => s + v.pastPerformance, 0) / Math.max(vendors.length, 1));
    return { total, awarded: awarded.length, closedOrLater: closedOrLater.length, totalValue, awardedValue, savingsEstimate, cycleAvg, fraudFlags, avgVendorScore };
  }, [tenders, vendors]);

  const categoryData = useMemo(() => {
    const map = new Map<string, { category: string; count: number; value: number }>();
    tenders.forEach((t) => {
      const e = map.get(t.category) ?? { category: t.category, count: 0, value: 0 };
      e.count += 1; e.value += t.estimatedValue;
      map.set(t.category, e);
    });
    return Array.from(map.values());
  }, [tenders]);

  const trendData = useMemo(
    () => [
      { month: "Nov", tenders: 12, awarded: 8, savings: 4.2 },
      { month: "Dec", tenders: 15, awarded: 11, savings: 5.8 },
      { month: "Jan", tenders: 18, awarded: 14, savings: 6.4 },
      { month: "Feb", tenders: 21, awarded: 17, savings: 7.1 },
      { month: "Mar", tenders: 24, awarded: 19, savings: 7.4 },
      { month: "Apr", tenders: 22, awarded: 18, savings: 7.9 },
    ],
    []
  );

  const vendorRadar = useMemo(
    () => [
      { metric: "Quality", score: 88 },
      { metric: "Delivery", score: 82 },
      { metric: "Price", score: 76 },
      { metric: "Compliance", score: 94 },
      { metric: "Past Perf.", score: insights.avgVendorScore },
      { metric: "Capacity", score: 79 },
    ],
    [insights.avgVendorScore]
  );

  const anomalies: AnomalyFlag[] = useMemo(() => [
    {
      id: "AN-01",
      tenderId: tenders[0]?.id ?? "TND-2025-041",
      tenderName: tenders[0]?.name ?? "Construction of 4-Lane Bypass",
      type: "Bid Clustering",
      severity: "High",
      description: "Three bids fall within 0.4% of each other — possible cartel behaviour or bid rigging signal.",
      recommendation: "Trigger CVC-style review. Cross-check vendor ownership and bank account linkages.",
    },
    {
      id: "AN-02",
      tenderId: tenders[1]?.id ?? "TND-2025-042",
      tenderName: tenders[1]?.name ?? "Smart Classroom Equipment",
      type: "Single Bidder Risk",
      severity: "Medium",
      description: "Only 1 valid bid received against 5 eligible vendors. Tender may be over-specified.",
      recommendation: "Consider re-tender with relaxed eligibility or extend deadline by 7 days.",
    },
    {
      id: "AN-03",
      tenderId: "VND-1006",
      tenderName: "Krishna Valley Traders",
      type: "Vendor Compliance",
      severity: "High",
      description: "Vendor flagged as blacklisted but appears in 2 active eligibility lists.",
      recommendation: "Auto-remove from eligibility and notify Tender Inviting Authority.",
    },
    {
      id: "AN-04",
      tenderId: tenders[2]?.id ?? "TND-2025-043",
      tenderName: tenders[2]?.name ?? "Generic Medicines",
      type: "Price Variance",
      severity: "Low",
      description: "L1 quote is 12.6% below estimate — within acceptable range, monitor performance.",
      recommendation: "Approve subject to standard performance bank guarantee.",
    },
  ], [tenders]);

  const recommendations = [
    { title: "Re-tender low-participation NITs early", impact: "+8% bidder turnout", icon: Users },
    { title: "Standardise BoQ templates for civil works", impact: "−4 days avg cycle", icon: Clock },
    { title: "Auto-block blacklisted vendors at NIT stage", impact: "Eliminates 3 risk events/qtr", icon: ShieldCheck },
    { title: "Bundle Q2 medicine indents into rate contract", impact: "≈ ₹38L estimated savings", icon: Target },
  ];

  const forecasts = [
    { label: "Q2 FY26 Tender Volume", value: "27 NITs", trend: "+12.5%", up: true },
    { label: "Projected Award Value", value: fmtINR(620000000), trend: "+9.1%", up: true },
    { label: "Avg. Cycle Time", value: "16.2 days", trend: "−2.0 days", up: true },
    { label: "Risk Events", value: "4 expected", trend: "−25%", up: true },
  ];

  return (
    <AdminLayout
      title={T("ai_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("nav_ai_insights") }]}
      actions={
        <>
          <Badge variant="outline" className="border-info/40 bg-info/10 text-info">
            <Activity className="mr-1 h-3 w-3" /> Model: ProcureAI v3.2
          </Badge>
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileSearch className="h-3.5 w-3.5" /> Export Briefing
          </Button>
          <Button size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Re-run Analysis
          </Button>
        </>
      }
    >
      {/* Hero summary */}
      <Card className="mb-5 border-l-4 border-l-accent bg-gradient-to-br from-secondary/40 to-background">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2.5 text-primary">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Executive Summary · Generated {refreshedAt.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
              </p>
              <h3 className="mt-0.5 text-base font-bold text-primary">
                Procurement health is <span className="text-success">strong</span>. {insights.fraudFlags} risk events require attention.
              </h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                Across <strong>{insights.total}</strong> active tenders worth <strong>{fmtINR(insights.totalValue)}</strong>, ProcureAI estimates
                <strong className="text-success"> {fmtINR(insights.savingsEstimate)}</strong> in cumulative savings (~7.4% under estimate).
                Cycle time has improved <strong>14%</strong> QoQ. <strong>3 anomalies</strong> flagged for review — see below.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            <Stat label="Health Score" value="86" suffix="/100" tone="success" />
            <Stat label="Risk Index" value="Low" tone="success" />
            <Stat label="Confidence" value="92%" tone="info" />
          </div>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard icon={Gauge} label="Avg. Bid Cycle" value={`${insights.cycleAvg} days`} delta="−2.4 days" up />
        <KpiCard icon={TrendingDown} label="Estimated Savings" value={fmtINR(insights.savingsEstimate)} delta="7.4% under est." up />
        <KpiCard icon={ShieldCheck} label="Compliance Score" value="94%" delta="+2.1%" up />
        <KpiCard icon={AlertTriangle} label="Open Risk Flags" value={String(insights.fraudFlags)} delta="2 High · 1 Med" />
      </div>

      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList className="bg-secondary/60">
          <TabsTrigger value="risk" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Risk & Anomalies</TabsTrigger>
          <TabsTrigger value="forecast" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Forecasts</TabsTrigger>
          <TabsTrigger value="vendors" className="gap-1.5"><Users className="h-3.5 w-3.5" />Vendor Intelligence</TabsTrigger>
          <TabsTrigger value="reco" className="gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Recommendations</TabsTrigger>
        </TabsList>

        {/* RISK */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader className="border-b border-border bg-secondary/40 py-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">
                Detected Anomalies — Auto-flagged by ProcureAI
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead className="text-[11px] uppercase">Reference</TableHead>
                    <TableHead className="text-[11px] uppercase">Type</TableHead>
                    <TableHead className="text-[11px] uppercase">Severity</TableHead>
                    <TableHead className="text-[11px] uppercase">Finding & Recommendation</TableHead>
                    <TableHead className="text-[11px] uppercase text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="align-top">
                        <p className="font-mono text-xs font-semibold text-primary">{a.tenderId}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{a.tenderName}</p>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="text-[11px]">{a.type}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${RISK_TONE[a.severity]}`}>
                          {a.severity}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md align-top">
                        <p className="text-xs text-foreground">{a.description}</p>
                        <p className="mt-1 flex items-start gap-1 text-[11px] text-info">
                          <Lightbulb className="mt-0.5 h-3 w-3 flex-shrink-0" /> {a.recommendation}
                        </p>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <Button size="sm" variant="outline" className="gap-1 text-xs">
                          Investigate <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="border-b border-border bg-secondary/40 py-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {[
                  { label: "Bid Rigging Indicators", val: 18, tone: "destructive" },
                  { label: "Single-Bidder Tenders", val: 32, tone: "warning" },
                  { label: "Vendor Compliance Gaps", val: 12, tone: "destructive" },
                  { label: "Price Variance > 15%", val: 24, tone: "warning" },
                  { label: "Document Authenticity", val: 6, tone: "success" },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-foreground">{r.label}</span>
                      <span className={`font-semibold text-${r.tone}`}>{r.val}%</span>
                    </div>
                    <Progress value={r.val} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-border bg-secondary/40 py-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">CVC Compliance Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                {[
                  { ok: true, t: "All NITs published with ≥21 days bid window" },
                  { ok: true, t: "EMD & PBG verified for awarded contracts" },
                  { ok: false, t: "2 tenders missing pre-bid meeting record" },
                  { ok: true, t: "Bid evaluation committee constituted as per GFR" },
                  { ok: true, t: "No conflict-of-interest declarations pending" },
                  { ok: false, t: "1 vendor reverification overdue (KYC)" },
                ].map((c, i) => (
                  <div key={i} className="flex items-start gap-2 rounded border border-border bg-background px-3 py-2 text-xs">
                    {c.ok ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-destructive" />
                    )}
                    <span className={c.ok ? "text-foreground" : "font-medium text-destructive"}>{c.t}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FORECASTS */}
        <TabsContent value="forecast" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {forecasts.map((f) => (
              <Card key={f.label}>
                <CardContent className="p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                  <p className="mt-1 text-lg font-bold text-primary">{f.value}</p>
                  <p className={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${f.up ? "text-success" : "text-destructive"}`}>
                    <TrendingUp className="h-3 w-3" /> {f.trend}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="border-b border-border bg-secondary/40 py-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">6-Month Procurement Trend & Forecast</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="tenders" stroke="hsl(var(--primary))" strokeWidth={2} name="NITs Issued" />
                    <Line type="monotone" dataKey="awarded" stroke="hsl(var(--success))" strokeWidth={2} name="Awarded" />
                    <Line type="monotone" dataKey="savings" stroke="hsl(var(--accent))" strokeWidth={2} name="Savings %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border bg-secondary/40 py-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">Category-wise Spend Forecast</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 10000000).toFixed(1)}Cr`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmtINR(v)} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tender Value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VENDORS */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader className="border-b border-border bg-secondary/40 py-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">Vendor Capability Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={vendorRadar}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Avg" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="border-b border-border bg-secondary/40 py-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">Top Performing Vendors (AI Scored)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead className="text-[11px] uppercase">Vendor</TableHead>
                      <TableHead className="text-[11px] uppercase">Category</TableHead>
                      <TableHead className="text-[11px] uppercase text-center">Tenders</TableHead>
                      <TableHead className="text-[11px] uppercase">AI Score</TableHead>
                      <TableHead className="text-[11px] uppercase">Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.filter((v) => !v.blacklisted).sort((a, b) => b.pastPerformance - a.pastPerformance).slice(0, 5).map((v) => {
                      const reco = v.pastPerformance >= 88 ? { t: "Preferred", tone: "success" } : v.pastPerformance >= 80 ? { t: "Eligible", tone: "info" } : { t: "Monitor", tone: "warning" };
                      return (
                        <TableRow key={v.id}>
                          <TableCell>
                            <p className="text-xs font-semibold text-foreground">{v.companyName}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{v.id}</p>
                          </TableCell>
                          <TableCell className="text-xs">{v.category}</TableCell>
                          <TableCell className="text-center font-mono text-xs">{v.completedTenders}</TableCell>
                          <TableCell className="w-40">
                            <div className="flex items-center gap-2">
                              <Progress value={v.pastPerformance} className="h-1.5 flex-1" />
                              <span className="font-mono text-xs font-semibold text-primary">{v.pastPerformance}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${RISK_TONE[reco.tone === "success" ? "Low" : reco.tone === "info" ? "Low" : "Medium"]}`}>
                              {reco.t}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RECO */}
        <TabsContent value="reco" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {recommendations.map((r) => (
              <Card key={r.title} className="border-l-4 border-l-accent">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="rounded-md bg-accent/15 p-2 text-accent">
                    <r.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Projected impact: <span className="font-semibold text-success">{r.impact}</span></p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs">
                    Apply <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="border-b border-border bg-secondary/40 py-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                <Zap className="h-4 w-4 text-accent" /> Suggested Next Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {[
                { d: fmtDate(new Date().toISOString()), action: "Review 2 high-severity anomalies on TND-2025-041 and VND-1006.", priority: "High" },
                { d: fmtDate(new Date(Date.now() + 86400000).toISOString()), action: "Approve recommended re-tender of Smart Classroom NIT.", priority: "Medium" },
                { d: fmtDate(new Date(Date.now() + 2 * 86400000).toISOString()), action: "Publish quarterly procurement health digest to CVC liaison.", priority: "Low" },
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded border border-border bg-background px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-secondary px-2 py-1 font-mono text-[11px] text-muted-foreground">{a.d}</div>
                    <p className="text-xs text-foreground">{a.action}</p>
                  </div>
                  <Badge variant="outline" className={
                    a.priority === "High" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                    a.priority === "Medium" ? "border-warning/40 bg-warning/10 text-warning" :
                    "border-info/40 bg-info/10 text-info"
                  }>
                    {a.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <BarChart3 className="h-3 w-3" />
        Insights generated by ProcureAI v3.2 · Trained on 4.2 yrs of AP procurement data · Confidence intervals 90–95% · Not a substitute for official audit.
      </p>
    </AdminLayout>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: "success" | "info" | "warning" }) {
  const toneCls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-info";
  return (
    <div className="rounded border border-border bg-background px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${toneCls}`}>{value}<span className="text-xs font-medium text-muted-foreground">{suffix}</span></p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, delta, up }: { icon: React.ElementType; label: string; value: string; delta: string; up?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-bold text-primary">{value}</p>
            <p className={`mt-0.5 text-[11px] font-semibold ${up ? "text-success" : "text-muted-foreground"}`}>{delta}</p>
          </div>
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
