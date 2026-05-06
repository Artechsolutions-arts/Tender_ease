import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Eye, EyeOff, LockKeyhole, UserRound, FileText, AlertCircle,
  HelpCircle, KeyRound, ShieldCheck, ChevronRight, Building2,
  TrendingUp, Clock, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/store/auth-store";
import { useT } from "@/lib/useT";

const STATS = [
  { label: "Active Tenders", value: "1,873", icon: FileText, color: "text-primary" },
  { label: "Closing Today",  value: "193",   icon: Clock,     color: "text-accent"  },
  { label: "Departments",    value: "42",    icon: Building2, color: "text-primary" },
  { label: "Awards Issued",  value: "8,540", icon: Award,     color: "text-green-600" },
];

const QUICK_LINKS = [
  { label: "Current Tenders",   href: "/tenders"    },
  { label: "Corrigendums",      href: "/tenders"    },
  { label: "Upcoming Tenders",  href: "/tenders"    },
  { label: "e-Procurement Guidelines", href: "#"    },
  { label: "MIS Reports",       href: "#"           },
  { label: "Downloads",         href: "#"           },
];

const HELP_LINKS = [
  { icon: HelpCircle,   label: "Forgot User ID?"      },
  { icon: KeyRound,     label: "Forgot Password?"     },
  { icon: ShieldCheck,  label: "Reset DSC Certificate" },
  { icon: TrendingUp,   label: "Check EMD Status"     },
];

export default function Login() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const T = useT();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [activeTab, setActiveTab]   = useState(0);

  useEffect(() => {
    document.title = "Login — AP e-Procurement Portal";
  }, []);

  if (currentUser) {
    return <Navigate to={currentUser.role === "vendor" ? "/vendor-dashboard" : "/"} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user) {
        setError(T("login_invalid"));
        return;
      }
      navigate(user.role === "vendor" ? "/vendor-dashboard" : "/", { replace: true });
    } catch {
      setError(T("login_invalid"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(205 60% 96%)" }}>

      {/* ── Top utility bar ── */}
      <div className="border-b border-primary/20 bg-white px-4 py-1">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[11px] text-muted-foreground">
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

      {/* ── Main header banner ── */}
      <header className="border-b-4 border-accent bg-primary">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          {/* Logo + title */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-md">
              <img src="/ap-govt-logo.png" alt="AP Govt" className="h-full w-full object-contain" />
            </div>
            <div className="text-primary-foreground">
              <p className="text-[10px] uppercase tracking-widest opacity-80">SATYAMEVA JAYATE</p>
              <h1 className="text-lg font-extrabold leading-tight md:text-2xl">
                Government of Andhra Pradesh
              </h1>
              <p className="text-[11px] opacity-80">e-Procurement Portal · AI Tender Management</p>
            </div>
          </div>
          {/* Server time */}
          <div className="hidden text-right text-[11px] text-primary-foreground/70 md:block">
            <p>Server Time</p>
            <p className="font-mono font-semibold text-primary-foreground">
              {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
          </div>
        </div>
      </header>

      {/* ── Navigation bar ── */}
      <nav className="border-b border-primary/30 bg-primary/90 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <ul className="flex flex-wrap gap-0 text-[13px] font-medium text-primary-foreground/90">
            {["Home", "Guidelines", "MIS Reports", "GO's", "FAQs", "Downloads", "Feedback / Suggestions", "Support Desk"].map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className="block px-3 py-2.5 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* ── Alerts ticker ── */}
      <div className="border-b border-orange-200 bg-orange-50 px-4 py-1.5">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-[12px] text-orange-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">Important Alerts !</span>
          <span className="opacity-70">
            &nbsp;All vendors must ensure their DSC certificates are valid before submitting bids. Helpdesk: 1800-3070-2232
          </span>
        </div>
      </div>

      {/* ── Main 3-column body ── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 md:px-8">
        <div className="grid gap-4 lg:grid-cols-[260px_1fr_300px]">

          {/* ── LEFT: Stats & Quick Links ── */}
          <aside className="flex flex-col gap-4">
            {/* Stats card */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-primary/5 px-3 py-2">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-primary">
                  Portal Statistics
                </h3>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-border">
                {STATS.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex flex-col items-center p-3">
                    <Icon className={`mb-1 h-4 w-4 ${color}`} />
                    <span className={`text-xl font-extrabold ${color}`}>{value}</span>
                    <span className="text-center text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-primary/5 px-3 py-2">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-primary">
                  Quick Links
                </h3>
              </div>
              <ul className="divide-y divide-border">
                {QUICK_LINKS.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      <ChevronRight className="h-3 w-3 text-accent" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ── CENTER: Tenders preview ── */}
          <section className="flex flex-col gap-4">
            {/* Tab headers */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="flex border-b border-border">
                {["Current Tenders", "Corrigendums", "Upcoming Tenders"].map((tab, i) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(i)}
                    className={`flex-1 py-2.5 text-[12px] font-semibold transition-colors ${
                      i === activeTab
                        ? "border-b-2 border-primary bg-primary/5 text-primary"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tender rows — placeholder data */}
              <div className="divide-y divide-border">
                {[
                  { id: "TND-2026-607", dept: "Roads & Buildings",  closing: "22 May 2026 05:30 PM", desc: "Re-Construction of Sri Chennakesava Swamy Temple at Epuru Village" },
                  { id: "TND-2026-524", dept: "Panchayat Raj",      closing: "20 May 2026 03:00 PM", desc: "Water Supply Scheme — Commissioner Madakasira Nagarapanchayat" },
                  { id: "TND-2026-498", dept: "School Education",   closing: "19 May 2026 04:00 PM", desc: "Supply & Installation of Smart Classroom Equipment — Phase III" },
                  { id: "TND-2026-412", dept: "Health & Family",    closing: "18 May 2026 05:30 PM", desc: "Construction of PHC Building at Kurnool Rural Mandal" },
                  { id: "TND-2026-389", dept: "APIIC",              closing: "17 May 2026 05:00 PM", desc: "Development of Industrial Corridor Infrastructure — Naidupeta Zone" },
                ].map(({ id, dept, closing, desc }) => (
                  <div key={id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-primary">{id}</span>
                      <span className="rounded-sm bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">{dept}</span>
                    </div>
                    <p className="text-[12px] text-gray-700">{desc}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Bid Closing: <span className="font-semibold text-red-600">{closing}</span>
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-4 py-2 text-right">
                <a href="/tenders" className="text-[12px] font-semibold text-primary hover:underline">
                  More... →
                </a>
              </div>
            </div>
          </section>

          {/* ── RIGHT: Login panel ── */}
          <aside className="flex flex-col gap-3">

            {/* Login card */}
            <div className="rounded border border-border bg-white shadow-sm">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-border bg-primary/5 px-3 py-2.5">
                <div className="flex items-center gap-2 text-[13px] font-bold text-primary">
                  <UserRound className="h-4 w-4" />
                  Login
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/vendor-signup")}
                  className="text-[11px] font-semibold text-accent hover:underline"
                >
                  Register?
                </button>
              </div>

              {/* Form */}
              <form className="space-y-3 p-4" onSubmit={handleSubmit}>
                {/* Email */}
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="User Name / Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 rounded-sm pl-8 text-[13px]"
                    required
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 rounded-sm pl-8 pr-9 text-[13px]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <p className="flex items-center gap-1.5 rounded-sm bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-600">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-9 rounded-sm border-primary text-[12px] font-semibold text-primary hover:bg-primary/5"
                    onClick={() => navigate("/vendor-signup")}
                  >
                    Register ?
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-9 rounded-sm bg-primary text-[12px] font-semibold text-white hover:bg-primary/90"
                  >
                    {loading ? "Signing in…" : "Login"}
                  </Button>
                </div>

                <p className="text-center text-[10px] text-muted-foreground">
                  Use your registered email &amp; password
                </p>
              </form>
            </div>

            {/* Help links */}
            <div className="rounded border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-primary/5 px-3 py-2">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-primary">Account Help</h3>
              </div>
              <ul className="divide-y divide-border">
                {HELP_LINKS.map(({ icon: Icon, label }) => (
                  <li key={label}>
                    <a href="#" className="flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compliance badges */}
            <div className="rounded border border-border bg-white p-3 shadow-sm">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Compliance</p>
              <div className="flex flex-wrap gap-1.5">
                {["GFR 2017", "CVC Guidelines", "IT Act 2000", "RTI Act 2005"].map((b) => (
                  <span key={b} className="rounded-sm border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-white py-2 text-center text-[11px] text-muted-foreground">
        <p>Terms &amp; Conditions &nbsp;|&nbsp; Privacy Policy</p>
        <p className="mt-0.5">
          © IT&amp;C Department, Government of Andhra Pradesh · Maintained by AP Technology Services
        </p>
      </footer>
    </div>
  );
}
