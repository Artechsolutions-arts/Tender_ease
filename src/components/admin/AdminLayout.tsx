import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
import { Bell, FileText, Users, Sparkles, LayoutDashboard, FileCheck2, Gavel, BarChart3, ShieldCheck, HelpCircle, LogOut, ChevronRight, BriefcaseBusiness, ScanSearch, Phone, Mail, MapPin, UserCheck, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAdmin } from "@/store/admin-store";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtDateTime } from "@/store/admin-store";
import { useAuth, type UserRole } from "@/store/auth-store";
import { useLang } from "@/store/lang-store";
import { t, type TranslationKey } from "@/lib/translations";

type FontScale = "small" | "normal" | "large";

const FONT_SIZES: Record<FontScale, string> = { small: "13px", normal: "15px", large: "18px" };

const NAV: { labelKey: TranslationKey; icon: React.ElementType; to: string; roles: string[] }[] = [
  { labelKey: "nav_overview",        icon: LayoutDashboard, to: "/",                 roles: ["admin"] },
  { labelKey: "nav_overview",        icon: LayoutDashboard, to: "/vendor-dashboard", roles: ["vendor"] },
  { labelKey: "nav_projects",        icon: FolderOpen,      to: "/vendor-projects",  roles: ["vendor"] },
  { labelKey: "nav_tenders",         icon: FileText,        to: "/tenders",          roles: ["admin"] },
  { labelKey: "nav_vendors",         icon: Users,           to: "/vendors",          roles: ["admin"] },
  { labelKey: "nav_bid_evaluation",  icon: FileCheck2,      to: "/bid-evaluation",   roles: ["admin"] },
  { labelKey: "nav_awards",          icon: Gavel,           to: "/awards",           roles: ["admin", "vendor"] },
  { labelKey: "nav_ai_insights",     icon: Sparkles,        to: "/ai-insights",      roles: ["admin"] },
  { labelKey: "nav_reports",         icon: BarChart3,       to: "/reports",          roles: ["admin", "vendor"] },
  { labelKey: "nav_documents",       icon: ScanSearch,      to: "/documents",        roles: ["admin", "vendor"] },
  { labelKey: "nav_notifications",   icon: Bell,            to: "/notifications",    roles: ["admin", "vendor"] },
  { labelKey: "nav_compliance",      icon: ShieldCheck,     to: "/compliance",       roles: ["admin", "vendor"] },
  { labelKey: "nav_help",            icon: HelpCircle,      to: "/help",             roles: ["admin", "vendor"] },
  { labelKey: "nav_my_profile",      icon: UserCheck,       to: "/vendor-dashboard?profile=open", roles: ["vendor"] },
];

interface Crumb { label: string; to?: string }

interface Props {
  children: React.ReactNode;
  title: string;
  breadcrumbs: Crumb[];
  actions?: React.ReactNode;
}

export function AdminLayout({ children, title, breadcrumbs, actions }: Props) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notifications, markAllRead, markRead } = useAdmin();
  const { currentUser, logout } = useAuth();
  const { lang, setLang } = useLang();

  const [fontScale, setFontScaleState] = useState<FontScale>(
    () => (localStorage.getItem("ap_font") as FontScale) ?? "normal"
  );

  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[fontScale];
    localStorage.setItem("ap_font", fontScale);
  }, [fontScale]);

  const setFontScale = (f: FontScale) => setFontScaleState(f);

  const skipToMain = () => {
    const main = document.getElementById("main-content");
    if (main) { main.setAttribute("tabindex", "-1"); main.focus(); main.scrollIntoView({ behavior: "smooth" }); }
  };

  const navItems = NAV.filter((item) => item.roles.includes((currentUser?.role ?? "admin") as UserRole));
  const isAdmin = currentUser?.role === "admin";
  const { data: docsData } = useDocuments(isAdmin ? {} : undefined);
  const pendingReviewCount = isAdmin
    ? (docsData?.docs ?? []).filter((d) => d.validation?.status === "AI_REVIEWED").length
    : 0;
  const visibleNotifications = notifications.filter((n) => {
    if (!currentUser) return false;
    if (n.targetRole && n.targetRole !== "all" && n.targetRole !== currentUser.role) return false;
    if (currentUser.role === "vendor" && n.targetVendorIds?.length) return n.targetVendorIds.includes(currentUser.vendorId ?? "");
    return true;
  });
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Top utility bar */}
      <div className="flex items-center justify-between gap-4 bg-[hsl(208_82%_18%)] px-4 py-1 text-[11px] text-white/85 md:px-8">
        <div className="flex items-center gap-3">
          <span>{t(lang, "govt_ap")}</span>
          <span className="hidden sm:inline text-white/40">|</span>
          <span className="hidden md:inline">{(() => {
            const raw = localStorage.getItem("lastLoginAt");
            if (!raw) return null;
            const locale = lang === "hi" ? "hi-IN" : lang === "te" ? "te-IN" : "en-IN";
            const fmt = new Intl.DateTimeFormat(locale, {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
            }).format(new Date(raw));
            return `${t(lang, "last_login")}: ${fmt} IST`;
          })()}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="hidden sm:inline hover:text-accent transition-colors"
            onClick={skipToMain}
          >
            {t(lang, "skip_to_main")}
          </button>
          <span className="hidden sm:inline text-white/40">|</span>

          {/* Sitemap dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:text-accent transition-colors">{t(lang, "sitemap")}</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs">{t(lang, "site_navigation")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to} className="flex items-center gap-2 text-xs">
                    <item.icon className="h-3 w-3" /> {t(lang, item.labelKey)}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-white/40">|</span>

          {/* Font size controls */}
          <span className="flex items-center gap-1 font-mono">
            <button
              onClick={() => setFontScale("small")}
              className={`px-0.5 transition-colors hover:text-accent ${fontScale === "small" ? "text-accent font-bold" : ""}`}
              aria-label="Decrease font size"
            >
              A-
            </button>
            <button
              onClick={() => setFontScale("normal")}
              className={`px-0.5 transition-colors hover:text-accent ${fontScale === "normal" ? "text-accent font-bold" : ""}`}
              aria-label="Normal font size"
            >
              A
            </button>
            <button
              onClick={() => setFontScale("large")}
              className={`px-0.5 transition-colors hover:text-accent ${fontScale === "large" ? "text-accent font-bold" : ""}`}
              aria-label="Increase font size"
            >
              A+
            </button>
          </span>

          <span className="text-white/40">|</span>

          {/* Language switcher */}
          <button
            onClick={() => setLang("hi")}
            className={`transition-colors hover:text-accent ${lang === "hi" ? "text-accent font-semibold" : ""}`}
            aria-label="Switch to Hindi"
          >
            हिंदी
          </button>
          <button
            onClick={() => setLang("te")}
            className={`transition-colors hover:text-accent ${lang === "te" ? "text-accent font-semibold" : ""}`}
            aria-label="Switch to Telugu"
          >
            తెలుగు
          </button>
          <button
            onClick={() => setLang("en")}
            className={`transition-colors hover:text-accent ${lang === "en" ? "text-accent font-semibold" : ""}`}
            aria-label="Switch to English"
          >
            English
          </button>
        </div>
      </div>

      {/* Masthead — full-width banner, no cropping */}
      <header className="relative overflow-hidden">

        {/* Invisible h1 for screen readers — image carries the visual title */}
        <h1 className="sr-only">{t(lang, "govt_ap_full")}</h1>

        {/* Banner image — stretches to fill 155px header exactly */}
        <img
          src="/header-bg.png"
          alt="AP e-Procurement Portal — Government of Andhra Pradesh"
          className="block w-full"
          style={{ height: 155, objectFit: "fill" }}
        />

        {/* Dark scrim on the right third so the user card is readable */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0"
          style={{
            width: "36%",
            background: "linear-gradient(to left, rgba(4,14,34,0.70) 0%, transparent 100%)",
          }}
        />

        {/* User card + actions — anchored to bottom-right */}
        <div className="absolute bottom-3 right-4 z-10 hidden items-center gap-3 md:flex md:right-8">
          <div
            className="rounded px-3 py-2 text-right"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              backdropFilter: "blur(8px)",
            }}
          >
            <p className="text-[11px] uppercase tracking-wide text-white/60">
              {t(lang, "logged_in_as")}
            </p>
            <p className="text-sm font-semibold text-white">
              {currentUser?.name ?? "Guest User"}
            </p>
            <p className="text-[11px] text-white/60">
              {currentUser?.organization ?? "AP e-Procurement"}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hover:bg-white/10"
                style={{ color: "rgba(255,255,255,0.90)" }}
                aria-label={t(lang, "notifications")}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>{t(lang, "notifications")}</span>
                <button className="text-[11px] font-normal text-info hover:underline" onClick={markAllRead}>{t(lang, "mark_all_read")}</button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {visibleNotifications.slice(0, 8).map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2" onClick={() => markRead(n.id)}>
                    <div className="flex w-full items-center justify-between">
                      <span className={`text-xs ${n.read ? "font-normal text-muted-foreground" : "font-semibold text-foreground"}`}>{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-2">{n.body}</span>
                    <span className="text-[10px] text-muted-foreground">{fmtDateTime(n.createdAt)}</span>
                  </DropdownMenuItem>
                ))}
                {visibleNotifications.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t(lang, "no_notifications")}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/notifications" className="text-xs text-info">{t(lang, "view_all_notifications")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.90)" }}
            aria-label={t(lang, "logout")}
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

      </header>

      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(lang, "logout_confirm_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t(lang, "logout_confirm_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t(lang, "cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLogout}
            >
              {t(lang, "logout")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Primary nav */}
      <nav className="bg-primary text-primary-foreground shadow-md">
        <ul className="flex gap-0 overflow-x-auto px-2 md:px-6">
          {navItems.map((item) => {
            const itemPath = item.to.split("?")[0];
            const itemQuery = item.to.includes("?") ? new URLSearchParams(item.to.split("?")[1]) : null;
            const pathMatch = itemPath === "/" ? pathname === "/" : pathname.startsWith(itemPath);
            const queryMatch = itemQuery ? [...itemQuery.entries()].every(([k, v]) => searchParams.get(k) === v) : true;
            const active = pathMatch && (!itemQuery || queryMatch);
            return (
              <li key={item.labelKey}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-r border-primary-foreground/15 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition ${
                    active ? "bg-accent text-accent-foreground" : "text-primary-foreground/90 hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {t(lang, item.labelKey)}
                  {item.to === "/documents" && pendingReviewCount > 0 && (
                    <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {pendingReviewCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Breadcrumb / page title */}
      <div className="flex flex-col gap-2 border-b border-border bg-secondary/50 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="flex items-center text-xs text-muted-foreground">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <ChevronRight className="mx-1 h-3 w-3" />}
                {c.to ? <Link to={c.to} className="hover:text-primary">{c.label}</Link> : <span className="font-semibold text-primary">{c.label}</span>}
              </span>
            ))}
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-primary">{title}</h2>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <main id="main-content" className="flex-1 px-4 py-5 md:px-8">{children}</main>

      <footer className="mt-auto border-t-4 border-accent bg-primary text-primary-foreground">
        <div className="grid grid-cols-1 gap-6 px-4 py-6 md:grid-cols-4 md:px-8">
          <div>
            <h3 className="mb-2 text-base font-semibold">{t(lang, "footer_portal_title")}</h3>
            <p className="text-sm leading-relaxed text-primary-foreground/75">{t(lang, "footer_portal_desc")}</p>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">{t(lang, "footer_quick_links")}</h3>
            <ul className="space-y-1 text-sm text-primary-foreground/75">
              <li><Link to="/tenders" className="hover:text-accent">{t(lang, "nav_tenders")}</Link></li>
              <li><Link to="/vendors" className="hover:text-accent">{t(lang, "nav_vendors")}</Link></li>
              <li><Link to="/notifications" className="hover:text-accent">{t(lang, "nav_notifications")}</Link></li>
              <li><Link to="/compliance" className="hover:text-accent">{t(lang, "footer_cvc_guidelines")}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">{t(lang, "footer_help_desk")}</h3>
            <ul className="space-y-1.5 text-sm text-primary-foreground/75">
              <li className="flex items-center gap-2"><Phone className="h-3 w-3" /> 1800-3070-2232 (Toll Free)</li>
              <li className="flex items-center gap-2"><Mail className="h-3 w-3" /> helpdesk@apeprocurement.gov.in</li>
              <li className="flex items-center gap-2"><MapPin className="h-3 w-3" /> AP Secretariat, Velagapudi</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-base font-semibold">{t(lang, "footer_compliance")}</h3>
            <ul className="space-y-1 text-sm text-primary-foreground/75">
              <li>GFR 2017 Compliant</li>
              <li>CVC Guidelines</li>
              <li>IT Act 2000</li>
              <li>RTI Act 2005</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary-foreground/15 bg-[hsl(208_82%_18%)] px-4 py-3 text-center text-[11px] text-primary-foreground/75 md:px-8">
          © {new Date().getFullYear()} {t(lang, "footer_copyright")}
        </div>
      </footer>
    </div>
  );
}
