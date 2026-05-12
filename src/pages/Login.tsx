import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, LockKeyhole, UserRound, AlertCircle,
  HelpCircle, KeyRound, ShieldCheck, ChevronRight,
  TrendingUp, Clock, Youtube, Newspaper, X, Send,
  CreditCard, Info, ChevronDown, ChevronUp, FileText, Calendar, Building2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/store/auth-store";
import { useT } from "@/lib/useT";

/* ── Static data ───────────────────────────────────────────────── */

const CHART_DATA = [
  { year: "2020-21", count: 50440, value: 0 },
  { year: "2021-22", count: 68840, value: 0 },
  { year: "2022-23", count: 76530, value: 0 },
  { year: "2023-24", count: 87820, value: 0 },
  { year: "2024-25", count: 44980, value: 0 },
  { year: "2025-26", count: 67200, value: 0 },
  { year: "2026-27", count: 5950,  value: 0 },
];

const BANKING_PARTNERS = [
  { name: "ICICI Bank", logo: "/icici-bank.png", bg: "#c1272d" },
  { name: "Axis Bank",  logo: "/axis-bank.svg",  bg: "#800020" },
  { name: "DBS Bank",   logo: "/dbs-bank.svg",   bg: "#ffffff" },
];

const DOWNLOADS = [
  { name: "AP e-Procurement User Creation Guide", file: "apeprocusercreation.docx",                    type: "DOCX", size: "332 KB" },
  { name: "emSigner Installation & User Guide",   file: "emSigner.pdf",                                type: "PDF",  size: "2.2 MB" },
  { name: "External Service Request — Department",file: "External Service Request - Department.pdf",   type: "PDF",  size: "2.4 MB" },
  { name: "External Service Request — Vendor",    file: "External Service Request - Vendor.pdf",       type: "PDF",  size: "2.4 MB" },
  { name: "Model RFP for Scanning & Digitization",file: "ModelRFPScanningandDigitization.docx",        type: "DOCX", size: "132 KB" },
  { name: "Supplier Registration Guide",          file: "supplier-registration.pdf",                   type: "PDF",  size: "2.5 MB" },
  { name: "Technical Guidelines",                 file: "technical-guidelines.pdf",                    type: "PDF",  size: "56 KB"  },
];

const TAB_DATA = [
  // 0 — Current Tenders
  [
    { id: "TND-2026-607", dept: "Roads & Buildings",   closing: "22 May 2026 05:30 PM", ifb: "NIT/RB/2026/607", desc: "Re-Construction of Sri Chennakesava Swamy Temple at Epuru Village, Nellore District" },
    { id: "TND-2026-524", dept: "Panchayat Raj",       closing: "20 May 2026 03:00 PM", ifb: "11-2/GF/Works/PKTR/2026", desc: "Water Supply Scheme — Commissioner, Madakasira Nagarapanchayat, Ananthapuramu" },
    { id: "TND-2026-498", dept: "School Education",    closing: "19 May 2026 04:00 PM", ifb: "DSE/IT/2026/498", desc: "Supply & Installation of Smart Classroom Equipment — Phase III, 120 Govt. Schools" },
    { id: "TND-2026-412", dept: "Health & Family",     closing: "18 May 2026 05:30 PM", ifb: "DMHO/KNL/2026/412", desc: "Construction of Primary Health Centre Building at Kurnool Rural Mandal" },
    { id: "TND-2026-389", dept: "APIIC",               closing: "17 May 2026 05:00 PM", ifb: "APIIC/NDP/2026/389", desc: "Development of Industrial Corridor Infrastructure — Naidupeta Zone, SPSR Nellore" },
  ],
  // 1 — Corrigendums
  [
    { id: "CRG-2026-041", dept: "Roads & Buildings",   closing: "12 May 2026 04:00 PM", ifb: "ENQ/RB/M100029849/2026", desc: "CORRIGENDUM: Amended scope for 4-Lane Bypass Road Vijayawada Phase II — revised BOQ attached" },
    { id: "CRG-2026-038", dept: "APSPDCL",             closing: "10 May 2026 05:30 PM", ifb: "ENQ/M100030216/STAGE-II", desc: "CORRIGENDUM: Supply of ECP Neutralized Solution Disposal Pump — Bid closing extended to 12/05/2026" },
    { id: "CRG-2026-035", dept: "Irrigation",          closing: "09 May 2026 03:00 PM", ifb: "ENQ/M100030156/P2/S24",  desc: "CORRIGENDUM: Revised Technical Specifications for Polavaram Right Canal Lining Works" },
    { id: "CRG-2026-031", dept: "Panchayat Raj",       closing: "08 May 2026 04:00 PM", ifb: "11-1/GF/Works/NDKTR/2026", desc: "CORRIGENDUM: Amended SOR rates for CC Road Construction — Nandikotkur Municipality Div. 1" },
    { id: "CRG-2026-027", dept: "Municipal Admin",     closing: "07 May 2026 05:30 PM", ifb: "NIT/MA/2026/027",         desc: "CORRIGENDUM: Pre-bid queries addressed — Construction of Community Hall, Chilakaluripet" },
  ],
  // 2 — Upcoming Tenders
  [
    { id: "UPC-2026-112", dept: "Water Resources",     closing: "30 May 2026 05:30 PM", ifb: "WR/2026-27/112", desc: "Construction of Flood Protection Bund — Krishna River, Vijayawada Reach (Upcoming — Not yet open)" },
    { id: "UPC-2026-108", dept: "Roads & Buildings",   closing: "28 May 2026 04:00 PM", ifb: "RB/2026-27/108", desc: "4-Laning of SH-9 Ongole–Chirala Section — Phase I (Upcoming — Tender documents under preparation)" },
    { id: "UPC-2026-104", dept: "APSPDCL",             closing: "27 May 2026 03:00 PM", ifb: "APSPDCL/2026/104", desc: "Supply of 11KV Distribution Transformers — 500 Nos. (Upcoming — Pre-bid meeting on 15/05/2026)" },
    { id: "UPC-2026-099", dept: "Health & Family",     closing: "25 May 2026 05:00 PM", ifb: "DMHO/2026/099", desc: "Procurement of ICU Medical Equipment — 12 District Hospitals (Upcoming — Finalising specifications)" },
    { id: "UPC-2026-091", dept: "School Education",    closing: "24 May 2026 04:30 PM", ifb: "DSE/2026/091", desc: "Construction of Additional Classrooms — 200 Govt. High Schools (Upcoming — Funds released)" },
  ],
];

const NAV_ITEMS = [
  { label: "Home",                 action: "home"        },
  { label: "Guidelines",           action: "guidelines"  },
  { label: "MIS Reports",          action: "mis"         },
  { label: "GO's",                 action: "gos"         },
  { label: "FAQs",                 action: "faqs"        },
  { label: "Downloads",            action: "downloads"   },
  { label: "Feedback / Suggestions", action: "feedback"  },
  { label: "Support Desk",         action: "support"     },
];

const QUICK_LINKS = [
  { label: "Current Tenders",          action: "tenders",    tab: 0,    free: true  },
  { label: "Corrigendums",             action: "tenders",    tab: 1,    free: true  },
  { label: "Upcoming Tenders",         action: "tenders",    tab: 2,    free: true  },
  { label: "e-Procurement Guidelines", action: "guidelines", tab: null, free: false },
  { label: "MIS Reports",              action: "mis",        tab: null, free: false },
  { label: "Downloads",                action: "downloads",  tab: null, free: true  },
];

const ACTION_LABELS: Record<string, string> = {
  guidelines:         "e-Procurement Guidelines",
  mis:                "MIS Reports",
  gos:                "Government Orders",
  faqs:               "FAQs",
  downloads:          "Downloads",
  feedback:           "Feedback & Suggestions",
  support:            "Support Desk",
  tenders:            "Tender Listings",
  "blocked-suppliers": "Blocked Suppliers List",
  "bid-submission":   "Bid Submission",
};

/* ── Component ─────────────────────────────────────────────────── */

export default function Login() {
  const { currentUser, login } = useAuth();
  const navigate  = useNavigate();
  const T         = useT();
  const loginRef   = useRef<HTMLDivElement>(null);
  const tendersRef = useRef<HTMLElement>(null);

  // Splash popup
  const [showSplash,   setShowSplash]   = useState(true);
  const [splashHiding, setSplashHiding] = useState(false);
  const splashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splashProgressRef = useRef<HTMLDivElement>(null);

  // Form state
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPwd,      setShowPwd]      = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Tender detail modal
  const [selectedTender, setSelectedTender] = useState<typeof TAB_DATA[0][0] | null>(null);

  // Downloads modal
  const [showDownloads, setShowDownloads] = useState(false);

  // Chart toggle
  const [chartMode, setChartMode] = useState<"count" | "value">("count");

  // Live stats from backend
  const [chartData,    setChartData]    = useState<{ year: string; count: number; value: number }[]>([]);
  const [activeTenders, setActiveTenders] = useState<number | null>(null);
  const [closingToday,  setClosingToday]  = useState<number | null>(null);

  // Login popup modal
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalFor, setLoginModalFor]   = useState("");

  // Modals / panels
  const [showForgotPwd,  setShowForgotPwd]  = useState(false);
  const [showForgotId,   setShowForgotId]   = useState(false);
  const [showEmd,        setShowEmd]        = useState(false);
  const [showNews,       setShowNews]       = useState(false);

  // Forgot password form
  const [fpEmail,   setFpEmail]   = useState("");
  const [fpSent,    setFpSent]    = useState(false);
  const [fpLoading, setFpLoading] = useState(false);

  // EMD status form
  const [emdRef,    setEmdRef]    = useState("");
  const [emdResult, setEmdResult] = useState<string | null>(null);

  const closeSplash = () => {
    setSplashHiding(true);
    splashTimerRef.current && clearTimeout(splashTimerRef.current);
    setTimeout(() => setShowSplash(false), 850);
  };

  useEffect(() => {
    // Auto-dismiss splash after 6 seconds with progress bar fill
    if (showSplash && splashProgressRef.current) {
      const bar = splashProgressRef.current;
      bar.style.transition = "width 6s linear";
      bar.style.width = "100%";
      splashTimerRef.current = setTimeout(closeSplash, 6000);
    }
    return () => { splashTimerRef.current && clearTimeout(splashTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSplash]);

  useEffect(() => {
    document.title = "Login — AP e-Procurement Portal";
    fetch("/api/tenders/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setChartData(d.byYear || []);
        setActiveTenders(d.active ?? null);
        setClosingToday(d.closingToday ?? null);
      })
      .catch(() => {});
  }, []);

  if (currentUser) {
    return <Navigate to={currentUser.role === "vendor" ? "/vendor-dashboard" : "/"} replace />;
  }

  /* Show login popup for restricted features */
  const requireLogin = (action: string) => {
    setLoginModalFor(ACTION_LABELS[action] || action);
    setError("");
    setShowLoginModal(true);
  };

  const handleNavClick = (action: string) => {
    if (action === "home") return;
    if (action === "downloads") { setShowDownloads(true); return; }
    requireLogin(action);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user) { setError(T("login_invalid")); return; }
      navigate(user.role === "vendor" ? "/vendor-dashboard" : "/", { replace: true });
    } catch {
      setError(T("login_invalid"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPwd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFpLoading(true);
    await new Promise(r => setTimeout(r, 1000)); // simulate API
    setFpSent(true);
    setFpLoading(false);
  };

  const handleEmdCheck = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmdResult(emdRef ? `EMD for reference ${emdRef} — Status: Held / Under Process. Contact helpdesk@apeprocurement.gov.in for refund queries.` : null);
  };

  /* ── Render ── */
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "hsl(205 60% 96%)" }}>

      {/* ── Splash popup (matches AP eProcurement reference site) ── */}
      {showSplash && (
        <>
          <style>{`
            @keyframes splashZoomIn {
              from { transform: scale(0.85); opacity: 0; }
              to   { transform: scale(1);    opacity: 1; }
            }
            .splash-overlay {
              position: fixed; inset: 0; background: #fff2e1;
              display: flex; justify-content: center; align-items: center;
              z-index: 9999; overflow: hidden;
              transform-origin: center top;
              transition: transform 0.8s cubic-bezier(0.645,0.045,0.355,1), opacity 0.6s ease-in 0.2s;
            }
            .splash-overlay.hiding {
              opacity: 0;
              transform: perspective(1500px) rotateX(-90deg);
              pointer-events: none;
            }
            .splash-img {
              max-width: 90%; max-height: 90vh; object-fit: contain;
              animation: splashZoomIn 1s ease;
            }
            .splash-close {
              position: absolute; top: 15px; right: 15px;
              background: rgba(0,0,0,0.6); color: #fff;
              border: none; font-size: 13px; font-weight: 600;
              width: 35px; height: 35px; border-radius: 50%;
              cursor: pointer; display: flex; align-items: center; justify-content: center;
            }
            .splash-close:hover { background: rgba(0,0,0,0.85); }
            .splash-progress-container {
              position: absolute; bottom: 0; left: 0; width: 100%; height: 6px;
              background: rgba(0,0,0,0.1);
            }
            .splash-progress-bar {
              height: 100%; width: 0%;
              background: linear-gradient(to right, #ffcb00, #ffcb00);
              border-radius: 0 4px 4px 0;
            }
          `}</style>
          <div className={`splash-overlay${splashHiding ? " hiding" : ""}`}>
            <button className="splash-close" onClick={closeSplash}>X</button>
            <img
              src="/unstoppable-amaravath.jpg"
              alt="Unstoppable Amaravathi"
              className="splash-img"
            />
            <div className="splash-progress-container">
              <div className="splash-progress-bar" ref={splashProgressRef} />
            </div>
          </div>
        </>
      )}

      {/* ── Top utility bar ── */}
      <div className="border-b border-primary/20 bg-white px-4 py-1">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-muted-foreground">
          <span>Government of Andhra Pradesh &nbsp;|&nbsp; Official e-Procurement Portal</span>
          <div className="flex items-center gap-3">
            <button className="hover:text-primary">Skip to main content</button>
            <span>|</span>
            <button className="hover:text-primary">हिंदी</button>
            <button className="hover:text-primary">తెలుగు</button>
            <button className="font-semibold text-primary">English</button>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <header className="relative w-full overflow-hidden" style={{ height: 155 }}>
        <img
          src="/Govt.jpg"
          alt="AP e-Procurement Portal — Government of Andhra Pradesh"
          className="block w-full"
          style={{ height: 155, objectFit: "fill" }}
        />
      </header>

      {/* ── Navbar ── */}
      <nav className="border-b border-primary/30 bg-primary/90 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <ul className="flex flex-wrap justify-center text-sm font-medium text-primary-foreground/90">
            {NAV_ITEMS.map(({ label, action }) => (
              <li key={label}>
                <button
                  onClick={() => handleNavClick(action)}
                  className="block px-3 py-2.5 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Alerts ticker ── */}
      <div className="border-b border-orange-200 bg-orange-50 py-1.5">
        <div className="flex items-center gap-2 text-sm text-orange-700">
          {/* Fixed label */}
          <div className="flex shrink-0 items-center gap-1.5 border-r border-orange-300 pl-4 pr-3">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="font-semibold whitespace-nowrap">Important Alerts !</span>
          </div>
          {/* Scrolling ticker — pauses on hover */}
          <div className="ticker-container flex-1 overflow-hidden cursor-pointer">
            <span className="animate-ticker opacity-80">
              All vendors must ensure DSC certificates are valid before bid submission. Helpdesk: 1800-3070-2232 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; All vendors must ensure DSC certificates are valid before bid submission. Helpdesk: 1800-3070-2232
            </span>
          </div>
        </div>
      </div>


      {/* ── Main 3-column body ── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 md:px-8">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">

          {/* ── LEFT: Chart + Stats + Quick Links + Blocked + Banking ── */}
          <aside className="flex flex-col gap-3">

            {/* Tenders chart panel */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  <FileText className="h-3.5 w-3.5" />
                  Tenders
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">by:</span>
                  <button
                    onClick={() => setChartMode("count")}
                    className={`px-1.5 py-0.5 rounded-sm font-medium ${chartMode === "count" ? "bg-primary text-white" : "text-primary hover:bg-primary/10"}`}
                  >Count</button>
                  <button
                    onClick={() => setChartMode("value")}
                    className={`px-1.5 py-0.5 rounded-sm font-medium ${chartMode === "value" ? "bg-primary text-white" : "text-primary hover:bg-primary/10"}`}
                  >Value</button>
                </div>
              </div>
              <div className="px-2 pb-1 pt-3">
                <p className="mb-1 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tenders by Month
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData.length ? chartData : CHART_DATA} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 9 }}
                      tickFormatter={v => {
                        if (chartMode === "value") return v >= 1e7 ? `₹${(v/1e7).toFixed(0)}Cr` : v >= 1e5 ? `₹${(v/1e5).toFixed(0)}L` : `₹${v}`;
                        return v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v);
                      }}
                      tickLine={false} axisLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) =>
                        chartMode === "value"
                          ? [`₹${v.toLocaleString("en-IN")}`, "Est. Value"]
                          : [v.toLocaleString("en-IN"), "Tenders"]
                      }
                      contentStyle={{ fontSize: 11, padding: "4px 8px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6 }}
                    />
                    <Bar dataKey={chartMode} radius={[3, 3, 0, 0]}>
                      {(chartData.length ? chartData : CHART_DATA).map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === (chartData.length ? chartData : CHART_DATA).length - 1 ? "hsl(var(--accent))" : "hsl(var(--primary))"}
                          fillOpacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Active Tenders + Closing Today */}
            <div className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded border border-border bg-white shadow-sm">
              <div className="flex flex-col items-center py-3">
                <FileText className="mb-1 h-4 w-4 text-primary" />
                <span className="text-2xl font-extrabold text-primary">
                  {activeTenders !== null ? activeTenders.toLocaleString("en-IN") : "—"}
                </span>
                <span className="text-xs text-muted-foreground">Active Tenders</span>
              </div>
              <div className="flex flex-col items-center py-3">
                <Clock className="mb-1 h-4 w-4 text-accent" />
                <span className="text-2xl font-extrabold text-accent">
                  {closingToday !== null ? closingToday.toLocaleString("en-IN") : "—"}
                </span>
                <span className="text-xs text-muted-foreground">Closing Today</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-primary/5 px-3 py-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Quick Links</h3>
              </div>
              <ul className="divide-y divide-border">
                {QUICK_LINKS.map(({ label, action, tab, free }) => (
                  <li key={label}>
                    <button
                      onClick={() => {
                        if (action === "downloads") {
                          setShowDownloads(true);
                        } else if (free && tab != null) {
                          setActiveTab(tab);
                          tendersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        } else {
                          requireLogin(action);
                        }
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-accent" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Blocked Suppliers */}
            <div className="rounded border border-border bg-white shadow-sm">
              <button
                onClick={() => requireLogin("blocked-suppliers")}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <ShieldCheck className="h-4 w-4 text-red-500" />
                Blocked Suppliers
              </button>
            </div>

            {/* Banking Partners */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-primary/5 px-3 py-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Banking Partners</h3>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {BANKING_PARTNERS.map(({ name, logo, bg }) => (
                  <div
                    key={name}
                    className="flex items-center justify-center px-4 py-3"
                    style={{ backgroundColor: bg }}
                  >
                    <img
                      src={logo}
                      alt={name}
                      className="h-8 max-w-[120px] object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ── CENTER: Tender tabs ── */}
          <section ref={tendersRef} className="flex flex-col gap-4">
            <div className="rounded border border-border bg-white shadow-sm">
              {/* Tab headers */}
              <div className="flex border-b border-border">
                {["Current Tenders", "Corrigendums", "Upcoming Tenders"].map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      i === activeTab
                        ? "border-b-2 border-primary bg-primary/5 text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tender rows */}
              <div className="divide-y divide-border">
                {TAB_DATA[activeTab].map((tender) => (
                  <button
                    key={tender.id}
                    onClick={() => setSelectedTender(tender)}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-blue-50"
                  >
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{tender.id}</span>
                      <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-xs font-medium text-accent">{tender.dept}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">IFB No: {tender.ifb}</p>
                    <p className="text-sm text-gray-700">{tender.desc}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Bid Closing: <span className="font-semibold text-red-600">{tender.closing}</span>
                    </p>
                  </button>
                ))}
              </div>

              <div className="border-t border-border px-4 py-2 text-right">
                <button
                  onClick={() => requireLogin("tenders")}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  More... →
                </button>
              </div>
            </div>
          </section>

          {/* ── RIGHT: Login + Account Help panels ── */}
          <aside ref={loginRef} className="flex flex-col gap-3">

            {/* 1. Login panel */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <UserRound className="h-4 w-4" />
                  Login
                </div>
                <button
                  onClick={() => setShowForgotPwd(true)}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Forgot Password ?
                </button>
              </div>

              <form className="space-y-3 p-4" onSubmit={handleSubmit}>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email" type="email" placeholder="User Name / Email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="h-9 rounded-sm pl-8 text-sm" required
                  />
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password" type={showPwd ? "text" : "password"} placeholder="Password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="h-9 rounded-sm pl-8 pr-9 text-sm" required
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    aria-label={showPwd ? "Hide password" : "Show password"}>
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {error && (
                  <p className="flex items-center gap-1.5 rounded-sm bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline"
                    className="h-9 flex-1 rounded-sm border-primary text-sm font-semibold text-primary hover:bg-primary/5"
                    onClick={() => navigate("/vendor-signup")}>
                    Register ?
                  </Button>
                  <Button type="submit" disabled={loading}
                    className="h-9 flex-1 rounded-sm bg-primary text-sm font-semibold text-white hover:bg-primary/90">
                    {loading ? "Signing in…" : "Login"}
                  </Button>
                </div>
              </form>

              {/* Forgot Password inline form */}
              {showForgotPwd && (
                <div className="border-t border-border bg-blue-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-primary">Reset Password</p>
                    <button onClick={() => { setShowForgotPwd(false); setFpSent(false); setFpEmail(""); }}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                    </button>
                  </div>
                  {fpSent ? (
                    <p className="rounded-sm bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                      ✓ Password reset link sent to <strong>{fpEmail}</strong>. Check your inbox.
                    </p>
                  ) : (
                    <form onSubmit={handleForgotPwd} className="space-y-2">
                      <Input
                        type="email" placeholder="Enter registered email"
                        value={fpEmail} onChange={e => setFpEmail(e.target.value)}
                        className="h-8 rounded-sm text-sm" required
                      />
                      <Button type="submit" disabled={fpLoading}
                        className="h-8 w-full rounded-sm bg-primary text-sm text-white">
                        <Send className="mr-1.5 h-3 w-3" />
                        {fpLoading ? "Sending…" : "Send Reset Link"}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* 2. Forgot User ID */}
            <div className="rounded border border-border bg-white shadow-sm">
              <button
                onClick={() => setShowForgotId(v => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 transition-colors hover:bg-primary/5"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <HelpCircle className="h-4 w-4 text-primary/70" />
                  Forgot User ID?
                </div>
                {showForgotId ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showForgotId && (
                <div className="border-t border-border bg-gray-50 p-4">
                  <p className="mb-2 text-sm text-gray-600">
                    Your <strong>User ID is your registered email address</strong>. If you registered with a different email, contact the helpdesk.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Helpdesk: <span className="font-semibold text-primary">1800-3070-2232</span> (Toll Free)<br />
                    Email: <span className="font-semibold text-primary">helpdesk@apeprocurement.gov.in</span>
                  </p>
                </div>
              )}
            </div>

            {/* 3. Check EMD Status */}
            <div className="rounded border border-border bg-white shadow-sm">
              <button
                onClick={() => setShowEmd(v => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 transition-colors hover:bg-primary/5"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <CreditCard className="h-4 w-4 text-primary/70" />
                  Check EMD Status
                </div>
                {showEmd ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {showEmd && (
                <div className="border-t border-border bg-gray-50 p-4">
                  <form onSubmit={handleEmdCheck} className="space-y-2">
                    <p className="text-xs text-muted-foreground">Enter Payment Reference ID / Transaction No.</p>
                    <Input
                      placeholder="e.g. HDFC20260001234"
                      value={emdRef} onChange={e => setEmdRef(e.target.value)}
                      className="h-8 rounded-sm text-sm" required
                    />
                    <Button type="submit" className="h-8 w-full rounded-sm bg-primary text-sm text-white">
                      <TrendingUp className="mr-1.5 h-3 w-3" /> Check Status
                    </Button>
                  </form>
                  {emdResult && (
                    <p className="mt-2 rounded-sm bg-blue-50 px-2 py-1.5 text-xs text-blue-700">{emdResult}</p>
                  )}
                </div>
              )}
            </div>

            {/* 4. Reset Certificate */}
            <div className="rounded border border-border bg-white shadow-sm">
              <button
                onClick={() => navigate("/vendor-signup")}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <KeyRound className="h-4 w-4 text-primary/70" />
                Reset DSC Certificate
              </button>
            </div>

            {/* 5. Video Tutorials */}
            <div className="rounded border border-border bg-white shadow-sm">
              <a
                href="https://www.youtube.com/@APeProcurement"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-red-50"
              >
                <Youtube className="h-5 w-5 text-red-600" />
                <span className="text-sm font-bold text-red-600">Video Tutorials</span>
              </a>
            </div>

            {/* 6. News */}
            <div className="rounded border border-border bg-white shadow-sm">
              <button
                onClick={() => setShowNews(v => !v)}
                className="flex w-full items-center justify-between border-b border-border bg-primary/5 px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
                  <Newspaper className="h-3.5 w-3.5" />
                  News
                </div>
                {showNews ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <div className={`divide-y divide-border text-xs text-gray-600 ${showNews ? "" : "max-h-28 overflow-hidden"}`}>
                {[
                  "As per G.O.Ms.No.16, IT,E&C Dept, dated 27.09.2018 — AP Government is implementing the 'Konugolu' portal to provide eAuction services.",
                  "New DSC Registration process effective 01-Jan-2026. All vendors must re-register DSC on the portal.",
                  "GFR 2017 compliance mandatory for all tenders above ₹50 Lakhs. Refer CVC guidelines for details.",
                ].map((item, i) => (
                  <p key={i} className="px-3 py-2 leading-snug">{item}</p>
                ))}
              </div>
              {!showNews && (
                <button onClick={() => setShowNews(true)} className="w-full py-1 text-xs text-primary hover:underline">
                  Read more...
                </button>
              )}
            </div>

            {/* Compliance badges */}
            <div className="rounded border border-border bg-white p-3 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Compliance</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "GFR 2017",       route: "/compliance" },
                  { label: "CVC Guidelines", route: "/compliance" },
                  { label: "IT Act 2000",    route: "/compliance" },
                  { label: "RTI Act 2005",   route: "/compliance" },
                ].map(({ label, route }) => (
                  <button
                    key={label}
                    onClick={() => requireLogin("Compliance Information")}
                    className="rounded-sm border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
                    title={`View ${label} details after login`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-white py-2 text-center text-xs text-muted-foreground">
        <p>
          <button onClick={() => requireLogin("Terms & Conditions")} className="hover:text-primary hover:underline">Terms &amp; Conditions</button>
          &nbsp;|&nbsp;
          <button onClick={() => requireLogin("Privacy Policy")} className="hover:text-primary hover:underline">Privacy Policy</button>
        </p>
        <p className="mt-0.5">© IT&amp;C Department, Government of Andhra Pradesh · Maintained by AP Technology Services</p>
      </footer>

      {/* ── Downloads Modal ── */}
      {showDownloads && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowDownloads(false)}
        >
          <div
            className="w-full max-w-xl rounded-lg bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-primary px-5 py-3">
              <div className="flex items-center gap-2 text-white">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-bold">Downloads</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{DOWNLOADS.length} files</span>
              </div>
              <button onClick={() => setShowDownloads(false)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document list */}
            <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {DOWNLOADS.map(({ name, file, type, size }) => (
                <div key={file} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold text-white ${type === "PDF" ? "bg-red-600" : "bg-blue-600"}`}>
                      {type}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 leading-tight">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{size}</p>
                    </div>
                  </div>
                  <a
                    href={`/downloads/${encodeURIComponent(file)}`}
                    download={file}
                    className="shrink-0 flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v6m0 0l-3-3m3 3l3-3M12 4v8" />
                    </svg>
                    Download
                  </a>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-3 text-right">
              <Button variant="outline" className="text-sm" onClick={() => setShowDownloads(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Login Required Modal ── */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-primary px-5 py-3">
              <div className="flex items-center gap-2 text-white">
                <LockKeyhole className="h-4 w-4" />
                <span className="text-sm font-bold">Login Required</span>
              </div>
              <button onClick={() => setShowLoginModal(false)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {loginModalFor && (
                <p className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                  <strong>{loginModalFor}</strong> is only available to registered users. Please login to continue.
                </p>
              )}

              <form className="space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                setLoading(true);
                try {
                  const user = await login(email, password);
                  if (!user) { setError(T("login_invalid")); return; }
                  setShowLoginModal(false);
                  navigate(user.role === "vendor" ? "/vendor-dashboard" : "/", { replace: true });
                } catch {
                  setError(T("login_invalid"));
                } finally {
                  setLoading(false);
                }
              }}>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email" placeholder="User Name / Email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="h-9 pl-8 text-sm rounded-sm" required
                  />
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPwd ? "text" : "password"} placeholder="Password"
                    value={password} onChange={e => setPassword(e.target.value)}
                    className="h-9 pl-8 pr-9 text-sm rounded-sm" required
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                    {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {error && (
                  <p className="flex items-center gap-1.5 rounded-sm bg-red-50 px-2 py-1.5 text-xs font-medium text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
                  </p>
                )}
                <Button type="submit" disabled={loading}
                  className="h-9 w-full rounded-sm bg-primary text-sm font-semibold text-white hover:bg-primary/90">
                  {loading ? "Signing in…" : "Login"}
                </Button>
              </form>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
                <button
                  className="text-primary hover:underline font-medium"
                  onClick={() => { setShowLoginModal(false); navigate("/vendor-signup"); }}
                >
                  Register as Vendor
                </button>
                <button
                  className="hover:underline"
                  onClick={() => { setShowLoginModal(false); setShowForgotPwd(true); loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tender Detail Modal ── */}
      {selectedTender && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedTender(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border bg-primary px-5 py-3">
              <div className="flex items-center gap-2 text-white">
                <FileText className="h-4 w-4" />
                <span className="font-bold text-[14px]">Tender Details</span>
              </div>
              <button onClick={() => setSelectedTender(null)} className="text-white/70 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-primary">{selectedTender.id}</span>
                <span className="rounded-sm bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">{selectedTender.dept}</span>
              </div>

              <div className="rounded bg-gray-50 p-3 text-sm leading-relaxed text-gray-800 font-medium">
                {selectedTender.desc}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Department</p>
                    <p className="font-semibold text-gray-700">{selectedTender.dept}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Bid Closing</p>
                    <p className="font-semibold text-red-600">{selectedTender.closing}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">IFB / Tender No.</p>
                  <p className="font-mono font-semibold text-gray-700">{selectedTender.ifb}</p>
                </div>
              </div>

              <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <Info className="mb-1 inline h-3.5 w-3.5 text-blue-500" />{" "}
                To view full tender documents, submit bids, or download BOQ — please{" "}
                <button
                  className="font-semibold underline hover:text-blue-600"
                  onClick={() => { setSelectedTender(null); loginRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                >
                  login to your account
                </button>{" "}
                or{" "}
                <button
                  className="font-semibold underline hover:text-blue-600"
                  onClick={() => navigate("/vendor-signup")}
                >
                  register as a vendor
                </button>.
              </div>
            </div>

            <div className="flex gap-2 border-t border-border px-5 py-3">
              <Button
                variant="outline"
                className="flex-1 text-sm"
                onClick={() => setSelectedTender(null)}
              >
                Close
              </Button>
              {!selectedTender.id.startsWith("UPC-") && (
                <Button
                  className="flex-1 bg-primary text-sm text-white hover:bg-primary/90"
                  onClick={() => {
                    setSelectedTender(null);
                    requireLogin("bid-submission");
                  }}
                >
                  Login to Bid
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
