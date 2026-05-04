import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, FileText, Users, Sparkles, LayoutDashboard, FileCheck2, Gavel, BarChart3, ShieldCheck, HelpCircle, LogOut, ChevronRight, BriefcaseBusiness, ScanSearch, Phone, Mail, MapPin } from "lucide-react";
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

const FONT_SIZES: Record<FontScale, string> = { small: "13px", normal: "16px", large: "19px" };

const NAV: { labelKey: TranslationKey; icon: React.ElementType; to: string; roles: string[] }[] = [
  { labelKey: "nav_overview", icon: LayoutDashboard, to: "/", roles: ["admin"] },
  { labelKey: "nav_tenders", icon: FileText, to: "/tenders", roles: ["admin"] },
  { labelKey: "nav_vendors", icon: Users, to: "/vendors", roles: ["admin"] },
  { labelKey: "nav_vendor_dashboard", icon: BriefcaseBusiness, to: "/vendor-dashboard", roles: ["vendor"] },
  { labelKey: "nav_bid_evaluation", icon: FileCheck2, to: "/bid-evaluation", roles: ["admin"] },
  { labelKey: "nav_awards", icon: Gavel, to: "/awards", roles: ["admin"] },
  { labelKey: "nav_ai_insights", icon: Sparkles, to: "/ai-insights", roles: ["admin"] },
  { labelKey: "nav_reports", icon: BarChart3, to: "/reports", roles: ["admin"] },
  { labelKey: "nav_documents", icon: ScanSearch, to: "/documents", roles: ["admin", "vendor"] },
  { labelKey: "nav_notifications", icon: Bell, to: "/notifications", roles: ["admin", "vendor"] },
  { labelKey: "nav_compliance", icon: ShieldCheck, to: "/compliance", roles: ["admin"] },
  { labelKey: "nav_help", icon: HelpCircle, to: "/help", roles: ["admin"] },
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

      {/* Masthead */}
      <header className="border-b-4 border-accent bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-4">
            <img
              src="/ap-govt-logo.png"
              alt="Government of Andhra Pradesh emblem"
              className="h-16 w-16 object-contain"
            />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t(lang, "satyameva")}</p>
              <h1 className="text-lg font-bold leading-tight tracking-tight text-primary md:text-2xl">
                {t(lang, "govt_ap_full")}
              </h1>
              <p className="text-xs font-semibold text-accent md:text-sm">{t(lang, "portal_tagline")}</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded border border-border bg-secondary/40 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase text-muted-foreground">{t(lang, "logged_in_as")}</p>
              <p className="text-xs font-semibold text-primary">{currentUser?.name ?? "Guest User"}</p>
              <p className="text-[10px] text-muted-foreground">{currentUser?.organization ?? "AP e-Procurement"}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-primary hover:bg-secondary" aria-label={t(lang, "notifications")}>
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

            <Button variant="ghost" size="icon" className="text-primary hover:bg-secondary" aria-label={t(lang, "logout")} onClick={() => setShowLogoutConfirm(true)}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
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
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <li key={item.labelKey}>
                <Link
                  to={item.to}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-r border-primary-foreground/15 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition ${
                    active ? "bg-accent text-accent-foreground" : "text-primary-foreground/90 hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {t(lang, item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Breadcrumb / page title */}
      <div className="flex flex-col gap-2 border-b border-border bg-secondary/50 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="flex items-center text-[11px] text-muted-foreground">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <ChevronRight className="mx-1 h-3 w-3" />}
                {c.to ? <Link to={c.to} className="hover:text-primary">{c.label}</Link> : <span className="font-semibold text-primary">{c.label}</span>}
              </span>
            ))}
          </p>
          <h2 className="mt-0.5 text-base font-bold text-primary">{title}</h2>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <main id="main-content" className="flex-1 px-4 py-5 md:px-8">{children}</main>

      <footer className="mt-auto border-t-4 border-accent bg-primary text-primary-foreground">
        <div className="grid grid-cols-1 gap-6 px-4 py-6 md:grid-cols-4 md:px-8">
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t(lang, "footer_portal_title")}</h3>
            <p className="text-xs leading-relaxed text-primary-foreground/75">{t(lang, "footer_portal_desc")}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t(lang, "footer_quick_links")}</h3>
            <ul className="space-y-1 text-xs text-primary-foreground/75">
              <li><Link to="/tenders" className="hover:text-accent">{t(lang, "nav_tenders")}</Link></li>
              <li><Link to="/vendors" className="hover:text-accent">{t(lang, "nav_vendors")}</Link></li>
              <li><Link to="/notifications" className="hover:text-accent">{t(lang, "nav_notifications")}</Link></li>
              <li><a className="hover:text-accent cursor-pointer">{t(lang, "footer_cvc_guidelines")}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t(lang, "footer_help_desk")}</h3>
            <ul className="space-y-1.5 text-xs text-primary-foreground/75">
              <li className="flex items-center gap-2"><Phone className="h-3 w-3" /> 1800-3070-2232 (Toll Free)</li>
              <li className="flex items-center gap-2"><Mail className="h-3 w-3" /> helpdesk@apeprocurement.gov.in</li>
              <li className="flex items-center gap-2"><MapPin className="h-3 w-3" /> AP Secretariat, Velagapudi</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t(lang, "footer_compliance")}</h3>
            <ul className="space-y-1 text-xs text-primary-foreground/75">
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
