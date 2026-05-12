import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Mail, CheckCheck, FileText, Award, Edit3, Inbox } from "lucide-react";
import { useAdmin, fmtDateTime, type AppNotification } from "@/store/admin-store";
import { useAuth } from "@/store/auth-store";
import { useT } from "@/lib/useT";

const ICON: Record<AppNotification["type"], typeof Bell> = {
  tender_created: FileText,
  tender_updated: Edit3,
  tender_awarded: Award,
  bid_submitted: Inbox,
  info: Bell,
};

const TONE: Record<AppNotification["type"], string> = {
  tender_created: "border-l-info text-info",
  tender_updated: "border-l-warning text-[hsl(38_95%_30%)]",
  tender_awarded: "border-l-success text-success",
  bid_submitted: "border-l-accent text-accent",
  info: "border-l-primary text-primary",
};

export default function Notifications() {
  const { notifications, emails, markAllRead, markRead } = useAdmin();
  const { currentUser } = useAuth();
  const T = useT();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"in_app" | "email">("in_app");
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
  const visibleNotifications = notifications.filter((n) => {
    if (!currentUser) return false;
    if (n.targetRole && n.targetRole !== "all" && n.targetRole !== currentUser.role) return false;
    if (currentUser.role === "vendor" && n.targetVendorIds?.length) return n.targetVendorIds.includes(currentUser.vendorId ?? "");
    return true;
  });
  const visibleEmails = currentUser?.role === "vendor"
    ? emails.filter((e) => e.to.toLowerCase() === currentUser.email.toLowerCase())
    : emails;
  const isVendor = currentUser?.role === "vendor";

  return (
    <AdminLayout
      title={T("notif_title")}
      breadcrumbs={[{ label: T("common_home"), to: isVendor ? "/vendor-dashboard" : "/" }, { label: isVendor ? T("common_vendor_console") : T("common_officer_console"), to: isVendor ? "/vendor-dashboard" : "/" }, { label: T("nav_notifications") }]}
      actions={
        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-sm" onClick={markAllRead}>
          <CheckCheck className="h-3.5 w-3.5" /> {T("notif_mark_all")}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setTab("in_app")}
          className={`rounded-sm border-l-4 border-l-primary p-3 text-left shadow-sm transition-all hover:shadow-md group ${tab === "in_app" ? "border border-primary bg-primary/10" : "border border-border bg-card hover:bg-primary/5"}`}
        >
          <p className="text-xs font-semibold uppercase text-muted-foreground">{T("notif_in_app")}</p>
          <p className="text-2xl font-bold text-primary">{visibleNotifications.length}</p>
          <p className="text-xs text-muted-foreground">{visibleNotifications.filter((n) => !n.read).length} {T("notif_unread")}</p>
          <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${tab === "in_app" ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`}>
            {tab === "in_app" ? "▶ Viewing In-App" : "→ View In-App"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTab("email")}
          className={`rounded-sm border-l-4 border-l-accent p-3 text-left shadow-sm transition-all hover:shadow-md group ${tab === "email" ? "border border-accent bg-accent/10" : "border border-border bg-card hover:bg-accent/5"}`}
        >
          <p className="text-xs font-semibold uppercase text-muted-foreground">{T("notif_emails")}</p>
          <p className="text-2xl font-bold text-accent">{visibleEmails.length}</p>
          <p className="text-xs text-muted-foreground">{T("notif_via_smtp")}</p>
          <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${tab === "email" ? "text-accent" : "text-muted-foreground group-hover:text-accent"}`}>
            {tab === "email" ? "▶ Viewing Email Log" : "→ View Email Log"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => navigate("/compliance")}
          className="rounded-sm border border-border border-l-4 border-l-success bg-card p-3 shadow-sm text-left transition-all hover:shadow-md hover:bg-success/5 group"
        >
          <p className="text-xs font-semibold uppercase text-muted-foreground">{T("notif_triggers")}</p>
          <p className="text-2xl font-bold text-success">4</p>
          <p className="text-xs text-muted-foreground">{T("notif_trigger_events")}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-success">→ View Compliance</p>
        </button>
      </div>

      <Card className="mt-4 rounded-sm border-border">
        <div className="border-b border-border bg-secondary/40 px-3 pt-2">
          <div className="flex gap-0">
            {[
              { key: "in_app", labelKey: "notif_tab_inapp" as const, icon: Bell, count: visibleNotifications.length },
              { key: "email", labelKey: "notif_tab_email" as const, icon: Mail, count: visibleEmails.length },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as "in_app" | "email")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                  tab === t.key ? "border-accent text-primary" : "border-transparent text-muted-foreground hover:text-primary"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" /> {T(t.labelKey)}
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-primary">{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {tab === "in_app" && (
          <div className="divide-y divide-border">
            {visibleNotifications.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">{T("notif_none")}</p>}
            {visibleNotifications.map((n) => {
              const Icon = ICON[n.type];
              return (
                <div
                  key={n.id}
                  className={`flex cursor-pointer items-start gap-3 border-l-4 px-4 py-3 hover:bg-secondary/30 ${TONE[n.type]} ${n.read ? "opacity-70" : ""}`}
                  onClick={() => { markRead(n.id); setSelectedNotif(n); }}
                >
                  <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${n.read ? "font-normal" : "font-bold"} text-foreground`}>{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{n.body}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{fmtDateTime(n.createdAt)}</span>
                      <span>·</span>
                      <span className="rounded-sm bg-secondary px-1.5 py-0.5">{T("notif_audience")} {n.audience}</span>
                      {n.channels.map((c) => (
                        <span key={c} className="rounded-sm bg-secondary px-1.5 py-0.5">{c === "in_app" ? T("notif_ch_inapp") : T("notif_ch_email")}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "email" && (
          <div className="divide-y divide-border">
            {visibleEmails.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Mail className="mx-auto mb-2 h-6 w-6 opacity-50" />
                {T("notif_no_emails")}
              </div>
            )}
            {visibleEmails.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/20">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-info" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{e.subject}</p>
                    <span className="rounded-sm bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success ring-1 ring-success/30">{e.status}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">To: <span className="font-mono">{e.to}</span></p>
                  <p className="mt-1 text-sm text-foreground/80 line-clamp-2">{e.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{fmtDateTime(e.sentAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notification detail dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={(o) => !o && setSelectedNotif(null)}>
        <DialogContent className="max-w-md">
          {selectedNotif && (() => {
            const Icon = ICON[selectedNotif.type];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4" /> {selectedNotif.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p className="text-foreground/90 leading-relaxed">{selectedNotif.body}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-sm border border-border bg-secondary/30 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Type</p>
                      <p className="mt-0.5 font-semibold capitalize">{selectedNotif.type.replace(/_/g, " ")}</p>
                    </div>
                    <div className="rounded-sm border border-border bg-secondary/30 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Audience</p>
                      <p className="mt-0.5 font-semibold">{selectedNotif.audience}</p>
                    </div>
                    <div className="rounded-sm border border-border bg-secondary/30 px-3 py-2 col-span-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Timestamp</p>
                      <p className="mt-0.5 font-semibold">{fmtDateTime(selectedNotif.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <span className="rounded-sm bg-secondary px-2 py-1 text-xs text-muted-foreground">
                      {selectedNotif.read ? "Read" : "Unread"}
                    </span>
                    {selectedNotif.channels.map((c) => (
                      <span key={c} className="rounded-sm bg-secondary px-2 py-1 text-xs text-muted-foreground">
                        {c === "in_app" ? "In-App" : "Email"}
                      </span>
                    ))}
                  </div>
                  {selectedNotif.relatedTenderId && (
                    <Button
                      size="sm"
                      className="w-full gap-2 rounded-sm bg-accent text-xs text-accent-foreground hover:bg-accent/90"
                      onClick={() => { setSelectedNotif(null); navigate(`/tenders?q=${selectedNotif.relatedTenderId}`); }}
                    >
                      View Tender {selectedNotif.relatedTenderId}
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
