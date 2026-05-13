import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MapPin, Clock, Send, Search, Ticket, BookOpen, Video, Download, ChevronRight, HelpCircle, AlertCircle, CheckCircle2, User } from "lucide-react";
import { useT } from "@/lib/useT";
import { printAsPdf, downloadBlob } from "@/lib/printPdf";

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
  const [activeTab, setActiveTab] = useState("raise");
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

  const GUIDE_CONTENT: Record<string, string> = {
    "Officer Onboarding Guide": `
      <div class="doc-title">Officer Onboarding Guide</div>
      <div class="kv"><span class="k">Audience:</span>Tender Inviting Authorities (TIA), District Officers</div>
      <div class="section-head">1. System Overview</div>
      <p style="font-size:10pt;margin:6px 0">The AP e-Procurement Portal enables end-to-end digital procurement — from NIT publication to Letter of Award — fully compliant with GFR 2017, CVC Manual on Procurement, and AP Financial Code.</p>
      <div class="section-head">2. Initial Setup</div>
      <div class="kv"><span class="k">Step 1:</span>Obtain official government email from your IT department.</div>
      <div class="kv"><span class="k">Step 2:</span>Submit onboarding form at Admin → User Management with DSC certificate details.</div>
      <div class="kv"><span class="k">Step 3:</span>Complete profile: designation, department, contact details, authorised value limit.</div>
      <div class="kv"><span class="k">Step 4:</span>Register your Class-3 DSC token (see DSC Installation Manual).</div>
      <div class="section-head">3. Publishing a NIT</div>
      <div class="kv"><span class="k">Navigate to:</span>Tenders → Create New NIT</div>
      <div class="kv"><span class="k">Mandatory fields:</span>Category, Department, Estimated Value, EMD amount, Bid Opening Date, Eligibility Criteria</div>
      <div class="kv"><span class="k">Documents:</span>Upload NIT document, BOQ, Drawings (max 25 MB per file). All PDFs must be text-searchable.</div>
      <div class="kv"><span class="k">Notice period:</span>Minimum 21 days from publication to bid closing (30 days for works &gt; ₹50 Cr).</div>
      <div class="kv"><span class="k">Final step:</span>DSC-sign and publish. Eligible vendors are auto-notified by email and SMS.</div>
      <div class="section-head">4. Bid Opening</div>
      <p style="font-size:10pt;margin:6px 0">On the bid opening date, navigate to Bid Evaluation → Select Tender → View Submissions. Two-envelope bids require technical opening first; financial envelope opens only for technically qualified bidders.</p>
      <div class="section-head">5. Common Errors</div>
      <div class="kv"><span class="k">DSC not detected:</span>Re-insert token; ensure browser plugin is active (Tools → DSC Management).</div>
      <div class="kv"><span class="k">Upload fails:</span>File must be PDF/XLS only, &lt; 25 MB. Convert Word to PDF before upload.</div>
      <div class="kv"><span class="k">Vendor missing:</span>Verify vendor is approved and category matches NIT category.</div>
      <div class="stamp"><p>AP e-Procurement Help Desk · helpdesk@apeprocurement.gov.in · 1800-3070-2232</p></div>`,

    "DSC Installation Manual": `
      <div class="doc-title">DSC Installation Manual</div>
      <div class="kv"><span class="k">Applies to:</span>eMudhra, SafeNet, WD, Sify Class-3 DSC Tokens</div>
      <div class="section-head">1. Pre-requisites</div>
      <div class="kv"><span class="k">OS:</span>Windows 10/11, macOS 12+, Ubuntu 20.04+</div>
      <div class="kv"><span class="k">Browser:</span>Google Chrome 120+ or Mozilla Firefox 115+</div>
      <div class="kv"><span class="k">Certificate validity:</span>Must be valid for at least 6 months from date of use.</div>
      <div class="section-head">2. Windows Installation</div>
      <div class="kv"><span class="k">Step 1:</span>Download token driver from your CA's website (e.g., emudhra.com → Support → Downloads).</div>
      <div class="kv"><span class="k">Step 2:</span>Run installer as Administrator. Accept EULA; default installation path is recommended.</div>
      <div class="kv"><span class="k">Step 3:</span>Insert DSC USB token. Wait for "Token Detected" in system tray.</div>
      <div class="kv"><span class="k">Step 4:</span>Open Chrome → Settings → Privacy → Security → Manage Certificates → verify certificate is listed.</div>
      <div class="section-head">3. macOS Installation</div>
      <div class="kv"><span class="k">Step 1:</span>Install PKCS#11 driver (DMG file from CA website). Drag to Applications.</div>
      <div class="kv"><span class="k">Step 2:</span>Open Keychain Access → Certificates → verify DSC appears.</div>
      <div class="kv"><span class="k">Step 3:</span>In Chrome, go to chrome://settings/certificates and import if not auto-detected.</div>
      <div class="section-head">4. Linux (Ubuntu)</div>
      <div class="kv"><span class="k">Step 1:</span>Install opensc: sudo apt-get install opensc pcscd pcsc-tools</div>
      <div class="kv"><span class="k">Step 2:</span>Run: pcsc_scan — verify token is detected.</div>
      <div class="kv"><span class="k">Step 3:</span>Configure Firefox: Preferences → Privacy → Security Devices → Load PKCS#11 module.</div>
      <div class="section-head">5. Portal Registration</div>
      <p style="font-size:10pt;margin:6px 0">After OS-level installation, log in to the portal → Profile → DSC Management → Register New Certificate. Enter PIN when prompted. Test signing with the "Test DSC" button.</p>
      <div class="stamp"><p>AP DSC Help Line · dsc.help@apeprocurement.gov.in · +91 863 244 1103</p></div>`,

    "Corrigendum Issuance Guide": `
      <div class="doc-title">Corrigendum Issuance Guide</div>
      <div class="kv"><span class="k">Purpose:</span>Amend a published tender before bid submission deadline</div>
      <div class="section-head">1. When to Issue a Corrigendum</div>
      <p style="font-size:10pt;margin:6px 0">A corrigendum must be issued for any change to: scope of work, BOQ quantities, eligibility criteria, bid submission deadline, drawings, specifications, or estimated value. Changes to estimated value &gt; 10% require fresh approval from the sanctioning authority.</p>
      <div class="section-head">2. Steps to Issue</div>
      <div class="kv"><span class="k">Step 1:</span>Navigate to Tenders → select the NIT → Actions → Issue Corrigendum.</div>
      <div class="kv"><span class="k">Step 2:</span>Select amendment type: Deadline Extension / Document Change / Scope Change / Combined.</div>
      <div class="kv"><span class="k">Step 3:</span>Upload amended document (clearly marked "Addendum No. X — Date"). All changes must be highlighted/tracked.</div>
      <div class="kv"><span class="k">Step 4:</span>Enter reason for amendment (mandatory — stored in audit trail).</div>
      <div class="kv"><span class="k">Step 5:</span>If deadline is extended, the minimum remaining period from corrigendum date must be ≥ 7 days.</div>
      <div class="kv"><span class="k">Step 6:</span>DSC-sign and publish. All registered bidders are auto-notified. Corrigendum appears in NIT history.</div>
      <div class="section-head">3. Compliance Notes</div>
      <div class="kv"><span class="k">Max corrigenda:</span>3 per NIT (beyond 3, re-tender is recommended as per CVC guidelines).</div>
      <div class="kv"><span class="k">Record retention:</span>All corrigenda are preserved in the NIT audit log (7-year retention as per GFR Rule 33).</div>
      <div class="stamp"><p>AP e-Procurement Portal · helpdesk@apeprocurement.gov.in · 1800-3070-2232</p></div>`,
  };

  const LOA_TEMPLATE = `LETTER OF AWARD TEMPLATE
Government of Andhra Pradesh
AP e-Procurement Portal

[Ref No.]: ___/LoA/____/2026

Date: _______________

To,
M/s _________________________________
[Address]

Sub: Letter of Award for [Tender Title] — NIT No. [NIT/XX/2025-26/XXX]

Dear Sir/Madam,

With reference to your bid dated __________ and subsequent negotiations/clarifications, the Government of Andhra Pradesh is pleased to award the above-mentioned contract to your firm as per the following terms:

1. CONTRACT DETAILS
   Tender ID      : _______________
   Contract Value : ₹_______________ (Rupees _______________ Only)
   Work Location  : _______________
   Department     : _______________

2. TERMS & CONDITIONS
   a) The work shall be commenced within 15 days from the date of this LoA.
   b) The contract period shall be ___ months from the date of commencement.
   c) Performance Bank Guarantee of 5% of contract value shall be submitted within 21 days.
   d) All applicable taxes, levies, and GST as per prevailing rates shall be borne by the contractor.
   e) Liquidated damages @ 0.5% per week (max 10%) shall apply for delays attributable to the contractor.

3. DOCUMENTS TO BE SUBMITTED WITHIN 21 DAYS
   □ Performance Bank Guarantee (5% of contract value)
   □ Signed and stamped copy of Agreement on stamp paper
   □ Insurance certificates (Contractor's All Risk + Workmen Compensation)
   □ Updated list of key personnel and equipment

4. COMMENCEMENT
   Site shall be handed over on _______________. Contractor must submit bar chart programme within 7 days of site handover.

5. DISPUTE RESOLUTION
   Any disputes arising under this contract shall be subject to the jurisdiction of courts at [City], Andhra Pradesh. Arbitration under the Arbitration and Conciliation Act, 1996, as amended.

Yours faithfully,

____________________________
[Name and Designation]
[Department]
Government of Andhra Pradesh

Cc: Finance Department, [Department], Audit Section
---
NOTE: This is a template document. Insert actual values before use. Get it vetted by the legal/finance department before issue.`;

  const openGuide = (g: typeof guides[number]) => {
    if (g.type === "Video") {
      toast({
        title: `${g.title} (${g.size})`,
        description: "This video guide is available on the AP e-Procurement Training Portal. Contact helpdesk@apeprocurement.gov.in to request access.",
      });
      return;
    }
    if (g.type === "DOCX") {
      downloadBlob(LOA_TEMPLATE, "Award-LoA-Template-GoAP.txt", "text/plain");
      toast({ title: "Template downloaded", description: "Open the .txt file; copy content into your Word document." });
      return;
    }
    const content = GUIDE_CONTENT[g.title];
    if (content) {
      printAsPdf(g.title, content);
    } else {
      toast({ title: "Guide unavailable", description: "This guide is being updated. Please check back shortly." });
    }
  };

  return (
    <AdminLayout
      title={T("help_title")}
      breadcrumbs={[{ label: T("common_home"), to: "/" }, { label: T("nav_help") }]}
    >
      {/* Contact strip */}
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-sm border-2 border-accent/50 bg-accent/5 p-4 shadow-sm">
          <Phone className="mb-2 h-5 w-5 text-accent" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Toll Free Helpline</p>
          <p className="text-base font-bold text-primary">1800-3070-2232</p>
          <p className="text-xs text-muted-foreground">24×7 for critical issues</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4 shadow-sm">
          <Mail className="mb-2 h-5 w-5 text-info" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Email Support</p>
          <p className="text-sm font-semibold text-primary break-all">helpdesk@apeprocurement.gov.in</p>
          <p className="text-xs text-muted-foreground">SLA: 4 business hours</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4 shadow-sm">
          <Clock className="mb-2 h-5 w-5 text-success" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Working Hours</p>
          <p className="text-sm font-semibold text-primary">Mon–Sat · 9 AM – 6 PM</p>
          <p className="text-xs text-muted-foreground">Closed on gazetted holidays</p>
        </div>
        <div className="rounded-sm border border-border bg-card p-4 shadow-sm">
          <MapPin className="mb-2 h-5 w-5 text-warning" />
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Office Address</p>
          <p className="text-sm font-semibold text-primary">3rd Floor, Block-C, AP Secretariat</p>
          <p className="text-xs text-muted-foreground">Velagapudi, Amaravati – 522238</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Submit a Support Request</h3>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">Subject *</label>
                  <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of your issue" className="h-9 w-full rounded-sm border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm">
                      {["Tender Mgmt", "Vendor Mgmt", "Bid Evaluation", "Digital Signature", "Payments", "Account Access", "Other"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as SupportTicket["priority"] })} className="h-9 w-full rounded-sm border border-input bg-background px-2 text-sm">
                      {(["Low", "Medium", "High", "Critical"] as const).map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">Description *</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="Provide detailed steps to reproduce, error messages, and impact on workflow." className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex items-center justify-between rounded-sm border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
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
                  {[
                    { label: "Reset Password", action: () => toast({ title: "Password reset link sent", description: "Check your registered email inbox." }) },
                    { label: "Renew DSC",       action: () => { setActiveTab("guides"); setTimeout(() => document.getElementById("guide-dsc")?.scrollIntoView({ behavior: "smooth" }), 300); toast({ title: "DSC Installation Manual opened", description: "See Guides & Manuals tab." }); } },
                    { label: "Update Profile",  action: () => toast({ title: "Profile update", description: "Contact your nodal officer or raise a ticket to update your registered details." }) },
                    { label: "Request Demo",    action: () => { setForm(f => ({ ...f, subject: "Request a portal demo session", category: "Other", description: "Please schedule a demo session for our team to understand the AP e-Procurement portal features." })); toast({ title: "Demo request pre-filled", description: "Review the form below and click Submit Ticket." }); } },
                    { label: "Download Manuals",action: () => setActiveTab("guides") },
                  ].map((item) => (
                    <li key={item.label}>
                      <button onClick={item.action} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary hover:text-primary">
                        <span>{item.label}</span><ChevronRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-sm border-2 border-success/40 bg-success/5 p-3 shadow-sm">
                <CheckCircle2 className="mb-1 h-4 w-4 text-success" />
                <p className="text-xs font-semibold text-success">SLA Performance</p>
                <p className="text-xs text-muted-foreground">94% tickets resolved within SLA in last 30 days.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tickets */}
        <TabsContent value="tickets">
          <div className="rounded-sm border border-border bg-card shadow-sm">
            <div className="border-b-2 border-accent bg-secondary/60 px-3 py-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-primary">My Support Tickets</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
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
                      <td className="px-3 py-2 font-mono text-xs text-info">{t.id}</td>
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
              <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Frequently Asked Questions</h3>
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
                    <AccordionContent className="pl-6 text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {filteredFaqs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No FAQs match your search.</p>}
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
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs font-semibold text-primary">{g.type}</span>
                </div>
                <h4 className="text-sm font-semibold leading-snug">{g.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{g.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{g.size}</span>
                  <Button size="sm" variant="outline" className="h-7 gap-1 rounded-sm text-[11px]" onClick={() => openGuide(g)}>
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
              <h3 className="text-sm font-bold uppercase tracking-wide text-primary">Departmental Nodal Officers</h3>
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
                      <p className="text-xs text-muted-foreground">{c.role} · {c.dept}</p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 pl-11 text-sm"><Phone className="h-3 w-3 text-accent" /> {c.phone}</p>
                  <p className="flex items-center gap-1.5 pl-11 text-sm"><Mail className="h-3 w-3 text-info" /> {c.email}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex items-center gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
        <Ticket className="h-3 w-3" />
        For grievance redressal under PIDPI Resolution 2004, contact the Chief Vigilance Officer directly. All communications are confidential.
      </div>
    </AdminLayout>
  );
}