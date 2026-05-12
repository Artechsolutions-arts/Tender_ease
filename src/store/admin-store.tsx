import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

export type TenderStatus = "Draft" | "Published" | "Closed" | "Evaluated" | "Awarded";
export const TENDER_STATUSES: TenderStatus[] = ["Draft", "Published", "Closed", "Evaluated", "Awarded"];

const STATUS_FLOW: Record<TenderStatus, TenderStatus[]> = {
  Draft: ["Published"],
  Published: ["Closed"],
  Closed: ["Evaluated"],
  Evaluated: ["Awarded"],
  Awarded: [],
};

export function nextStatuses(s: TenderStatus) {
  return STATUS_FLOW[s];
}

export interface TenderDoc { id: string; name: string; size: string; }

export interface TenderVersion {
  version: number;
  editedAt: string;
  editedBy: string;
  changes: string;
  snapshot: Omit<Tender, "history">;
}

export interface Tender {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  estimatedValue: number;
  category: string;
  department: string;
  documents: TenderDoc[];
  eligibleVendorIds: string[];
  status: TenderStatus;
  awardedVendorId?: string;
  createdAt: string;
  history: TenderVersion[];
}

export interface Vendor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  category: string;
  gst: string;
  pan: string;
  registeredOn: string;
  pastPerformance: number;
  completedTenders: number;
  blacklisted: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "tender_created" | "tender_updated" | "bid_submitted" | "tender_awarded" | "info";
  audience: string;
  targetRole?: "admin" | "vendor" | "all";
  targetVendorIds?: string[];
  channels: ("in_app" | "email")[];
  createdAt: string;
  read: boolean;
  relatedTenderId?: string;
}

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: "queued" | "sent";
}

export interface PendingVendor {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  submittedOn: string;
  status: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtTime = () => new Date().toISOString();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

function mapApiTender(t: any): Tender {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    startDate: t.startDate ?? t.start_date ?? "",
    endDate: t.endDate ?? t.end_date ?? "",
    estimatedValue: t.estimatedValue ?? t.estimated_value ?? 0,
    category: t.category ?? "",
    department: t.department ?? "",
    documents: (t.documents ?? []).map((d: any) => ({ id: d.id, name: d.name, size: d.size ?? "" })),
    eligibleVendorIds: t.eligibleVendorIds ?? [],
    status: t.status as TenderStatus,
    awardedVendorId: t.awardedVendorId ?? undefined,
    createdAt: t.createdAt ?? "",
    history: t.history ?? [],
  };
}

function mapApiVendor(v: any): Vendor {
  return {
    id: v.id,
    companyName: v.companyName,
    contactPerson: v.contactPerson,
    email: v.email,
    phone: v.phone,
    category: v.category,
    gst: v.gst,
    pan: v.pan,
    registeredOn: v.registeredOn ?? v.registered_on ?? "",
    pastPerformance: v.pastPerformance ?? v.past_performance ?? 0,
    completedTenders: v.completedTenders ?? v.completed_tenders ?? 0,
    blacklisted: v.blacklisted ?? false,
  };
}

// ── context ───────────────────────────────────────────────────────────────────
interface AdminCtx {
  vendors: Vendor[];
  pendingVendors: PendingVendor[];
  tenders: Tender[];
  notifications: AppNotification[];
  emails: EmailLog[];
  unreadCount: number;
  refreshTenders: () => void;
  refreshVendors: () => void;
  createTender: (t: Omit<Tender, "id" | "createdAt" | "history" | "status">) => Tender;
  updateTender: (id: string, patch: Partial<Tender>, changes: string) => void;
  changeStatus: (id: string, next: TenderStatus, awardedVendorId?: string) => void;
  deleteTender: (id: string) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  approveVendor: (id: string) => void;
  rejectVendor: (id: string) => void;
  addPendingVendor: (v: Omit<PendingVendor, "status" | "submittedOn">) => void;
}

const Ctx = createContext<AdminCtx | null>(null);

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  // ── state: start empty, API fills in ─────────────────────────────────────
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = sessionStorage.getItem("admin_notifications");
      return saved ? JSON.parse(saved) : [
        { id: uid("ntf"), title: "Welcome, Officer", body: "Tender Management System ready. Pending: 2 evaluations.", type: "info", audience: "Admin", targetRole: "admin", channels: ["in_app"], createdAt: fmtTime(), read: false },
      ];
    } catch { return []; }
  });

  // ── fetch vendors from Postgres ───────────────────────────────────────────
  const fetchVendors = useCallback(() => {
    apiClient.get("/vendors", { params: { limit: 100 } })
      .then(res => {
        const data = res.data?.vendors ?? res.data;
        if (Array.isArray(data)) setVendors(data.map(mapApiVendor));
      })
      .catch(() => {});
  }, []);

  // ── fetch pending vendors from Postgres ────────────────────────────────────
  const fetchPending = useCallback(() => {
    apiClient.get("/vendors/pending")
      .then(res => {
        const data = res.data?.vendors ?? res.data;
        if (Array.isArray(data)) {
          setPendingVendors(data.map((p: any) => ({
            id: p.id, company: p.company, contact: p.contact,
            email: p.email, phone: p.phone,
            submittedOn: p.submittedOn ?? p.submitted_on ?? "",
            status: p.status,
          })));
        }
      })
      .catch(() => {});
  }, []);

  // ── fetch tenders from Postgres ────────────────────────────────────────────
  const fetchTenders = useCallback(() => {
    apiClient.get("/tenders", { params: { limit: 100 } })
      .then(res => {
        const data = res.data?.tenders ?? res.data;
        if (Array.isArray(data)) setTenders(data.map(mapApiTender));
      })
      .catch(() => {});
  }, []);

  // Re-fetch whenever a token appears (e.g. right after login)
  const [token, setToken] = useState(() => sessionStorage.getItem("accessToken"));
  useEffect(() => {
    const id = setInterval(() => {
      const t = sessionStorage.getItem("accessToken");
      if (t !== token) setToken(t);
    }, 500);
    return () => clearInterval(id);
  }, [token]);

  useEffect(() => { if (token) { fetchVendors(); fetchPending(); fetchTenders(); } }, [token, fetchVendors, fetchPending, fetchTenders]);

  useEffect(() => {
    sessionStorage.setItem("admin_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const pushNotification = useCallback((n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
    setNotifications((prev) => [{ ...n, id: uid("ntf"), createdAt: fmtTime(), read: false }, ...prev]);
  }, []);

  const queueEmails = useCallback((to: string[], subject: string, body: string) => {
    setEmails((prev) => [
      ...to.map((addr) => ({ id: uid("eml"), to: addr, subject, body, sentAt: fmtTime(), status: "sent" as const })),
      ...prev,
    ]);
  }, []);

  const vendorEmails = useCallback((ids: string[]) =>
    vendors.filter((v) => ids.includes(v.id) && !v.blacklisted).map((v) => v.email),
  [vendors]);

  // ── tender mutations (API + optimistic local) ──────────────────────────────
  const createTender: AdminCtx["createTender"] = useCallback((t) => {
    const id = `TND-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 899))}`;
    const tender: Tender = { ...t, id, status: "Draft", createdAt: fmtTime(), history: [] };
    setTenders((p) => [tender, ...p]);

    apiClient.post("/tenders", {
      id: tender.id,
      name: tender.name,
      description: tender.description,
      startDate: tender.startDate,
      endDate: tender.endDate,
      estimatedValue: tender.estimatedValue,
      category: tender.category,
      department: tender.department,
      eligibleVendorIds: tender.eligibleVendorIds,
      status: "Draft",
      documents: tender.documents,
    }).then(() => fetchTenders()).catch((err) => {
      toast.error("Failed to save tender to database", {
        description: err?.response?.data?.detail ?? "Server error. The tender may not have been saved.",
      });
      fetchTenders();
    });

    pushNotification({
      title: `New tender drafted: ${t.name}`,
      body: `${t.eligibleVendorIds.length} vendor(s) marked eligible. Currently in Draft.`,
      type: "tender_created", audience: "Admin", targetRole: "admin", channels: ["in_app"], relatedTenderId: id,
    });
    return tender;
  }, [pushNotification, fetchTenders]);

  const updateTender: AdminCtx["updateTender"] = useCallback((id, patch, changes) => {
    setTenders((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const snapshot = { ...t } as Partial<Tender>;
      delete snapshot.history;
      const version: TenderVersion = {
        version: t.history.length + 1, editedAt: fmtTime(),
        editedBy: "Sri. R. Venkatesh, IAS", changes,
        snapshot: snapshot as Omit<Tender, "history">,
      };
      const updated: Tender = { ...t, ...patch, history: [version, ...t.history] };
      const targets = vendorEmails(updated.eligibleVendorIds);
      pushNotification({
        title: `Tender updated: ${updated.name}`,
        body: `${changes}. ${targets.length} eligible vendor(s) notified.`,
        type: "tender_updated", audience: `${targets.length} vendors`,
        targetRole: "vendor", targetVendorIds: updated.eligibleVendorIds,
        channels: ["in_app", "email"], relatedTenderId: id,
      });
      queueEmails(targets, `[AP e-Procurement] Update on ${id}`, `The tender "${updated.name}" has been updated. Change: ${changes}.`);
      return updated;
    }));

    apiClient.put(`/tenders/${id}`, {
      ...patch,
      startDate: patch.startDate,
      endDate: patch.endDate,
      eligibleVendorIds: patch.eligibleVendorIds,
    }).then(() => fetchTenders()).catch((err) => {
      toast.error("Failed to update tender", { description: err?.response?.data?.detail ?? "Server error." });
      fetchTenders();
    });
  }, [pushNotification, queueEmails, vendorEmails, fetchTenders]);

  const changeStatus: AdminCtx["changeStatus"] = useCallback((id, next, awardedVendorId) => {
    setTenders((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const snapshot = { ...t } as Partial<Tender>; delete snapshot.history;
      const version: TenderVersion = {
        version: t.history.length + 1, editedAt: fmtTime(), editedBy: "Sri. R. Venkatesh, IAS",
        changes: `Status changed: ${t.status} → ${next}${awardedVendorId ? ` (awarded to ${awardedVendorId})` : ""}`,
        snapshot: snapshot as Omit<Tender, "history">,
      };
      const updated: Tender = { ...t, status: next, awardedVendorId: awardedVendorId ?? t.awardedVendorId, history: [version, ...t.history] };

      if (next === "Published") {
        const targets = vendorEmails(updated.eligibleVendorIds);
        pushNotification({ title: `Tender published: ${updated.name}`, body: `NIT ${updated.id} is now live. Bid submission deadline: ${updated.endDate}.`, type: "tender_created", audience: `${targets.length} vendors`, targetRole: "vendor", targetVendorIds: updated.eligibleVendorIds, channels: ["in_app", "email"], relatedTenderId: id });
        queueEmails(targets, `[AP e-Procurement] New Tender ${id}`, `A new tender "${updated.name}" has been published. Bid submission deadline: ${updated.endDate}.`);
      } else if (next === "Awarded" && awardedVendorId) {
        const winner = vendors.find((v) => v.id === awardedVendorId);
        const losers = vendors.filter((v) => updated.eligibleVendorIds.includes(v.id) && v.id !== awardedVendorId && !v.blacklisted);
        if (winner) {
          pushNotification({ title: `Tender awarded: ${updated.name}`, body: `Letter of Award issued to ${winner.companyName}.`, type: "tender_awarded", audience: "Admin", targetRole: "admin", channels: ["in_app"], relatedTenderId: id });
          pushNotification({ title: `LoA issued: ${updated.name}`, body: `Congratulations. You have been awarded NIT ${updated.id}. Please report within 7 working days.`, type: "tender_awarded", audience: winner.companyName, targetRole: "vendor", targetVendorIds: [winner.id], channels: ["in_app", "email"], relatedTenderId: id });
          if (losers.length) {
            pushNotification({ title: `Tender outcome: ${updated.name}`, body: `NIT ${updated.id} has been awarded to another bidder. Thank you for participating.`, type: "info", audience: `${losers.length} unsuccessful vendors`, targetRole: "vendor", targetVendorIds: losers.map((l) => l.id), channels: ["in_app", "email"], relatedTenderId: id });
          }
          queueEmails([winner.email], `[AP e-Procurement] LoA – ${id}`, `Congratulations. You have been awarded the tender "${updated.name}". Please report within 7 working days.`);
          queueEmails(losers.map((l) => l.email), `[AP e-Procurement] Tender ${id} – Outcome`, `Thank you for participating in tender "${updated.name}". The contract has been awarded to another bidder.`);
        }
      } else {
        pushNotification({ title: `Tender ${next.toLowerCase()}: ${updated.name}`, body: `${updated.id} moved to ${next}.`, type: "info", audience: "Admin", targetRole: "admin", channels: ["in_app"], relatedTenderId: id });
      }
      return updated;
    }));

    apiClient.patch(`/tenders/${id}/status`, {
      status: next,
      ...(awardedVendorId ? { awardedVendorId } : {}),
    }).then(() => fetchTenders()).catch((err) => {
      toast.error("Failed to update tender status", { description: err?.response?.data?.detail ?? "Server error." });
      fetchTenders();
    });
  }, [pushNotification, queueEmails, vendors, vendorEmails, fetchTenders]);

  const deleteTender = useCallback((id: string) => {
    setTenders((p) => p.filter((t) => t.id !== id));
    apiClient.delete(`/tenders/${id}`).catch(() => {});
  }, []);

  // ── vendor mutations ───────────────────────────────────────────────────────
  const approveVendor = useCallback((id: string) => {
    const pr = pendingVendors.find(v => v.id === id);
    setPendingVendors(prev => prev.filter(v => v.id !== id));

    apiClient.patch(`/vendors/${id}/approve`)
      .then(() => {
        fetchVendors();
        fetchPending();
        if (pr) {
          pushNotification({
            title: "Vendor Approved",
            body: `${pr.company} (${pr.email}) has been approved and added to the vendor directory. An approval email has been sent.`,
            type: "info", audience: "Admin", targetRole: "admin", channels: ["in_app", "email"],
          });
          toast.success(`${pr.company} approved`, {
            description: "Vendor account activated. Approval email sent to vendor.",
          });
        }
      })
      .catch((err) => {
        if (pr) setPendingVendors(prev => [pr, ...prev]);
        toast.error("Failed to approve vendor", {
          description: err?.response?.data?.detail ?? "Server error. Please try again.",
        });
        fetchPending();
      });
  }, [pendingVendors, pushNotification, fetchVendors, fetchPending]);

  const rejectVendor = useCallback((id: string) => {
    const pr = pendingVendors.find(v => v.id === id);
    setPendingVendors(prev => prev.filter(v => v.id !== id));

    apiClient.patch(`/vendors/${id}/reject`)
      .then(() => {
        fetchPending();
        if (pr) {
          pushNotification({
            title: "Vendor Registration Rejected",
            body: `${pr.company} (${pr.email}) registration has been rejected. A notification email has been sent to the vendor.`,
            type: "info", audience: "Admin", targetRole: "admin", channels: ["in_app"],
          });
          toast.success(`${pr.company} rejected`, {
            description: "Rejection email sent to vendor.",
          });
        }
      })
      .catch((err) => {
        if (pr) setPendingVendors(prev => [pr, ...prev]);
        toast.error("Failed to reject vendor", {
          description: err?.response?.data?.detail ?? "Server error. Please try again.",
        });
        fetchPending();
      });
  }, [pendingVendors, pushNotification, fetchPending]);

  const addPendingVendor = useCallback((v: Omit<PendingVendor, "status" | "submittedOn">) => {
    const newPr: PendingVendor = {
      ...v, status: "Pending Review",
      submittedOn: new Date().toISOString().slice(0, 10),
    };
    setPendingVendors(prev => [newPr, ...prev]);
    pushNotification({
      title: "New Vendor Registration",
      body: `${v.company} has submitted a registration request.`,
      type: "info", audience: "Admin", targetRole: "admin", channels: ["in_app"],
    });
  }, [pushNotification]);

  const markAllRead = useCallback(() => setNotifications((p) => p.map((n) => ({ ...n, read: true }))), []);
  const markRead = useCallback((id: string) => setNotifications((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n))), []);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value: AdminCtx = {
    vendors, pendingVendors, tenders, notifications, emails, unreadCount,
    refreshTenders: fetchTenders, refreshVendors: fetchVendors,
    createTender, updateTender, changeStatus, deleteTender,
    markAllRead, markRead, approveVendor, rejectVendor, addPendingVendor,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin must be used inside <AdminStoreProvider>");
  return c;
}

export const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
export const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
