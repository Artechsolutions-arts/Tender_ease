import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, Search, Ticket, BookOpen, Video, Download, ChevronRight, HelpCircle, AlertCircle, CheckCircle2, User } from "lucide-react";
import { useT } from "@/lib/useT";

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  raisedBy: string;
  raisedOn: string;
  lastUpdate: string;
}

const SAMPLE_TICKETS: SupportTicket[] = [
  { id: "TKT-2026-0418", subject: "DSC token not detected on Chrome 124", category: "Digital Signature", priority: "High", status: "In Progress", raisedBy: "Sri. R. Venkatesh, IAS", raisedOn: "2026-04-22", lastUpdate: "2 hours ago" },
  { id: "TKT-2026-0417", subject: "Unable to upload BoQ exceeding 10 MB", category: "Tender Upload", priority: "Medium", status: "Resolved", raisedBy: "K. Suresh, JE", raisedOn: "2026-04-20", lastUpdate: "1 day ago" },
  { id: "TKT-2026-0416", subject: "Vendor not appearing in eligible list despite registration", category: "Vendor Mgmt", priority: "Medium", status: "Open", raisedBy: "P. Lakshmi", raisedOn: "2026-04-19", lastUpdate: "3 hours ago" },
  { id: "TKT-2026-0415", subject: "EMD refund not credited after 14 days", category: "Payments", priority: "High", status: "In Progress", raisedBy: "Coastal Infra Engineers", raisedOn: "2026-04-18", lastUpdate: "5 hours ago" },
  { id: "TKT-2026-0414", subject: "Bid submission deadline extension request", category: "Tender Mgmt", priority: "Low", status: "Closed", raisedBy: "Andhra IT Solutions", raisedOn: "2026-04-15", lastUpdate: "5 days ago" },
];

const FAQS = [
  { q: "How do I register my Digital Signature Certificate (DSC)?", a: "Insert your Class-3 DSC token, navigate to Profile → DSC Management, and click 'Register New Certificate'. Ensure your token drivers (eMudhra, SafeNet, etc.) are installed. The certificate must be valid for at least 6 months." },
  { q: "What is the minimum notice period for tender publication?", a: "As per GFR Rule 161, a minimum of 21 days notice is mandatory for open tenders. For complex works exceeding ₹50 Cr, 30 days is recommended. Limited tenders may have shorter periods with proper justification." },
  { q: "Can I edit a tender after publication?", a: "Yes, tenders may be amended before the bid submission deadline by issuing a corrigendum. All eligible vendors are automatically notified via email and in-app alerts. Amendments are version-tracked and DSC-signed." },
  { q: "How is L1 (Lowest Bidder) determined under QCBS?", a: "Under Quality and Cost Based Selection, the L1 is determined by composite score: 40% price + 30% technical + 20% past performance + 10% compliance. Pure L1 (lowest price) applies only for goods/works under LCS method." },
  { q: "What documents are required for vendor registration?", a: "GST Certificate, PAN Card, Incorporation Certificate, Trade License, last 3 years' audited financials, EPF/ESI registration, and category-specific licenses (e.g., PWD registration for civil works)." },
  { q: "How do I report a vigilance concern or cartel suspicion?", a: "Navigate to Compliance / CVC → File Complaint. All complaints are encrypted and routed to the Chief Vigilance Officer (CVO). Whistleblower identity is protected under PIDPI Resolution 2004." },
  { q: "What is the EMD refund timeline?", a: "EMD is refunded within 7 working days for unsuccessful bidders post-award and within 14 days for the L1 bidder upon contract signing and submission of Performance Bank Guarantee." },
  { q: "How can vendors track bid status?", a: "Vendors can log in to the e-Procurement portal and visit My Bids → Active Submissions. Status updates (Received, Under Technical Evaluation, Financial Opening, Awarded/Regretted) are reflected in real time." },
];

const PRIORITY_TONE: Record<SupportTicket["priority"], string> = {
  Low: "border-info/40 text-info",
  Medium: "border-warning/40 text-warning",
  High: "border-destructive/40 text-destructive",
  Critical: "border-destructive/60 bg-destructive/10 text-destructive",
};

const STATUS_TONE: Record<SupportTicket["status"], string> = {
  Open: "border-destructive/40 text-destructive",
  "In Progress": "border-warning/40 text-warning",
  Resolved: "border-success/40 text-success",
  Closed: "text-muted-foreground",
};

export default function HelpDesk() {
  const { toast } = useToast();
  const T = useT();
  const [tickets, setTickets] = useState<SupportTicket[]>(SAMPLE_TICKETS);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ subject: "", category: "Tender Mgmt", priority: "Medium" as SupportTicket["priority"], description: "" });

  useEffect(() => {
    document.title = "Help Desk — AP e-Procurement";
  }, []);

  const filteredFaqs = FAQS.filter((f) => !search || f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  const submitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast({ title: "Missing details", description: "Subject and description are required.", variant: "destructive" });
      return;
    }
    const id = `TKT-2026-${String(419 + tickets.length).padStart(4, "0")}`;
    const newTicket: SupportTicket = {
      id, subject: form.subject, category: form.category, priority: form.priority,
      status: "Open", raisedBy: "Sri. R. Venkatesh, IAS", raisedOn: new Date().toISOString().slice(0, 10), lastUpdate: "Just now",
    };
    setTickets((p) => [newTicket, ...p]);
    setForm({ subject: "", category: "Tender Mgmt", priority: "Medium", description: "" });
    toast({ title: "Ticket raised", description: `${id} has been registered. Helpdesk will respond within SLA.` });
  };

  const guides = [
    { title: "Officer Onboarding Guide", desc: "Step-by-step setup for Tender Inviting Authorities.", type: "PDF", size: "2.1 MB", icon: BookOpen },
    { title: "DSC Installation Manual", desc: "Configure Class-3 tokens on Windows / Mac / Linux.", type: "PDF", size: "1.4 MB", icon: BookOpen },
    { title: "Bid Evaluation Walkthrough", desc: "Video tutorial: QCBS scoring & comparative statement.", type: "Video", size: "12 min", icon: Video },
    { title: "Vendor Registration Demo", desc: "End-to-end demo of vendor onboarding flow.", type: "Video", size: "8 min", icon: Video },
    { title: "Corrigendum Issuance Guide", desc: "How to amend a published tender with version control.", type: "PDF", size: "780 KB", icon: BookOpen },
    { title: "Award & LoA Templates", desc: "Standard templates for Letter of Award and contracts.", type: "DOCX", size: "340 KB", icon: Download },
  ];

  return (
    <AdminLayout
      title={T("help_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("nav_help") }]}
      actions={
        <Button size="sm" className="h-8 gap-1.5 rounded-sm bg-accent text-xs text-accent-foreground hover:bg-accent/90">
          <MessageSquare className="h-3.5 w-3.5" /> Live Chat
        </Button>
      }
    >
      {/* Contact strip */}
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-sm border-2 border-accent/50 bg-accent/5 p-4 shadow-sm">
          <Phone className="mb-2 h-5 w-5 text-accent" />
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Toll Free Helpline</p>
          <p className="text-base font-bold text-primary">1800-3070-2232</p>
          <p className="text-[11px] text-muted-foreground">24×7 for critical issues</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4 shadow-sm">
          <Mail className="mb-2 h-5 w-5 text-info" />
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Email Support</p>
          <p className="text-sm font-semibold text-primary break-all">helpdesk@apeprocurement.gov.in</p>
          <p className="text-[11px] text-muted-foreground">SLA: 4 business hours</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4 shadow-sm">
          <Clock className="mb-2 h-5 w-5 text-success" />
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Working Hours</p>
          <p className="text-sm font-semibold text-primary">Mon–Sat · 9 AM – 6 PM</p>
          <p className="text-[11px] text-muted-foreground">Closed on gazetted holidays</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4 shadow-sm">
          <MapPin className="mb-2 h-5 w-5 text-warning" />
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Office Address</p>
          <p className="text-xs font-semibold text-primary">3rd Floor, Block-C, AP Secretariat</p>
          <p className="text-[11px] text-muted-foreground">Velagapudi, Amaravati – 522238</p>
        </div>
      </div>

      <Tabs defaultValue="raise" className="space-y-4">
        <TabsList className="rounded-sm bg-secondary">
          <TabsTrigger value="raise" className="rounded-sm text-xs">Raise Ticket</TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-sm text-xs">My Tickets</TabsTrigger>
          <TabsTrigger value="faq" className="rounded-sm text-xs">FAQs</TabsTrigger>
          <TabsTrigger value="guides" className="rounded-sm text-xs">Guides & Manuals</TabsTrigger>
          <TabsTrigger value="contacts" className="rounded-sm text-xs">Department Contacts</TabsTrigger>
        </TabsList>

        {/* Raise ticket */}
        <TabsContent value="raise">
          <div className="grid gap-4 lg:grid-cols-3">
            <form onSubmit={submitTicket} className="rounded-sm border border-border bg-card shadow-sm lg:col-span-2">
              <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Submit a Support Request</h3>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-primary">Subject *</label>
                  <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of your issue" className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-primary">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm">
                      {["Tender Mgmt", "Vendor Mgmt", "Bid Evaluation", "Digital Signature", "Payments", "Account Access", "Other"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-primary">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as SupportTicket["priority"] })} className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm">
                      {(["Low", "Medium", "High", "Critical"] as const).map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-primary">Description *</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="Provide detailed steps to reproduce, error messages, and impact on workflow." className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex items-center justify-between rounded-sm border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> Critical tickets are escalated to L2 within 30 minutes.</span>
                  <span>SLA: 4 hrs (Med) · 1 hr (High)</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm text-xs" onClick={() => setForm({ subject: "", category: "Tender Mgmt", priority: "Medium", description: "" })}>Reset</Button>
                  <Button type="submit" size="sm" className="h-8 gap-1.5 rounded-sm bg-accent text-xs text-accent-foreground hover:bg-accent/90">
                    <Send className="h-3 w-3" /> Submit Ticket
                  </Button>
                </div>
              </div>
            </form>

            <div className="space-y-3">
              <div className="rounded-sm border border-border bg-card shadow-sm">
                <div className="bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary-foreground">Quick Actions</div>
                <ul className="divide-y divide-border text-xs">
                  {["Reset Password", "Renew DSC", "Update Profile", "Request Demo", "Download Manuals"].map((a) => (
                    <li key={a}>
                      <a className="flex items-center justify-between px-3 py-2 hover:bg-secondary hover:text-primary">
                        <span>{a}</span><ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-sm border-2 border-success/40 bg-success/5 p-3 shadow-sm">
                <CheckCircle2 className="mb-1 h-4 w-4 text-success" />
                <p className="text-xs font-semibold text-success">SLA Performance</p>
                <p className="text-[11px] text-muted-foreground">94% tickets resolved within SLA in last 30 days.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          <div className="rounded-sm border border-border bg-card shadow-sm">
            <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-primary">My Support Tickets</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Ticket ID</th>
                    <th className="px-3 py-2 text-left">Subject</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Raised</th>
                    <th className="px-3 py-2 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/40">
                      <td className="px-3 py-2 font-mono text-[11px] text-info">{t.id}</td>
                      <td className="px-3 py-2 font-medium">{t.subject}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.category}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`rounded-sm text-[10px] ${PRIORITY_TONE[t.priority]}`}>{t.priority}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`rounded-sm text-[10px] ${STATUS_TONE[t.status]}`}>{t.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{t.raisedOn}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.lastUpdate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* FAQs */}
        <TabsContent value="faq">
          <div className="rounded-sm border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b-2 border-accent bg-secondary/60 px-3 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Frequently Asked Questions</h3>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search FAQs…" className="h-7 w-56 rounded-sm border border-input bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div className="p-3">
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((f, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-border">
                    <AccordionTrigger className="text-left text-sm hover:text-primary">
                      <span className="flex items-start gap-2"><HelpCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" /> {f.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-6 text-xs leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {filteredFaqs.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">No FAQs match your search.</p>}
            </div>
          </div>
        </TabsContent>

        {/* Guides */}
        <TabsContent value="guides">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <div key={g.title} className="rounded-sm border border-border bg-card p-4 shadow-sm transition hover:border-accent">
                <div className="mb-2 flex items-center justify-between">
                  <g.icon className="h-5 w-5 text-accent" />
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">{g.type}</span>
                </div>
                <h4 className="text-sm font-semibold leading-snug">{g.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{g.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{g.size}</span>
                  <Button size="sm" variant="outline" className="h-7 gap-1 rounded-sm text-[11px]">
                    <Download className="h-3 w-3" /> Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Department Contacts */}
        <TabsContent value="contacts">
          <div className="rounded-sm border border-border bg-card shadow-sm">
            <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-primary">Departmental Nodal Officers</h3>
            </div>
            <div className="grid gap-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
              {[
                { name: "Sri. M. Krishna Rao, IAS", role: "Chief Vigilance Officer (CVO)", dept: "AP e-Procurement", phone: "+91 863 244 1100", email: "cvo@apeprocurement.gov.in" },
                { name: "Smt. P. Anuradha", role: "Helpdesk Manager (L1/L2)", dept: "Technical Support Cell", phone: "+91 863 244 1101", email: "support.l1@apeprocurement.gov.in" },
                { name: "Sri. K. Bhaskar Reddy", role: "Vendor Registration Officer", dept: "Vendor Management", phone: "+91 863 244 1102", email: "vendor.reg@apeprocurement.gov.in" },
                { name: "Dr. S. Padmaja", role: "DSC & Security Officer", dept: "IT Security", phone: "+91 863 244 1103", email: "dsc.help@apeprocurement.gov.in" },
                { name: "Sri. T. Ramana", role: "Payments & EMD Officer", dept: "Treasury Coordination", phone: "+91 863 244 1104", email: "emd.refund@apeprocurement.gov.in" },
                { name: "Sri. J. Hari Prasad", role: "Audit & Compliance Liaison", dept: "Internal Audit", phone: "+91 863 244 1105", email: "audit.liaison@apeprocurement.gov.in" },
              ].map((c, i) => (
                <div key={i} className="space-y-1 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.role} · {c.dept}</p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 pl-11 text-xs"><Phone className="h-3 w-3 text-accent" /> {c.phone}</p>
                  <p className="flex items-center gap-1.5 pl-11 text-xs"><Mail className="h-3 w-3 text-info" /> {c.email}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
        <Ticket className="h-3 w-3" />
        For grievance redressal under PIDPI Resolution 2004, contact the Chief Vigilance Officer directly. All communications are confidential.
      </div>
    </AdminLayout>
  );
}