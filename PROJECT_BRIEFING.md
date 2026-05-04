# AP e-Procurement Portal — Complete Project Briefing

**Government of Andhra Pradesh · e-Procurement Cell · AI Tender Management**
*Satyameva Jayate*

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [User Roles & Accounts](#4-user-roles--accounts)
5. [Admin Side — Full Walkthrough](#5-admin-side--full-walkthrough)
6. [Vendor Side — Full Walkthrough](#6-vendor-side--full-walkthrough)
7. [OCR & AI Document Pipeline](#7-ocr--ai-document-pipeline)
8. [Email Notification System](#8-email-notification-system)
9. [In-App Notification System](#9-in-app-notification-system)
10. [Tender Lifecycle](#10-tender-lifecycle)
11. [Bid Evaluation Engine](#11-bid-evaluation-engine)
12. [Security & Compliance](#12-security--compliance)
13. [Multilingual Support](#13-multilingual-support)
14. [Database Schema Summary](#14-database-schema-summary)
15. [API Surface](#15-api-surface)
16. [Demo Credentials](#16-demo-credentials)

---

## 1. Project Overview

The **AP e-Procurement Portal** is a full-stack, AI-augmented government procurement platform built for the **Government of Andhra Pradesh**. It digitises the entire tender lifecycle — from Notice Inviting Tender (NIT) publication to Letter of Award (LoA) issuance — while embedding AI at every decision point: document verification, bid evaluation, anomaly detection, and vendor intelligence.

The system serves two distinct user classes:

| Role | Who | What They Do |
|------|-----|--------------|
| **Admin / Officer** | Government procurement officers (IAS/TIA) | Publish tenders, evaluate bids, award contracts, monitor compliance |
| **Vendor** | Registered companies / contractors | Browse tenders, submit bids, upload documents, track award status |

---

## 2. Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5 |
| Build Tool | Vite 5 (SWC compiler) |
| Routing | React Router v6 |
| State / Data Fetching | TanStack Query v5 (polling, cache, stale-while-revalidate) |
| HTTP Client | Axios |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS v3 |
| Charts | Recharts 2 (Bar, Line, Pie, Radar charts) |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |
| Toasts | Sonner |
| Dev Server | Port 8080 |

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python) |
| ASGI Server | Uvicorn |
| ORM | SQLAlchemy 2 |
| Database | PostgreSQL (via psycopg2-binary) |
| Authentication | JWT (access 15 min) + Refresh Tokens (7 days) via python-jose |
| Password Hashing | bcrypt |
| File Uploads | python-multipart |
| Rate Limiting | slowapi |
| Email | smtplib (STARTTLS, Gmail-compatible) |
| Config | python-dotenv |
| API Port | 3000 |

### AI / OCR Models
| Capability | Model / Tool |
|-----------|-------------|
| Vision OCR (images & scanned PDFs) | **Ollama** → `moondream` (default, configurable via `OLLAMA_VISION_MODEL`) |
| Document AI Validation | **Ollama** → `llama3.2:3b` (default, configurable via `OLLAMA_MODEL`) |
| PDF Text Extraction (digital PDFs) | **PyMuPDF** (fitz) — native text layer, no model needed |
| Image Preprocessing | **Pillow** (PIL) |
| AI Insights Engine | **ProcureAI v3.2** (custom label for the Ollama-backed analysis pipeline) |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| Containerisation | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| File Storage | Local disk (`uploads/` directory, 10 MB limit per file) |
| Environment Config | `.env` file |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Port 8080)                   │
│                React + Vite SPA Frontend                 │
│   TanStack Query  ←→  Axios  ←→  REST API (/api/v1)     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Port 3000)                  │
│  /auth  /tenders  /vendors  /bids  /documents  /notifs   │
│         JWT Auth Middleware + Role Guards                 │
└──────┬────────────────────────┬───────────────┬──────────┘
       │ SQLAlchemy ORM         │ Background     │ smtplib
┌──────▼──────────┐   ┌─────────▼─────────┐    │ SMTP
│   PostgreSQL    │   │  Ollama (Local AI) │    │ Gmail
│   Database      │   │  moondream (vision)│ ┌──▼──────┐
│   (Port 5432)   │   │  llama3.2 (text)  │ │  Email   │
└─────────────────┘   └───────────────────┘ │  Server  │
                                             └──────────┘
```

**Data Flow — Document Upload:**
1. Vendor uploads file → FastAPI saves to disk
2. Background thread spawns immediately (non-blocking)
3. Thread calls `ocr_service.extract_text()` → PyMuPDF (digital PDF) or Ollama vision (image/scanned PDF)
4. OCR text passed to `document_ai_service.validate_document()` → Ollama text model analyses
5. AI returns JSON: score (0–100), rating, findings, summary, flagged flag
6. `DocumentValidation` record created in PostgreSQL
7. Frontend polls `GET /documents/{id}` every few seconds until `ocrStatus === COMPLETED`

---

## 4. User Roles & Accounts

### Role Permissions

| Feature | Admin | Vendor |
|---------|-------|--------|
| Publish / Edit Tenders | ✅ | ❌ |
| View All Tenders | ✅ | Only eligible ones |
| Manage Vendors | ✅ | ❌ |
| Submit Bids | ❌ | ✅ |
| View All Bids | ✅ | Only own bids |
| Award Contract (LoA) | ✅ | ❌ |
| Upload Documents | ✅ | ✅ |
| Review Documents (AI) | ✅ | ❌ |
| View AI Insights | ✅ | ❌ |
| MIS Reports | ✅ | ❌ |
| CVC Compliance | ✅ | ❌ |
| Help Desk | ✅ | ❌ |
| View Notifications | ✅ | ✅ (own) |

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | muralimanohargedda@gmail.com | Admin@2026 |
| Vendor 1 | hrartechsolution@gmail.com | Vendor@2026 |
| Vendor 2 | artechnical707@gmail.com | Vendor@2026 |

---

## 5. Admin Side — Full Walkthrough

### 5.1 Admin Layout & Header
- **Top utility bar**: Government of Andhra Pradesh branding · Real last-login timestamp (locale-aware IST) · Accessibility font size (A– A A+) · Language switcher (English / हिंदी / తెలుగు) · Sitemap · Skip to main content
- **Masthead**: AP Govt logo · SATYAMEVA JAYATE (changes language with switcher) · "Government of Andhra Pradesh" · e-Procurement Portal · AI Tender Management
- **User info panel**: Logged-in officer name · AP e-Procurement Cell · Bell (notifications dropdown) · Logout (with confirmation dialog)
- **Horizontal nav bar**: Overview → Tenders → Vendors → Bid Evaluation → Awards/LOA → AI Insights → MIS Reports → Document Validator → Notifications → Compliance → Help Desk

---

### 5.2 Overview Dashboard (`/`)

**KPI Strip (4 cards)**
- Live Tenders: 248 (+8% vs last month)
- Tender Value: ₹1,247 Cr (+12% EMD secured)
- Avg Bidders per Tender: 9.4 (-3% vs last quarter)
- LoA Success Rate: 73% (+5% last 90 days)

**Left Sidebar**
- Quick Search: Tender ID / NIT No. — navigates to `/tenders?q=…`
- Tender Categories: Works (Civil) 86, Goods/Supplies 54, Services 42, Consultancy 23, IT/e-Gov 18, Auction/Sale 9
- Downloads: NIT Template (Form-I), Bid Evaluation Sheet, CVC Compliance Checklist, DSC User Manual
- Help Desk widget: 1800-3070-2232 · helpdesk@ap.gov.in · Mon–Sat

**Main Panel**
- Volume Chart: Monthly tender issuance vs award trend (bar chart)
- Category Chart: Spend distribution by category (pie/donut)
- Recent Tenders Table: Top live tenders with ID, name, status, deadline
- Deadlines Panel: Upcoming bid closing dates

---

### 5.3 Tenders (`/tenders`)

**Purpose:** Full CRUD lifecycle management of all NITs.

**Actions Available:**
- **Create Tender**: Opens `TenderFormDialog` — fills name, department, category, estimated value, start/end dates, description, document attachments, eligible vendor list
- **Edit Tender**: Pre-filled form dialog with history snapshot saved on save
- **View Tender**: Read-only drawer with all fields, documents list, eligible vendors list, award info
- **Version History**: Timeline of all edits — version number, editor, timestamp, change note, snapshot of previous state
- **Advance Status**: One-click arrow → moves tender through lifecycle (Draft → Published → Closed → Evaluated → Awarded)
- **Award Tender**: Dropdown to select winning vendor from eligible list + confirmation → triggers LoA issuance + winner/regret emails
- **Delete Tender**: Only Draft status tenders can be deleted

**Filters:** Search by Tender ID / name / department · Status filter dropdown (All / Draft / Published / Closed / Evaluated / Awarded)

**Table Columns:** Tender ID · Name + Category + Version · Department · Estimated Value (INR) · Bid Deadline · Eligible Vendor Count · Status badge · Actions

---

### 5.4 Vendors (`/vendors`)

**Purpose:** Manage registered vendor directory and process new vendor applications.

**Stats Row (4 cards):** Total vendors · Active vendors · Blacklisted count · Average performance score

**Two Tabs:**

**Tab 1 — Approved Vendors**
- Searchable table: Vendor ID · Company (contact person, email, phone) · Category · Compliance (GST, PAN, registration date) · Performance score (progress bar + completed tenders count) · Active tenders eligible for · Status (Active / Blacklisted)

**Tab 2 — Pending Verifications**
- New vendor applications awaiting review
- Shows: Reference ID · Company details (name, contact, email, phone) · Submitted date · Status
- Actions per row:
  - **AI Insights**: Side panel with Trust Score (0–100) + 4 verification metrics:
    - Identity & KYC — PAN/GSTIN database match confidence
    - Financial Health — profit margin trend
    - Project Capability — past project scale match
    - Compliance Check — debarment registry check
  - AI recommendation: IMMEDIATE APPROVAL / CAUTION + "Accept Recommendation" button
  - **Approve**: Moves vendor to approved directory
  - **Reject**: Removes application

---

### 5.5 Bid Evaluation (`/bid-evaluation`)

**Purpose:** AI-assisted comparative evaluation of all bids received for a tender.

**Tender Selector:** Dropdown of all tenders (not just closed) with estimated value, close date, bid count, status.

**AI Recommendation Banner (QCBS 80:20 scoring):**
- H1 Winner: Composite score / 100 + quoted amount
- L1 (Lowest Bidder): Quote + variance vs estimate
- Risk Flags: Count of bids with missing EMD/BG, blacklisted vendors, price spread %

**Composite Score Formula:**
```
Composite = Price Score × 0.40
          + Technical Score × 0.30
          + Past Performance × 0.20
          + Compliance Score × 0.10

Price Score = (Lowest Bid / This Bid Amount) × 100
```

**Three Tabs:**

1. **Comparative Matrix**: All bids ranked H1→HN with rank badge, vendor name, bid amount, variance vs estimate, technical score, past performance, compliance score, composite score, incomplete docs flag

2. **AI Technical Analysis**: Per-vendor cards with progress bars for Technical Capability, Past Performance, Compliance + remarks text

3. **Compliance Checklist**: Table — vendor × GST verified × PAN verified × EMD/BG present × Blacklist status × remarks

**Actions:** Export CER (prints page) · Issue LoA (awards to H1 winner) · Mark Evaluated

---

### 5.6 Awards / LoA (`/awards`)

**Purpose:** Complete audit register of all issued Letters of Award.

**Stats Row:** Total awards (FY 2025-26) · Total awarded value · Unique empanelled vendors · Average award cycle (days)

**Award Register Table:** Searchable by tender ID, vendor, department, category
- Columns: LoA Reference · Tender name/category · Vendor + score · Department · Value · Award date · Status · Actions (View / Download LoA)

**View LoA Dialog (3 tabs):**
- Summary: Tender metadata grid (ID, dept, category, value, bid period, eligible vendor count)
- Vendor: Awarded bidder details (name, contact, GST, PAN, performance score, completed tenders)
- History: Version timeline of all tender edits

**Download LoA**: Generates `.txt` file with formal government LoA format:
- Reference number: `LOA/{tender_id}/{year}`
- Full formal language with performance security obligations, timelines, conditions
- Signed by: Sri. R. Venkatesh, IAS — Tender Inviting Authority

**Export Register**: Downloads all awarded tenders as CSV with all metadata.

---

### 5.7 AI Insights (`/ai-insights`)

**Purpose:** AI-powered procurement intelligence dashboard — anomaly detection, forecasting, vendor intelligence, actionable recommendations.

**Model Tag:** ProcureAI v3.2 · Trained on 4.2 years of AP procurement data · 90–95% confidence intervals

**Executive Summary Hero Card:**
- Procurement health score · Risk index · Confidence %
- Estimated savings: ~7.4% under estimate
- Cycle time improvement: 14% QoQ

**KPI Strip:** Avg Bid Cycle (days) · Estimated Savings (₹) · Compliance Score (%) · Open Risk Flags count

**Four Tabs:**

1. **Risk & Anomalies**
   - Anomaly table: Reference ID · Type (Bid Clustering, Single Bidder Risk, Vendor Compliance, Price Variance) · Severity (High/Medium/Low) · Finding + Recommendation · Investigate button
   - Risk Distribution chart: % breakdown of bid rigging indicators, single-bidder tenders, compliance gaps, price variance, document authenticity
   - CVC Compliance Checklist: 6-item checklist with pass/fail icons

2. **Forecasts**
   - Q2 FY26 forecast cards: Tender volume, projected award value, avg cycle time, risk events
   - 6-month trend line chart: NITs issued vs awarded vs savings %
   - Category-wise spend bar chart

3. **Vendor Intelligence**
   - Radar chart: Avg vendor capability across 6 dimensions (Quality, Delivery, Price, Compliance, Past Performance, Capacity)
   - Top 5 performing vendors table: AI score progress bar, recommendation tag (Preferred / Eligible / Monitor)

4. **Recommendations**
   - 4 AI-generated procurement improvement cards with projected impact
   - Suggested Next Actions timeline with priority tags (High/Medium/Low)

---

### 5.8 MIS Reports (`/reports`)

**Purpose:** Management Information System reporting with charts and CSV export.

**Filters:** Time period (This Month / This Quarter / FY) · Department dropdown

**KPI Summary:** Total tenders · Total estimated value · Awarded tenders · Award success rate %

**Four Tabs:**
1. **Overview**: Summary stats in card grid
2. **By Category**: Bar chart of tender count and value per category
3. **By Department**: Department-wise tender distribution
4. **By Status**: Pie chart of tender status distribution

**Export Options:** Print report (browser print) · Download CSV

---

### 5.9 Document Validator (`/documents`)

**Purpose:** AI-powered OCR and document authenticity verification for vendor-uploaded documents.

**Admin View:** Sees all uploaded documents across all vendors
- Vendor can filter by specific vendor ID

**Document List Table:**
- Columns: File name · Document type · Uploaded by · OCR status (Pending / Processing / Completed / Failed) · AI Score (0–100) · AI Rating (Excellent/Good/Fair/Poor/Invalid) · AI Flagged indicator · Officer Decision

**OCR Status Flow:**
```
PENDING → PROCESSING → COMPLETED (with AI validation)
                     → FAILED (with error message)
```

**Review Panel (per document — Admin only):**
- Full AI findings list (Pass / Fail / Warning per category)
- AI summary (2–3 sentences)
- Officer decision: APPROVED / REJECTED / NEEDS_MORE_INFO
- Officer remarks text field
- Retry button (resets OCR and reprocesses)

---

### 5.10 Notifications (`/notifications`)

**Purpose:** Central notification center for all system events.

**Notification Types:**
- `tender_created` — New NIT published
- `tender_updated` — Tender amended/corrigendum
- `bid_submitted` — New bid received
- `tender_awarded` — Contract awarded
- `info` — General system alerts

**Features:**
- Unread count badge on bell icon in header
- Mark all as read · Individual mark-as-read on click
- Filter by type
- Notification dropdown in header (shows top 5 unread)
- Full page view with all notifications paginated

---

### 5.11 Compliance / CVC (`/compliance`)

**Purpose:** Central Vigilance Commission compliance monitoring and audit trail.

**Five Tabs:**

1. **CVC Findings**: Searchable findings table with ID, tender reference, category, severity, raised date, status (Open/Under Review/Resolved), observation, action taken
   - Click row → detail dialog with full text
   - Categories: Conflict of Interest, Single Bidder, Document Mismatch, Cartel Risk, Delayed Award

2. **Audit Trail**: System-level audit log — every action recorded with timestamp, actor, action type, entity, IP address, outcome (success/flagged)

3. **Policy Checklist**: GFR 2017 + CVC Guidelines compliance items with pass/fail status

4. **Legal Framework**: References to governing laws (GFR 2017, CVC Manual, IT Act 2000, RTI Act 2005, AP e-Procurement Policy)

5. **Blacklist Register**: Registry of debarred/blacklisted vendors with reason and effective date

---

### 5.12 Help Desk (`/help`)

**Purpose:** Internal support ticket management for procurement officers.

**Ticket Creation Form:** Subject · Category · Priority · Description → Submit

**Five Tabs:**
1. **Raise Ticket**: Ticket submission form
2. **Open Tickets**: List of unresolved tickets
3. **Knowledge Base**: FAQ and policy documents
4. **Contact**: Help desk phone, email, hours
5. **Escalation Matrix**: Escalation chain and SLA times

---

## 6. Vendor Side — Full Walkthrough

### 6.1 Registration Flow

New vendors do **not** create accounts through the login page username/password flow. Instead:

1. Vendor visits Login page → clicks "Register as Vendor"
2. Fills: Company name · Contact person · Email · Phone
3. Submits → `POST /auth/register-vendor` → creates `PendingVendor` record in DB
4. Admin receives **email notification** + **in-app notification** instantly
5. Admin reviews in Vendors → Pending Verifications tab
6. Admin can view AI Trust Score report and Approve or Reject

**Verification Step Tracker (4 stages shown to vendor):**

| Step | Label | What Happens |
|------|-------|-------------|
| 1 | Sign Up | Registration submitted |
| 2 | Govt Review | Admin reviews basic details (24–48 hrs) |
| 3 | Full Profile | Vendor uploads financial docs + DSC via OCR pipeline |
| 4 | Final Audit | Security checks + document audit in progress |

At **Step 3**, a warning banner appears: "Upload Financial Audit Reports (Last 3 Years) and Class III DSC" → "Upload Documents" button → routes to `/documents` (full OCR pipeline).

Once verified, vendor gets full portal access.

---

### 6.2 Vendor Dashboard (`/vendor-dashboard`)

**KPI Strip (4 cards):**
- Eligible Tenders: count matched to vendor category
- Open to Bid: Published tenders the vendor can bid on now
- Bids Submitted: Total bids placed
- Contracts Awarded: Count + total ₹ value

**Left Sidebar:**
- **Profile Card**: Company avatar (initials), name, vendor ID, Active/Blacklisted badge, contact, category, GST, PAN, registered date
- **Compliance Card**: Performance score progress bar (out of 100) + completed tenders count + DSC renewal warning
- **Documents Card**: Status of key documents (Verified / Expiring Soon / Pending Review) with validity dates

**Eligible Tenders Table:** All tenders this vendor is eligible for
- Click any row → opens detail dialog: full tender info (name, dept, category, value, eligible vendor count, start/end date, description, attached documents)
- If tender is Published and no bid yet → "Apply for this Tender" button in dialog → opens bid submission dialog

**Bid History Table:** All bids the vendor has submitted
- Columns: Tender ID · Tender Name · Bid Value · Submitted On · Status (Submitted / Under Review / Awarded / Rejected)
- Click row → opens tender detail dialog

**Bid Submission Dialog:**
- Select eligible open tender from dropdown
- Enter bid amount (₹)
- Enter notes / technical proposal summary
- Submit → `POST /bids` → instant admin email notification

**Download Profile:** Generates `.txt` file with full vendor profile, eligible tenders list, bid history.

---

### 6.3 Document Upload (`/documents`)

Available to both admins and vendors. Vendors see only their own uploads.

**Upload Form:**
- Drag/drop or click to upload: PDF, PNG, JPG, JPEG, WEBP (max 10 MB)
- Select document type from dropdown: GST Certificate, PAN Card, Company Registration, Experience Certificate, Financial Statement, Bank Guarantee, Bid Document, Tender Document, Other
- Optional: link to Vendor ID or Tender ID

**After Upload — Real-time Status Polling:**
- Immediately shows status: PENDING → PROCESSING → COMPLETED
- Frontend polls every few seconds using TanStack Query
- On COMPLETED: shows AI Score (0–100), Rating, Findings breakdown, AI Summary
- If admin has reviewed: shows officer decision (APPROVED / REJECTED / NEEDS_MORE_INFO) + remarks

---

## 7. OCR & AI Document Pipeline

### Step-by-Step Flow

```
File Upload (PDF / Image)
        │
        ▼
FastAPI saves file to disk (uploads/)
        │
        ▼
Background Thread spawns (non-blocking response to user)
        │
        ├─── Is PDF? ──► PyMuPDF extracts native text layer
        │     │              │
        │     │         Blank page? ──► Render to image (200 DPI)
        │     │                              │
        │     └───────────────────────────────┤
        │                                     ▼
        └─── Is Image? ──────────────► Pillow opens + converts to RGB
                                              │
                                              ▼
                                    Ollama Vision Model (moondream)
                                    Prompt: "Extract ALL text exactly..."
                                    Temperature: 0, max_tokens: 2048
                                              │
                                              ▼
                                        OCR Text string
                                              │
                                              ▼
                              document_ai_service.validate_document()
                                    Model: llama3.2:3b
                                    System: DocVerify AI persona
                                    Validates: authenticity, completeness,
                                    format, required fields, GST/PAN format,
                                    consistency with vendor context (GST/PAN cross-check)
                                              │
                                              ▼
                                    Returns JSON:
                                    {
                                      score: 0-100,
                                      rating: Excellent/Good/Fair/Poor/Invalid,
                                      flagged: true/false,
                                      findings: [{category, status, detail}],
                                      summary: "2-3 sentence assessment",
                                      recommendations: ["action items"]
                                    }
                                              │
                                              ▼
                              DocumentValidation saved to PostgreSQL
                              ocrStatus → COMPLETED
```

### Document Types Supported

| Type Enum | Description |
|-----------|-------------|
| GST_CERTIFICATE | GST registration certificate |
| PAN_CARD | PAN card scan |
| COMPANY_REGISTRATION | Certificate of Incorporation |
| EXPERIENCE_CERTIFICATE | Work completion certificates |
| FINANCIAL_STATEMENT | Balance sheets / audit reports |
| BANK_GUARANTEE | EMD or performance bank guarantee |
| BID_DOCUMENT | Bid-specific attachments |
| TENDER_DOCUMENT | NIT attachments uploaded by admin |
| OTHER | Any other document |

### Validation Rules (DocVerify AI)

- **GST Format**: 2-digit state code + 10-char PAN + `1Z` + 2 alphanumeric (e.g., `37AABCS1234N1Z5`)
- **PAN Format**: 10 characters, format `AAAAA1234A`
- **Cross-check**: GST and PAN in document vs vendor profile in DB
- **Forgery Indicators**: Inconsistent fonts, missing fields, implausible dates
- **Completeness**: All required fields present for the document type
- **Rating Thresholds**: ≥90 = Excellent, ≥75 = Good, ≥60 = Fair, ≥40 = Poor, <40 = Invalid

### Officer Review (Admin only)

After AI validation, admin officer can override with:
- **APPROVED** → `OFFICER_APPROVED` status
- **REJECTED** → `OFFICER_REJECTED` status
- **NEEDS_MORE_INFO** → `NEEDS_MORE_INFO` status + remarks
- Officer identity + timestamp recorded for audit trail
- **Retry**: Resets OCR, deletes existing validation, reprocesses from scratch

---

## 8. Email Notification System

### Infrastructure
- **Library**: Python `smtplib` + `email.mime`
- **Protocol**: SMTP with STARTTLS (port 587)
- **Compatible**: Gmail, Office 365, any STARTTLS-capable SMTP
- **Non-blocking**: Every email sent in a daemon background thread — API response never waits
- **Fallback**: If SMTP not configured, prints log message and silently skips (no crash)

### Email Templates
All emails use fully inline CSS (Gmail/Outlook safe) with:
- Government of India + Government of Andhra Pradesh identity header
- सत्यमेव जयते in header
- AP Govt branding colours (navy blue `#0f2744`)
- Footer: Help Desk · Address (Amaravati) · Compliance references (GFR 2017, CVC, IT Act, RTI)

### 6 Email Triggers

| # | Event | Recipients | Template |
|---|-------|-----------|---------|
| 1 | **Tender Created** | All eligible vendors (by category) | Formal NIT letter with bid instructions, deadlines, 7-step submission guide |
| 2 | **Tender Updated** | All eligible vendors | Corrigendum notice with amendment details, mandatory advisory |
| 3 | **Tender Awarded (Winner)** | Awarded vendor only | Gold trophy banner LoA with 6 mandatory action steps, performance security obligations |
| 4 | **Tender Awarded (Regrets)** | All other eligible vendors | Formal regret with EMD refund timeline, RTI rights notification |
| 5 | **New Bid Received** | All admin users | Bid alert with tender ref, vendor name, bid amount, CTA to /bid-evaluation |
| 6 | **New Vendor Registration** | All admin users | Vendor application alert with company details, CTA to /vendors |

---

## 9. In-App Notification System

Stored in `notifications` table with:

| Field | Purpose |
|-------|---------|
| `type` | tender_created / tender_updated / bid_submitted / tender_awarded / info |
| `audience` | "all" / specific role / specific vendor IDs |
| `target_role` | "admin" / "vendor" / null |
| `target_vendor_ids` | JSON array of specific vendor IDs |
| `channels` | ["in_app"] / ["in_app", "email"] |
| `read` | boolean, per notification |

**In Header:** Bell icon shows unread count badge. Dropdown shows top 5 unread with mark-as-read and "View All" link.

**Full Notifications Page:** Filter by type, mark all read, paginated list.

---

## 10. Tender Lifecycle

```
DRAFT ──────────────────────────────────────────────────────────────────────────►
  │   Admin creates NIT, sets eligibility, attaches documents
  │
  │ [Publish]
  ▼
PUBLISHED ────────────────────────────────────────────────────────────────────►
  │   Email + in-app notifications sent to eligible vendors
  │   Vendors can view, download documents, submit bids
  │
  │ [Close] (after end_date or manual)
  ▼
CLOSED ──────────────────────────────────────────────────────────────────────────►
  │   No new bids accepted
  │   Admin reviews Bid Evaluation page
  │
  │ [Mark Evaluated]
  ▼
EVALUATED ───────────────────────────────────────────────────────────────────────►
  │   Evaluation report finalized, QCBS composite scores calculated
  │
  │ [Issue LoA] → Admin selects winner
  ▼
AWARDED ─────────────────────────────────────────────────────────────────────────►
      Winner email (LoA) + Regret emails to all other eligible vendors
      Award appears in Awards Register
      Vendor dashboard shows awarded contract
```

---

## 11. Bid Evaluation Engine

### QCBS 80:20 Scoring

The evaluation uses **Quality and Cost Based Selection** with the following weights:

```
Composite Score = 
  (Lowest Bid / Vendor's Bid) × 100  × 0.40  [Price — 40%]
  + Technical Score                   × 0.30  [Technical — 30%]
  + Past Performance                  × 0.20  [Track Record — 20%]
  + Compliance Score                  × 0.10  [Compliance — 10%]
```

Bids are ranked H1 (highest composite) to HN. **H1 = Recommended Winner.**

### Risk Flag Logic
- **Missing EMD/BG**: Compliance score ≤ 65 → documents marked incomplete
- **Blacklisted Vendor**: Compliance score capped 40–60 range
- **Price Spread**: Max bid − L1 bid / L1 bid × 100 (flags cartel risk if narrow)
- **Single Bidder**: Triggers CVC review recommendation

### Eligibility Checks (Backend)
Before a bid is accepted via API:
1. Tender must be `Published` status
2. Bid deadline not yet passed
3. Vendor profile must exist
4. Vendor must not be blacklisted
5. Vendor must be in tender's eligible vendor list
6. No duplicate bid (one bid per vendor per tender — unique constraint)

---

## 12. Security & Compliance

### Authentication
- **Access Token**: JWT, 15-minute expiry, signed with `JWT_SECRET`
- **Refresh Token**: Random UUID, 7-day expiry, stored in PostgreSQL, rotated on use
- **Token Rotation**: Old refresh token deleted, new one issued on every refresh
- **Logout All Sessions**: Deletes all refresh tokens for the user
- **Password Storage**: bcrypt hashing (no plaintext)
- **Rate Limiting**: slowapi middleware on API endpoints

### Authorization
- `get_current_user` dependency: decodes JWT, fetches user from DB on every request
- `require_admin` dependency: raises 403 if role is not ADMIN
- Vendors can only access their own bids, documents, vendor profile

### Audit Trail
- Every significant action logged to `audit_logs` table: user ID, action, entity type, entity ID, details JSON, IP address, timestamp

### Regulatory Compliance
- **GFR 2017**: General Financial Rules — tender award criteria, committee constitution
- **CVC Guidelines**: Central Vigilance Commission — bid window ≥21 days, EMD/PBG verification, pre-bid meeting records
- **IT Act 2000**: Digital signature recognition
- **RTI Act 2005**: Right to information on procurement process
- **AP e-Procurement Policy**: State-specific procurement regulations

### Logout Confirmation
- Admin logout requires confirmation dialog: "Are you sure you want to logout?" with Cancel + Logout (red) buttons — prevents accidental session termination

---

## 13. Multilingual Support

The entire UI supports **3 languages** with instant switching — no page reload:

| Language | Code | Script |
|---------|------|--------|
| English | `en` | Latin |
| Hindi | `hi` | Devanagari (हिंदी) |
| Telugu | `te` | Telugu script (తెలుగు) |

**What changes:**
- All navigation labels, button text, page headings, table headers
- Masthead motto: "Satyameva Jayate" / "सत्यमेव जयते" / "సత్యమేవ జయతే"
- Government name: "Government of Andhra Pradesh" / "आंध्र प्रदेश सरकार" / "ఆంధ్ర ప్రదేశ్ ప్రభుత్వం"
- Portal tagline, breadcrumbs, form labels, error messages, status texts
- Last login date format: `Intl.DateTimeFormat` with `en-IN` / `hi-IN` / `te-IN` locale — number scripts, month names, and AM/PM change to match language

**Implementation:** `src/lib/translations.ts` — single object with `en`, `hi`, `te` keys. `useLang()` hook from Zustand-like `lang-store`. `t(lang, key)` function returns the string. `TranslationKey` type is auto-derived from `keyof typeof translations.en` — TypeScript enforces all 3 languages have the same keys.

**Font Size:** A– (13px) / A (16px) / A+ (19px) — persisted in `localStorage` and applied to `document.documentElement.style.fontSize`.

---

## 14. Database Schema Summary

| Table | Purpose |
|-------|---------|
| `users` | All users (admin + vendor), role, verification step, vendor_id link |
| `refresh_tokens` | Active sessions — token, user_id, expiry (cascade delete with user) |
| `vendors` | Approved vendor directory — company details, GST, PAN, performance score |
| `pending_vendors` | New registration applications awaiting admin review |
| `tenders` | All NITs — status, value, department, category, awarded_vendor_id |
| `tender_documents` | Files attached to tenders (metadata only — URL/size) |
| `tender_eligible_vendors` | M2M: which vendors are eligible for which tenders |
| `tender_history` | Version snapshots of tender edits — full JSON snapshot per version |
| `bids` | Submitted bids — vendor_id, tender_id, amount, notes, status (unique per vendor+tender) |
| `notifications` | In-app notifications — type, audience, read flag, related_tender_id |
| `ai_validations` | AI analysis results tied to tenders (anomaly scores, risk flags) |
| `vendor_documents` | Uploaded files — OCR text, OCR status, file path, doc type |
| `document_validations` | AI validation results — score, rating, findings JSON, officer decision |
| `audit_logs` | Immutable audit trail — every significant action |

---

## 15. API Surface

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/auth/login` | Email + password → access token + refresh token |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/logout-all` | Kill all sessions |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/register-vendor` | Submit new vendor application |
| PATCH | `/auth/verification-step` | Update vendor verification step |
| GET | `/tenders` | List tenders (filter by status, page, limit) |
| POST | `/tenders` | Create tender (admin only) |
| GET | `/tenders/{id}` | Get single tender |
| PUT | `/tenders/{id}` | Update tender (admin only) |
| DELETE | `/tenders/{id}` | Delete draft tender (admin only) |
| PATCH | `/tenders/{id}/status` | Advance status + trigger email notifications |
| GET | `/vendors` | List vendors |
| GET | `/vendors/{id}` | Get vendor profile |
| POST | `/vendors/approve/{pending_id}` | Approve pending vendor (admin only) |
| POST | `/vendors/reject/{pending_id}` | Reject pending vendor (admin only) |
| GET | `/vendors/pending` | List pending applications (admin only) |
| GET | `/bids` | List bids (vendor sees own; admin sees all) |
| POST | `/bids` | Submit bid (vendor only) |
| GET | `/bids/{id}` | Get single bid |
| POST | `/documents/upload` | Upload document file (multipart) → triggers OCR pipeline |
| GET | `/documents` | List documents |
| GET | `/documents/{id}` | Get document + OCR + validation |
| POST | `/documents/{id}/retry` | Retry OCR (admin only) |
| PATCH | `/documents/{id}/review` | Officer decision on document (admin only) |
| DELETE | `/documents/{id}` | Delete document (admin only) |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/{id}/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |

---

## 16. Demo Credentials

### Admin Account
| Field | Value |
|-------|-------|
| Email | muralimanohargedda@gmail.com |
| Password | Admin@2026 |
| Gets Email Alerts For | Every new bid submitted, every new vendor registration |
| In-App Alerts | Same events |

### Vendor Account 1
| Field | Value |
|-------|-------|
| Email | hrartechsolution@gmail.com |
| Password | Vendor@2026 |
| Gets Email Alerts For | All tender created, updated, and award notifications |

### Vendor Account 2
| Field | Value |
|-------|-------|
| Email | artechnical707@gmail.com |
| Password | Vendor@2026 |
| Gets Email Alerts For | All tender created, updated, and award notifications |

Both vendor accounts are pre-added to the eligible vendor list of all active tenders, so all tender lifecycle emails (NIT, corrigendum, LoA winner, LoA regret) are triggered automatically during demos.

---

## Demo Flow for Presentations

**Admin Demo:**
1. Login as admin → show Overview Dashboard (KPIs, charts, categories)
2. Go to Tenders → Create a new NIT → eligible vendors receive email instantly
3. Advance status to Published → show email arrives in vendor inbox
4. Go to Vendors → Pending tab → show AI Trust Score for new applicant → Approve
5. Go to Bid Evaluation → select a closed tender → show QCBS composite ranking
6. Issue LoA → winner gets award email, others get regret email
7. Go to AI Insights → show anomaly detection and CVC checklist
8. Go to Document Validator → upload a PDF → watch OCR → AI score appears
9. Switch language to Hindi / Telugu → everything translates instantly
10. Click Logout → show confirmation dialog

**Vendor Demo:**
1. Login as vendor → show dashboard with eligible tenders
2. Click tender row → see full tender details
3. Submit a bid → admin gets email notification instantly
4. Go to Documents → upload a document → watch OCR + AI score
5. Switch language → show multilingual support

---

*Document generated: May 2026 · AP Tender e-Procurement Portal v4.2.1*
*Government of Andhra Pradesh · AP Secretariat, Velagapudi, Amaravati — 522 239*
