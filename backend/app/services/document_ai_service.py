"""AI document validation + field extraction for Indian government documents."""
import json
import re
import requests
from app.core.config import OLLAMA_HOST, OLLAMA_MODEL

# ──────────────────────── constants ────────────────────────

RATING_THRESHOLDS = [
    (90, "Excellent"), (75, "Good"), (60, "Fair"), (40, "Poor"), (0, "Invalid")
]

AADHAAR_UID_RE = re.compile(r'\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b')
PAN_RE = re.compile(r'\b([A-Z]{5}[0-9]{4}[A-Z])\b')
GSTIN_RE = re.compile(r'\b(\d{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b')
IFSC_RE = re.compile(r'\b([A-Z]{4}0[A-Z0-9]{6})\b')

# ──────────────────────── system prompts ────────────────────────

_BASE_SYSTEM = """You are DocVerify AI for the Government of Andhra Pradesh e-Procurement portal.
Analyze OCR text from Indian government documents.
Respond ONLY with valid JSON — no prose, no markdown fences."""

_AADHAAR_SYSTEM = _BASE_SYSTEM + """

AADHAAR CARD — Official UIDAI Format:
- Issued by: Unique Identification Authority of India (UIDAI), Government of India
- UID: 12 numeric digits displayed as XXXX XXXX XXXX
- Fields on card: Name, Date of Birth (DD/MM/YYYY), Gender (Male/Female/Transgender), Address, PIN code
- VID (Virtual ID): 16 digits — optional, may not appear on older cards
- QR Code: always present on genuine Aadhaar; contains encrypted demographic data
- Printed in English + one regional language (Telugu for AP residents)
- Issuer line reads: "Unique Identification Authority of India"
Validation rules:
- UID must be exactly 12 digits (strip spaces before counting)
- DOB format: DD/MM/YYYY
- Address must contain a 6-digit PIN code
- Genuineness indicators: UIDAI branding, QR code, correct field order (Name → DOB → Gender → Address)"""

_PAN_SYSTEM = _BASE_SYSTEM + """

PAN CARD — Official Income Tax Department Format:
- Issued by: Income Tax Department, Government of India
- PAN Number: 10 characters — format AAAAA1234A
  - Chars 1–3: alpha (sequential code assigned by ITD)
  - Char 4: entity type — P=Individual, C=Company, H=HUF, F=Firm, A=AOP, T=AJP, B=BOI, L=Local Authority, G=Govt
  - Char 5: first letter of taxpayer surname (individuals) or entity name
  - Chars 6–9: sequential number 0001–9999
  - Char 10: alphabetic check character
- Card fields: PAN Number, Name, Father's Name (for individuals), Date of Birth (DD/MM/YYYY)
- Header text: "INCOME TAX DEPARTMENT" or "PERMANENT ACCOUNT NUMBER"
- Footer: "GOVT. OF INDIA" or "Government of India"
Validation rules:
- PAN regex: ^[A-Z]{5}[0-9]{4}[A-Z]$
- Name and Father's Name printed in CAPITALS
- DOB format: DD/MM/YYYY
- 4th character encodes entity type — verify it is consistent with vendor type"""

_GSTIN_SYSTEM = _BASE_SYSTEM + """

GSTIN CERTIFICATE — Official GST Registration Format:
- Issued by: Central Board of Indirect Taxes and Customs (CBIC), Government of India
- GSTIN: 15 characters — SSAAAAA1234A1Z9
  - SS (chars 1–2): 2-digit state code (37 = Andhra Pradesh, 36 = Telangana)
  - Chars 3–12: PAN of registered entity (10 chars, AAAAA1234A format)
  - Char 13: entity number at that PAN location (1–9, usually 1)
  - Char 14: always the letter 'Z'
  - Char 15: check character (alphanumeric)
- Key certificate fields: GSTIN, Legal Name, Trade Name, Principal Place of Business,
  Registration Date (DD/MM/YYYY), Constitution of Business, Taxpayer Type, Status
- Status values: Active, Cancelled, Suspended
- Constitution: Proprietorship, Partnership, Private Limited Company, Public Limited Company, LLP, HUF, Society/Trust/Club
- Taxpayer types: Regular, Composition, OIDAR, TDS, TCS, Non-Resident Taxable Person
State codes (selected): 27=Maharashtra, 29=Karnataka, 32=Kerala, 33=Tamil Nadu,
  36=Telangana, 37=Andhra Pradesh, 07=Delhi, 09=Uttar Pradesh, 19=West Bengal
Validation rules:
- Char 14 of GSTIN must always be 'Z'
- PAN embedded in GSTIN (chars 3–12) must match vendor's registered PAN
- State code must be consistent with registered business address
- Status must be "Active" for procurement eligibility — flag Cancelled/Suspended"""

_BANK_STATEMENT_SYSTEM = _BASE_SYSTEM + """

BANK STATEMENT — Indian Scheduled Bank Format:
- Issued by: RBI-licensed scheduled commercial banks (SBI, HDFC, ICICI, Axis, PNB, BOB, Canara, Union, Kotak, etc.)
- Document title: "Statement of Account" or "Account Statement"
- Key printed fields:
  - Account Holder Name (must match business/entity name)
  - Account Number (may be partially masked, e.g., XXXX XXXX 1234)
  - Account Type: Savings / Current / CC / OD
  - Bank Name and Branch
  - IFSC Code: 11 characters — first 4 alpha (bank code) + '0' + 6 alphanumeric (branch code)
    e.g., SBIN0001234 (SBI), HDFC0001234, ICIC0001234, UTIB0001234 (Axis)
  - Statement Period: From date to To date (DD/MM/YYYY)
  - Opening Balance (₹)
  - Closing Balance (₹)
  - Average Monthly Balance (₹) — may or may not be present
  - Total Credits (₹) and Total Debits (₹)
  - Currency: INR
- Each transaction row: Date | Narration/Description | Ref/Chq | Debit | Credit | Balance
Validation rules:
- IFSC format: ^[A-Z]{4}0[A-Z0-9]{6}$ — 4 alpha bank code, then '0', then 6 alphanumeric
- Statement period must be present with clear from/to dates
- Closing balance must not be negative for procurement eligibility
- Account holder name should match vendor's registered company name
- Statement should be recent (preferably within last 6 months)
- Bank name must be a recognised RBI-scheduled bank
- Flag if: account shows dormant status, balance is zero for extended period, or frequent large round-number transfers without business narration"""

_FINANCIAL_STATEMENT_SYSTEM = _BASE_SYSTEM + """

FINANCIAL STATEMENT — Indian Statutory Audit Format:
- Documents in scope: Audited Balance Sheet, Profit & Loss Account (P&L), Income Statement,
  Annual Report, or CA-certified financial summary
- Applicable law: Companies Act 2013 / Indian Accounting Standards (Ind AS) / ICAI guidelines
- Statutory requirements:
  - Must be audited by a Chartered Accountant (CA) registered with ICAI
  - CA's ICAI membership number: 6-digit number (e.g., 123456)
  - Audit report must include: date, CA name, ICAI membership no., firm name, firm registration no.
  - Financial year format: April to March (e.g., FY 2024-25 = 01/04/2024 to 31/03/2025)
- Key financial figures:
  - Annual Turnover / Net Revenue (₹) — from P&L Statement
  - Net Profit / Net Loss (₹)
  - Total Assets (₹) — from Balance Sheet
  - Net Worth / Shareholders' Equity (₹) = Paid-up Capital + Reserves & Surplus
  - Total Liabilities (₹)
  - EBITDA (if available)
- Company identification:
  - Company Name (must match CIN registration)
  - CIN (Corporate Identification Number): 21 chars — L/U + 5-digit NIC code + state 2-char + year 4-digit + company type + 6-digit sequential
  - PAN of entity
  - Registered office address
  - Director(s) name(s) with DIN (Director Identification Number)
Validation rules:
- Financial year must be clearly stated (FY 20XX-XX)
- Auditor signature and ICAI membership number required — absence is a major flag
- Net worth must be positive for procurement eligibility
- Turnover figure must be present for eligibility threshold checks
- Company name in statement must match vendor's registered company name
- For GFR 2017 procurement: last 3 years' audited statements may be required
- Flag if: unsigned/unaudited, net worth is negative, figures inconsistent across pages"""

# ──────────────────────── helpers ────────────────────────

def score_to_rating(score: float) -> str:
    for threshold, label in RATING_THRESHOLDS:
        if score >= threshold:
            return label
    return "Invalid"


def _parse_json(raw: str) -> dict:
    match = re.search(r"```json\s*([\s\S]*?)\s*```", raw) or re.search(r"(\{[\s\S]*\})", raw)
    return json.loads(match.group(1) if match else raw)


def _call_ollama(system: str, user: str, max_tokens: int = 2000) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "options": {"num_predict": max_tokens},
    }
    resp = requests.post(f"{OLLAMA_HOST}/api/chat", json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _vendor_ctx_line(vendor_ctx: dict) -> str:
    if not vendor_ctx:
        return ""
    return (
        f'Vendor context: Company="{vendor_ctx.get("company_name", "unknown")}", '
        f'GST="{vendor_ctx.get("gst", "unknown")}", '
        f'PAN="{vendor_ctx.get("pan", "unknown")}".\n'
    )

# ──────────────────────── document type detection ────────────────────────

def detect_doc_type(ocr_text: str, declared_type: str) -> str:
    """Infer document type from OCR content patterns; falls back to declared_type."""
    upper = ocr_text.upper()

    # GSTIN certificate (most distinctive — check first)
    if (GSTIN_RE.search(ocr_text)
            or "GOODS AND SERVICES TAX" in upper
            or "GSTIN" in upper
            or "GST REGISTRATION" in upper):
        return "GSTIN Certificate"

    # Aadhaar card
    if AADHAAR_UID_RE.search(ocr_text) and (
        "UIDAI" in upper
        or "UNIQUE IDENTIFICATION" in upper
        or "AADHAAR" in upper
        or "AADHAR" in upper
        or "आधार" in ocr_text
    ):
        return "Aadhaar Card"

    # PAN card
    if PAN_RE.search(ocr_text) and (
        "PERMANENT ACCOUNT NUMBER" in upper
        or "INCOME TAX" in upper
        or "GOVT. OF INDIA" in upper
    ):
        return "PAN Card"

    # Bank statement
    if (
        "STATEMENT OF ACCOUNT" in upper
        or "ACCOUNT STATEMENT" in upper
        or ("OPENING BALANCE" in upper and "CLOSING BALANCE" in upper)
        or (IFSC_RE.search(ocr_text) and ("DEBIT" in upper or "CREDIT" in upper))
    ):
        return "Bank Statement"

    # Financial statement / audited accounts
    if (
        "BALANCE SHEET" in upper
        or "PROFIT AND LOSS" in upper
        or "PROFIT & LOSS" in upper
        or "AUDITOR'S REPORT" in upper
        or "INDEPENDENT AUDITOR" in upper
        or ("TURNOVER" in upper and "NET WORTH" in upper)
        or ("CHARTERED ACCOUNTANT" in upper and "ICAI" in upper)
    ):
        return "Financial Statement"

    # Pattern-only fallbacks
    if GSTIN_RE.search(ocr_text):
        return "GSTIN Certificate"
    if PAN_RE.search(ocr_text):
        return "PAN Card"
    if AADHAAR_UID_RE.search(ocr_text):
        return "Aadhaar Card"
    if IFSC_RE.search(ocr_text):
        return "Bank Statement"

    return declared_type

# ──────────────────────── per-document extraction prompts ────────────────────────

def _build_aadhaar_prompt(ocr_text: str, vendor_ctx: dict) -> str:
    ctx = _vendor_ctx_line(vendor_ctx)
    return f"""Extract and validate this Aadhaar Card document from OCR text.
{ctx}
OCR Text:
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return this exact JSON:
{{
  "extracted_fields": {{
    "uid": "<12-digit UID, digits only, or null>",
    "name": "<cardholder full name or null>",
    "dob": "<DD/MM/YYYY or null>",
    "gender": "<Male|Female|Transgender|null>",
    "address": "<full address string or null>",
    "pincode": "<6-digit PIN code or null>",
    "vid": "<16-digit Virtual ID or null>",
    "issuer": "<issuing authority text found on card or null>",
    "qr_present": <true if QR code mentioned or visible, else false>
  }},
  "score": <integer 0-100>,
  "rating": "Excellent|Good|Fair|Poor|Invalid",
  "flagged": <true if document has issues that need officer review, else false>,
  "findings": [
    {{"category": "<Format|Completeness|Authenticity|Cross-validation>", "status": "Pass|Fail|Warning", "detail": "<specific observation>"}}
  ],
  "summary": "<2-3 sentence assessment of document authenticity and completeness>",
  "recommendations": ["<specific action required, if any>"]
}}"""


def _build_pan_prompt(ocr_text: str, vendor_ctx: dict) -> str:
    ctx = _vendor_ctx_line(vendor_ctx)
    return f"""Extract and validate this PAN Card document from OCR text.
{ctx}
OCR Text:
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return this exact JSON:
{{
  "extracted_fields": {{
    "pan_number": "<10-char PAN number or null>",
    "name": "<name printed on card or null>",
    "fathers_name": "<father's name or null>",
    "dob": "<DD/MM/YYYY or null>",
    "entity_type": "<Individual|Company|HUF|Firm|AOP|Trust|Local Authority|Govt|null>",
    "issuer": "<issuing department text found on card or null>"
  }},
  "score": <integer 0-100>,
  "rating": "Excellent|Good|Fair|Poor|Invalid",
  "flagged": <true if document has issues that need officer review, else false>,
  "findings": [
    {{"category": "<Format|Completeness|Authenticity|Cross-validation>", "status": "Pass|Fail|Warning", "detail": "<specific observation>"}}
  ],
  "summary": "<2-3 sentence assessment of document authenticity and completeness>",
  "recommendations": ["<specific action required, if any>"]
}}"""


def _build_gstin_prompt(ocr_text: str, vendor_ctx: dict) -> str:
    ctx = _vendor_ctx_line(vendor_ctx)
    return f"""Extract and validate this GSTIN Certificate from OCR text.
{ctx}
OCR Text:
\"\"\"
{ocr_text[:4000]}
\"\"\"

Return this exact JSON:
{{
  "extracted_fields": {{
    "gstin": "<15-char GSTIN or null>",
    "state_code": "<first 2 digits of GSTIN or null>",
    "embedded_pan": "<chars 3-12 of GSTIN, the PAN portion, or null>",
    "legal_name": "<registered legal name of business or null>",
    "trade_name": "<trade/brand name if different from legal name, or null>",
    "principal_address": "<principal place of business address or null>",
    "registration_date": "<DD/MM/YYYY or null>",
    "constitution": "<Proprietorship|Partnership|Private Limited Company|Public Limited Company|LLP|HUF|Society|null>",
    "taxpayer_type": "<Regular|Composition|OIDAR|TDS|TCS|Non-Resident|null>",
    "status": "<Active|Cancelled|Suspended|null>"
  }},
  "score": <integer 0-100>,
  "rating": "Excellent|Good|Fair|Poor|Invalid",
  "flagged": <true if document has issues that need officer review, else false>,
  "findings": [
    {{"category": "<Format|Completeness|Authenticity|Status|Cross-validation>", "status": "Pass|Fail|Warning", "detail": "<specific observation>"}}
  ],
  "summary": "<2-3 sentence assessment of GST registration validity and vendor eligibility>",
  "recommendations": ["<specific action required, if any>"]
}}"""


def _build_bank_statement_prompt(ocr_text: str, vendor_ctx: dict) -> str:
    ctx = _vendor_ctx_line(vendor_ctx)
    return f"""Extract and validate this Bank Statement from OCR text.
{ctx}
OCR Text:
\"\"\"
{ocr_text[:5000]}
\"\"\"

Return this exact JSON:
{{
  "extracted_fields": {{
    "account_holder_name": "<name of account holder or null>",
    "account_number": "<account number, may be partially masked, or null>",
    "account_type": "<Savings|Current|Cash Credit|Overdraft|null>",
    "bank_name": "<name of bank or null>",
    "branch_name": "<branch name or null>",
    "ifsc_code": "<11-char IFSC code or null>",
    "period_from": "<DD/MM/YYYY start of statement period or null>",
    "period_to": "<DD/MM/YYYY end of statement period or null>",
    "opening_balance": "<opening balance as string with currency, e.g. ₹1,23,456.78 or null>",
    "closing_balance": "<closing balance as string with currency or null>",
    "average_monthly_balance": "<AMB if present or null>",
    "total_credits": "<total credit amount as string or null>",
    "total_debits": "<total debit amount as string or null>",
    "currency": "INR"
  }},
  "score": <integer 0-100>,
  "rating": "Excellent|Good|Fair|Poor|Invalid",
  "flagged": <true if document has issues that need officer review, else false>,
  "findings": [
    {{"category": "<Format|Completeness|Authenticity|Balance|Name Match>", "status": "Pass|Fail|Warning", "detail": "<specific observation>"}}
  ],
  "summary": "<2-3 sentence assessment of statement validity and account health for procurement eligibility>",
  "recommendations": ["<specific action required, if any>"]
}}"""


def _build_financial_statement_prompt(ocr_text: str, vendor_ctx: dict) -> str:
    ctx = _vendor_ctx_line(vendor_ctx)
    return f"""Extract and validate this Financial Statement / Audited Accounts document from OCR text.
{ctx}
OCR Text:
\"\"\"
{ocr_text[:5000]}
\"\"\"

Return this exact JSON:
{{
  "extracted_fields": {{
    "company_name": "<registered company/entity name or null>",
    "pan": "<entity PAN number if present or null>",
    "cin": "<Corporate Identification Number if present or null>",
    "financial_year": "<e.g. FY 2024-25 or null>",
    "period_from": "<DD/MM/YYYY start of financial period or null>",
    "period_to": "<DD/MM/YYYY end of financial period or null>",
    "annual_turnover": "<net revenue/turnover as string with ₹ or null>",
    "net_profit": "<net profit or loss as string, prefix - for loss, or null>",
    "total_assets": "<total assets as string with ₹ or null>",
    "net_worth": "<net worth / shareholders equity as string with ₹ or null>",
    "total_liabilities": "<total liabilities as string with ₹ or null>",
    "auditor_name": "<name of signing CA or null>",
    "auditor_firm": "<CA firm name or null>",
    "icai_membership_no": "<ICAI membership number (6 digits) or null>",
    "audit_date": "<DD/MM/YYYY date of audit report or null>",
    "directors": "<comma-separated director names or null>"
  }},
  "score": <integer 0-100>,
  "rating": "Excellent|Good|Fair|Poor|Invalid",
  "flagged": <true if document has issues that need officer review, else false>,
  "findings": [
    {{"category": "<Format|Completeness|Authenticity|Financials|Auditor|Name Match>", "status": "Pass|Fail|Warning", "detail": "<specific observation>"}}
  ],
  "summary": "<2-3 sentence assessment of financial health and audit compliance for procurement eligibility>",
  "recommendations": ["<specific action required, if any>"]
}}"""


def _build_generic_prompt(ocr_text: str, doc_type: str, file_name: str, vendor_ctx: dict) -> str:
    ctx = _vendor_ctx_line(vendor_ctx)
    return f"""Validate the following document extracted via OCR.
Document type: {doc_type}
File name: {file_name}
{ctx}
OCR Text (first 4000 chars):
\"\"\"
{ocr_text[:4000]}
\"\"\"

Analyze for: authenticity, completeness, format correctness, required fields, consistency with vendor context, forgery indicators.

Return this exact JSON:
{{
  "extracted_fields": {{}},
  "score": <integer 0-100>,
  "rating": "Excellent|Good|Fair|Poor|Invalid",
  "flagged": <true/false>,
  "findings": [
    {{"category": "<area>", "status": "Pass|Fail|Warning", "detail": "<observation>"}}
  ],
  "summary": "<2-3 sentence assessment>",
  "recommendations": ["<action if needed>"]
}}"""

# ──────────────────────── cross-validation ────────────────────────

def _cross_validate(result: dict, vendor_ctx: dict) -> dict:
    """Append cross-validation findings comparing extracted fields to vendor registration data."""
    if not vendor_ctx or not result.get("extracted_fields"):
        return result

    findings = result.get("findings", [])
    fields = result["extracted_fields"]
    vendor_pan = (vendor_ctx.get("pan") or "").strip().upper()
    vendor_gst = (vendor_ctx.get("gst") or "").strip().upper()

    extracted_pan = (fields.get("pan_number") or "").strip().upper()
    if extracted_pan and vendor_pan:
        if extracted_pan == vendor_pan:
            findings.append({
                "category": "Cross-validation",
                "status": "Pass",
                "detail": f"PAN on card matches vendor registration: {extracted_pan}",
            })
        else:
            findings.append({
                "category": "Cross-validation",
                "status": "Fail",
                "detail": f"PAN on card ({extracted_pan}) does not match vendor registration ({vendor_pan})",
            })
            result["flagged"] = True
            result["score"] = min(result.get("score", 100), 30)

    extracted_gstin = (fields.get("gstin") or "").strip().upper()
    if extracted_gstin and vendor_gst:
        if extracted_gstin == vendor_gst:
            findings.append({
                "category": "Cross-validation",
                "status": "Pass",
                "detail": f"GSTIN matches vendor registration: {extracted_gstin}",
            })
        else:
            findings.append({
                "category": "Cross-validation",
                "status": "Fail",
                "detail": f"GSTIN on certificate ({extracted_gstin}) does not match vendor registration ({vendor_gst})",
            })
            result["flagged"] = True
            result["score"] = min(result.get("score", 100), 30)

    embedded_pan = (fields.get("embedded_pan") or "").strip().upper()
    if embedded_pan and vendor_pan and embedded_pan != vendor_pan:
        findings.append({
            "category": "Cross-validation",
            "status": "Fail",
            "detail": f"PAN embedded in GSTIN ({embedded_pan}) does not match vendor PAN ({vendor_pan})",
        })
        result["flagged"] = True
        result["score"] = min(result.get("score", 100), 25)

    gst_status = (fields.get("status") or "").strip().upper()
    if gst_status and gst_status != "ACTIVE":
        findings.append({
            "category": "GST Status",
            "status": "Fail",
            "detail": f"GST registration status is '{fields['status']}' — vendor ineligible for procurement",
        })
        result["flagged"] = True
        result["score"] = min(result.get("score", 100), 20)

    # Bank statement cross-validation
    vendor_name = (vendor_ctx.get("company_name") or "").strip().lower()
    acct_holder = (fields.get("account_holder_name") or "").strip().lower()
    if acct_holder and vendor_name:
        # Simple partial match — names may differ slightly (e.g. "Pvt Ltd" vs "Private Limited")
        name_words = set(vendor_name.replace("pvt", "private").replace("ltd", "limited").split())
        acct_words = set(acct_holder.replace("pvt", "private").replace("ltd", "limited").split())
        overlap = name_words & acct_words
        significant_words = {w for w in name_words if len(w) > 3}
        if significant_words and not (overlap & significant_words):
            findings.append({
                "category": "Name Match",
                "status": "Fail",
                "detail": (
                    f"Account holder '{fields['account_holder_name']}' does not appear to match "
                    f"vendor company '{vendor_ctx.get('company_name')}'"
                ),
            })
            result["flagged"] = True
            result["score"] = min(result.get("score", 100), 45)
        elif overlap:
            findings.append({
                "category": "Name Match",
                "status": "Pass",
                "detail": f"Account holder name matches vendor registration: {fields['account_holder_name']}",
            })

    # Financial statement cross-validation
    fs_company = (fields.get("company_name") or "").strip().lower()
    if fs_company and vendor_name:
        name_words = set(vendor_name.replace("pvt", "private").replace("ltd", "limited").split())
        fs_words = set(fs_company.replace("pvt", "private").replace("ltd", "limited").split())
        overlap = name_words & fs_words
        significant_words = {w for w in name_words if len(w) > 3}
        if significant_words and not (overlap & significant_words):
            findings.append({
                "category": "Name Match",
                "status": "Fail",
                "detail": (
                    f"Company name in statement '{fields['company_name']}' does not match "
                    f"vendor registration '{vendor_ctx.get('company_name')}'"
                ),
            })
            result["flagged"] = True
            result["score"] = min(result.get("score", 100), 40)

    fs_pan = (fields.get("pan") or "").strip().upper()
    if fs_pan and vendor_pan and fs_pan != vendor_pan:
        findings.append({
            "category": "Cross-validation",
            "status": "Fail",
            "detail": f"PAN in financial statement ({fs_pan}) does not match vendor registration ({vendor_pan})",
        })
        result["flagged"] = True
        result["score"] = min(result.get("score", 100), 30)

    result["findings"] = findings
    result["rating"] = score_to_rating(result.get("score", 0))
    return result

# ──────────────────────── public API ────────────────────────

def validate_document(
    ocr_text: str,
    doc_type: str,
    file_name: str,
    vendor_ctx: dict = None,
) -> dict:
    """Validate and extract structured fields from an OCR-extracted government document.

    Auto-detects Aadhaar / PAN / GSTIN from text patterns, runs a type-specific
    extraction prompt enriched with official Indian government field specs, then
    cross-validates extracted values against vendor registration data.

    Returns dict with keys: extracted_fields, detected_type, score, rating,
    flagged, findings, summary, recommendations.
    """
    effective_type = detect_doc_type(ocr_text, doc_type)
    eff_lower = effective_type.lower()

    if "aadhaar" in eff_lower or "aadhar" in eff_lower:
        system = _AADHAAR_SYSTEM
        prompt = _build_aadhaar_prompt(ocr_text, vendor_ctx or {})
    elif "pan" in eff_lower:
        system = _PAN_SYSTEM
        prompt = _build_pan_prompt(ocr_text, vendor_ctx or {})
    elif "gstin" in eff_lower or "gst" in eff_lower:
        system = _GSTIN_SYSTEM
        prompt = _build_gstin_prompt(ocr_text, vendor_ctx or {})
    elif "bank statement" in eff_lower or "bank_statement" in eff_lower:
        system = _BANK_STATEMENT_SYSTEM
        prompt = _build_bank_statement_prompt(ocr_text, vendor_ctx or {})
    elif "financial statement" in eff_lower or "financial_statement" in eff_lower:
        system = _FINANCIAL_STATEMENT_SYSTEM
        prompt = _build_financial_statement_prompt(ocr_text, vendor_ctx or {})
    else:
        system = _BASE_SYSTEM
        prompt = _build_generic_prompt(ocr_text, effective_type, file_name, vendor_ctx or {})

    raw = _call_ollama(system, prompt, max_tokens=2000)
    result = _parse_json(raw)
    result.setdefault("extracted_fields", {})
    result["detected_type"] = effective_type
    result["rating"] = score_to_rating(result.get("score", 0))

    result = _cross_validate(result, vendor_ctx)
    return result
