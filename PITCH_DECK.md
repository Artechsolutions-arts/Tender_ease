# AP e-Procurement Portal
## AI-Powered Tender Management System
### Government of Andhra Pradesh

---

## 1. The Problem

Public procurement in India accounts for **₹50+ lakh crore** annually, yet the process remains:

- **Manual and paper-heavy** — NIT publishing, bid evaluation, and LoA issuance done on spreadsheets
- **Prone to corruption** — no AI-driven anomaly detection or cartel-bidding alerts
- **Non-transparent** — vendors lack real-time status visibility into their bids and verifications
- **Compliance risk** — GFR 2017, CVC guidelines, and RTI obligations manually tracked
- **Siloed** — no unified platform connecting Tender Inviting Authorities, vendors, and verification officers

---

## 2. Our Solution

**AP e-Procurement** is a full-stack, AI-augmented government procurement portal that digitises the entire tender lifecycle — from NIT publication to Letter of Award — on a single secure platform.

> "From tender to award in one portal. AI does the review. Officers make the call."

---

## 3. Key Features

### For Tender Inviting Authorities (Admin)
| Feature | What It Does |
|---|---|
| **Tender Management** | Create, publish, close, and award tenders with full audit history |
| **Bid Evaluation Engine** | Comparative bid statements, L1 ranking, technical scoring |
| **AI Tender Validation** | Automated risk scoring, anomaly detection, and CVC compliance check |
| **AI Insights Dashboard** | Spend analytics, department-wise trends, cartel-bid alerts |
| **MIS Reports** | GFR-2017 Form-1 register, NIT publishing register, export to CSV/PDF |
| **Awards & LoA** | One-click Letter of Award generation and download |
| **Notification Engine** | Multi-channel alerts (in-app + email) to vendors and officers |

### For Vendors
| Feature | What It Does |
|---|---|
| **Self-Registration** | 5-step digital onboarding with document upload |
| **Document Validator** | AI-powered OCR extracts and validates GST, PAN, certificates |
| **Bid Submission** | Submit bids against eligible tenders with real-time status |
| **Dashboard** | Track bid history, rank, awarded contracts, and compliance status |
| **Profile Download** | Downloadable vendor profile report |

### For Verification Officers
| Feature | What It Does |
|---|---|
| **Document Review Panel** | View OCR-extracted text, AI confidence score, and flag status |
| **Approve / Reject / Query** | One-click decision with remarks, auto-notifies vendor |
| **AI Score + Rating** | Excellent / Good / Needs Review / Poor rating per document |

---

## 4. Technology Stack

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                        │
│  React 18 + TypeScript + Vite                   │
│  Tailwind CSS + shadcn/ui                        │
│  React Query · Recharts · Lucide Icons           │
│  Multilingual: English | हिंदी | తెలుగు          │
└─────────────────┬───────────────────────────────┘
                  │ REST API (JWT Auth)
┌─────────────────▼───────────────────────────────┐
│                  BACKEND                         │
│  FastAPI (Python) · Uvicorn                      │
│  PostgreSQL + SQLAlchemy ORM                     │
│  JWT Access + Refresh Token Auth                 │
│  Rate Limiting (150 req/min) · CORS              │
└─────────────────┬───────────────────────────────┘
                  │ Local Inference
┌─────────────────▼───────────────────────────────┐
│                  AI LAYER                        │
│  Ollama (local, on-premise, zero data leakage)   │
│  LLaMA 3.2 — Tender validation & bid analysis   │
│  Qwen2.5-VL — Vision OCR for scanned documents  │
│  PyMuPDF — Native PDF text extraction           │
└─────────────────────────────────────────────────┘
```

**Key architectural decisions:**
- **On-premise AI** via Ollama — no vendor data ever leaves the government network
- **Postgres** as the single source of truth — no mock/seed data in production
- **Relative API URLs** — network-share friendly, works across LAN without config changes
- **Refresh token rotation** — secure session management with auto-logout on expiry

---

## 5. Compliance & Security

| Requirement | Implementation |
|---|---|
| **GFR 2017** | NIT register (Form-1), bid evaluation, award register all exportable |
| **CVC Guidelines** | AI compliance check flags deviations before award |
| **RTI Act 2005** | Complete audit trail on every tender action |
| **IT Act 2000** | JWT-secured API, HTTPS-ready, rate-limited endpoints |
| **Data Privacy** | AI runs fully on-premise via Ollama — no external API calls |

---

## 6. User Roles

```
┌──────────────────────────────────────────────────────┐
│  ADMIN (TIA Officer)                                 │
│  Full access: tenders, vendors, bids, AI, reports    │
├──────────────────────────────────────────────────────┤
│  VENDOR                                              │
│  Registration, document upload, bid submission       │
├──────────────────────────────────────────────────────┤
│  VERIFICATION OFFICER (Admin sub-role)               │
│  Document review, approve/reject, AI score view      │
└──────────────────────────────────────────────────────┘
```

---

## 7. Screenshots Overview

| Screen | Description |
|---|---|
| **Login** | Secure govt-themed login with Telugu/Hindi/English toggle |
| **Admin Dashboard** | Live KPIs — active tenders, total spend, vendor count |
| **Tenders** | Full tender registry with status badges and history timeline |
| **Vendors** | Vendor directory with AI rating, compliance score, blacklist flag |
| **Bid Evaluation** | Comparative statement, L1 winner highlight, export CER |
| **AI Insights** | Spend by category, cartel-bid alerts, department analytics |
| **Doc Validator** | OCR preview, AI score pill, officer review panel |
| **MIS Reports** | GFR-compliant reports with CSV and print export |

---

## 8. Multilingual Support

The portal supports **three languages** across all pages and UI elements:

| Language | Coverage |
|---|---|
| English | 100% |
| हिंदी (Hindi) | 100% |
| తెలుగు (Telugu) | 100% |

Language is toggled from the top utility bar — no page reload required.

---

## 9. Deployment

### Local / LAN
```bash
# Backend
cd backend && uvicorn main:app --host 0.0.0.0 --port 3000 --reload

# Frontend
npm run dev   # serves on 0.0.0.0:8080, proxies /api → localhost:3000
```

### Docker
```bash
docker-compose up --build
```

Accessible to any device on the same network at `http://YOUR_IP:8080`.

---

## 10. Impact Metrics (Projected)

| Metric | Before | After |
|---|---|---|
| Tender publication time | 3–5 days | Same day |
| Bid evaluation time | 2–3 weeks | 2–3 hours (AI-assisted) |
| Document verification | 5–7 days | 24 hours |
| Compliance errors | Manual tracking | AI-flagged in real time |
| Transparency | Limited | Full audit trail + RTI-ready |
| Vendor onboarding | Offline / manual | Self-service digital |

---

## 11. Roadmap

| Phase | Feature |
|---|---|
| **Phase 1 ✅** | Tender management, vendor registry, bid evaluation, LoA |
| **Phase 2 ✅** | AI validation, OCR document review, multilingual UI |
| **Phase 3 🔜** | Mobile app (PWA), e-signature integration, SMS notifications |
| **Phase 4 🔜** | GeM portal integration, state-level aggregated analytics |
| **Phase 5 🔜** | Blockchain-anchored audit trail, inter-department procurement |

---

## 12. Team

| Role | Responsibility |
|---|---|
| Full-Stack Developer | React frontend, FastAPI backend, PostgreSQL schema |
| AI/ML Engineer | Ollama integration, OCR pipeline, bid anomaly detection |
| UI/UX Designer | Govt design system, accessibility, multilingual layout |
| Domain Expert | GFR 2017 compliance, CVC guidelines, tender workflow |

---

## 13. Why This Wins

1. **100% on-premise AI** — data never leaves the state government network
2. **Real backend** — PostgreSQL, not mocked data or spreadsheets
3. **GFR + CVC compliant** — built for India's procurement rulebook
4. **Multilingual from day one** — English, Hindi, Telugu
5. **Vendor self-service** — reduces officer workload by 60%
6. **LAN-ready** — deploy once, accessible to entire department network instantly

---

*Government of Andhra Pradesh · e-Procurement Portal · Version 4.2.1*
*Built with FastAPI · React · PostgreSQL · Ollama (LLaMA 3.2 + Qwen2.5-VL)*
