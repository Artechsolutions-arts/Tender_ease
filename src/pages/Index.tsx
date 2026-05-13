import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { VolumeChart } from "@/components/dashboard/VolumeChart";
import { CategoryChart } from "@/components/dashboard/CategoryChart";
import { TenderTable } from "@/components/dashboard/TenderTable";
import { DeadlinesPanel } from "@/components/dashboard/DeadlinesPanel";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Wallet, Users, Phone, Mail, Calendar, Download, Search } from "lucide-react";
import { useT } from "@/lib/useT";

const Index = () => {
  const T = useT();
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState("");

  const handleQuickSearch = () => {
    const q = quickSearch.trim();
    navigate(q ? `/tenders?q=${encodeURIComponent(q)}` : "/tenders");
  };

  useEffect(() => {
    document.title = "APe-Procurement — AI Tender Management Dashboard";
    const meta = document.querySelector('meta[name="description"]') ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
    meta.setAttribute("content", "AI-powered tender management dashboard for Government of Andhra Pradesh e-Procurement officers — KPIs, bid analytics and live tenders.");
  }, []);

  return (
    <AdminLayout
      title={T("dashboard_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("nav_overview") }]}
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <div className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
            <div className="bg-primary px-3 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground">{T("dashboard_quick_search")}</div>
            <div className="space-y-2 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleQuickSearch()}
                  placeholder={T("dashboard_search_placeholder")}
                  className="h-8 w-full rounded-sm border border-input bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button size="sm" onClick={handleQuickSearch} className="h-7 w-full rounded-sm bg-accent text-xs text-accent-foreground hover:bg-accent/90">{T("dashboard_search_btn")}</Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
            <div className="bg-primary px-3 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground">{T("dashboard_categories")}</div>
            <ul className="divide-y divide-border text-sm">
              {([
                ["Works (Civil)",   "Civil Works"],
                ["Goods / Supplies","Goods / Supplies"],
                ["Services",        "Services"],
                ["Consultancy",     "Consultancy"],
                ["IT / e-Gov",      "IT / e-Gov"],
                ["Auction / Sale",  "Auction / Sale"],
              ] as [string, string][]).map(([label, categoryKey]) => (
                <li key={label}>
                  <Link
                    to={`/tenders?category=${encodeURIComponent(categoryKey)}`}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-foreground/90 hover:bg-secondary hover:text-primary"
                  >
                    <span>{label}</span>
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-semibold text-primary">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-sm border border-border bg-card shadow-sm">
            <div className="bg-primary px-3 py-2 text-sm font-semibold uppercase tracking-wide text-primary-foreground">{T("dashboard_downloads")}</div>
            <ul className="space-y-1 p-3 text-sm">
              {[
                { label: "NIT Template (Form-I)", file: "/downloads/NIT_Template_Form_I.txt" },
                { label: "Bid Evaluation Sheet", file: "/downloads/Bid_Evaluation_Sheet.csv" },
                { label: "CVC Compliance Checklist", file: "/downloads/CVC_Compliance_Checklist.txt" },
                { label: "DSC User Manual", file: "/downloads/DSC_User_Manual.txt" },
              ].map(({ label, file }) => (
                <li key={label}>
                  <a href={file} download className="flex cursor-pointer items-center gap-1.5 text-info hover:underline">
                    <Download className="h-3 w-3 shrink-0" /> {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-sm border-2 border-accent/60 bg-accent/5 shadow-sm">
            <div className="bg-accent px-3 py-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground">{T("dashboard_help_desk")}</div>
            <div className="space-y-1.5 p-3 text-sm">
              <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-accent" /> 1800-3070-2232</p>
              <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-accent" /> helpdesk@ap.gov.in</p>
              <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-accent" /> {T("mon_sat")}</p>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <section aria-labelledby="kpis" className="rounded-sm border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b-2 border-accent bg-secondary/60 px-4 py-2">
              <h2 id="kpis" className="text-sm font-bold uppercase tracking-wide text-primary">{T("dashboard_kpi_title")}</h2>
              <span className="text-xs text-muted-foreground">{T("dashboard_kpi_updated")} 23-Apr-2026 09:42 IST</span>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard label={T("dashboard_kpi_live")} value="248" delta={8} helper={T("vs_last_month")} icon={FileText} tone="primary" onClick={() => navigate("/tenders")} />
              <KpiCard label={T("dashboard_kpi_value")} value="₹ 1,247 Cr" delta={12} helper={T("emd_secured")} icon={Wallet} tone="accent" onClick={() => navigate("/reports")} />
              <KpiCard label={T("dashboard_kpi_bidders")} value="9.4" delta={-3} helper={T("vs_last_quarter")} icon={Users} tone="warning" onClick={() => navigate("/bid-evaluation")} />
              <KpiCard label={T("dashboard_kpi_loa")} value="73%" delta={5} helper={T("last_90_days")} icon={TrendingUp} tone="success" onClick={() => navigate("/awards")} />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2"><VolumeChart /></div>
            <CategoryChart />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2"><TenderTable /></div>
            <DeadlinesPanel />
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Index;
