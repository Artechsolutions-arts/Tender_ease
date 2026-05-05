"""
Email notification service — AP Tender e-Procurement Portal.
All CSS is fully inlined (Gmail/Outlook safe). Silently skipped if SMTP not configured.
"""
import smtplib
import threading
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL


# ── Core helpers ───────────────────────────────────────────────────────────────

def send_email(to: str, subject: str, html_body: str) -> bool:
    if not SMTP_HOST or not SMTP_USER:
        print(f"[Email] SMTP not configured — skipping mail to {to}")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_FROM, to, msg.as_string())
        print(f"[Email] ✓  '{subject}'  →  {to}")
        return True
    except Exception as e:
        print(f"[Email] ✗  Failed → {to} : {e}")
        return False


def _fire(to: str, subject: str, body: str):
    threading.Thread(target=send_email, args=(to, subject, body), daemon=True).start()


def _fmt_inr(value: float) -> str:
    try:
        return f"&#8377;&nbsp;{value:,.0f}"
    except Exception:
        return str(value)


def _today() -> str:
    return datetime.utcnow().strftime("%d %B %Y")


def _year() -> str:
    return str(datetime.utcnow().year)


# ── Shared building blocks (fully inline CSS for Gmail / Outlook) ──────────────

def _wrap(inner_html: str) -> str:
    """Wraps content in the master email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>AP Tender — e-Procurement Portal</title>
</head>
<body style="margin:0;padding:0;background-color:#dde3ec;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:#dde3ec;padding:28px 12px;">
  <tr><td align="center">

    <!-- Outer card -->
    <table width="640" cellpadding="0" cellspacing="0" border="0"
           style="max-width:640px;width:100%;background:#ffffff;
                  border-radius:6px;overflow:hidden;
                  border:1px solid #b8c6d8;
                  box-shadow:0 4px 18px rgba(0,0,0,0.10);">

      {inner_html}

      <!-- ── FOOTER ── -->
      <tr>
        <td style="background-color:#0f2744;padding:26px 32px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="33%" valign="top"
                  style="color:#8ab4d4;font-size:11px;line-height:1.8;
                         padding-right:16px;">
                <p style="margin:0 0 5px;font-size:10px;font-weight:700;
                           letter-spacing:1.2px;text-transform:uppercase;
                           color:#5a9ec8;">Help Desk</p>
                1800-3070-2232 (Toll Free)<br/>
                helpdesk@apeprocurement.gov.in<br/>
                Mon – Sat &nbsp;|&nbsp; 9 AM – 6 PM IST
              </td>
              <td width="33%" valign="top"
                  style="color:#8ab4d4;font-size:11px;line-height:1.8;
                         padding-right:16px;">
                <p style="margin:0 0 5px;font-size:10px;font-weight:700;
                           letter-spacing:1.2px;text-transform:uppercase;
                           color:#5a9ec8;">Address</p>
                AP Secretariat, Velagapudi<br/>
                Amaravati, Andhra Pradesh<br/>
                PIN — 522 239
              </td>
              <td width="33%" valign="top"
                  style="color:#8ab4d4;font-size:11px;line-height:1.8;">
                <p style="margin:0 0 5px;font-size:10px;font-weight:700;
                           letter-spacing:1.2px;text-transform:uppercase;
                           color:#5a9ec8;">Compliance</p>
                GFR 2017 &nbsp;|&nbsp; CVC Guidelines<br/>
                IT Act 2000 &nbsp;|&nbsp; RTI Act 2005<br/>
                AP e-Procurement Policy
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="margin-top:18px;border-top:1px solid rgba(255,255,255,0.10);
                        padding-top:14px;">
            <tr>
              <td style="font-size:10px;color:#4a7a9e;text-align:center;line-height:1.6;">
                This is a system-generated communication from <strong style="color:#6a9ec0;">AP Tender — e-Procurement Portal</strong>.
                Please do not reply directly to this email.<br/>
                &copy; {_year()} Government of Andhra Pradesh &nbsp;&middot;&nbsp; Version 4.2.1
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table><!-- /card -->
  </td></tr>
</table>
</body>
</html>"""


def _gov_header() -> str:
    """Top government identity bar — appears on every email."""
    return """
      <!-- Gov identity strip -->
      <tr>
        <td style="background-color:#f0f4f8;border-bottom:1px solid #d0dae6;
                   padding:10px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <p style="margin:0;font-size:11px;color:#7a8fa8;letter-spacing:0.3px;">
                  &#x1F1EE;&#x1F1F3; &nbsp;भारत सरकार &nbsp;|&nbsp; Government of India
                </p>
                <p style="margin:2px 0 0;font-size:13px;font-weight:700;
                           color:#0f2744;letter-spacing:0.3px;">
                  Government of Andhra Pradesh &mdash; AP Tender e-Procurement Portal
                </p>
              </td>
              <td align="right" style="font-size:11px;color:#7a8fa8;white-space:nowrap;">
                सत्यमेव जयते
              </td>
            </tr>
          </table>
        </td>
      </tr>"""


def _colour_header(label1: str, label2: str, title: str, ref: str,
                   bg_start: str = "#0f2744", bg_end: str = "#1a5fa8") -> str:
    return f"""
      <!-- Colour header -->
      <tr>
        <td style="background:linear-gradient(135deg,{bg_start} 0%,{bg_end} 100%);
                   padding:28px 32px 24px;">
          <p style="margin:0 0 10px;">
            <span style="display:inline-block;background:rgba(255,255,255,0.15);
                          color:#d0e8f8;font-size:10px;font-weight:700;
                          letter-spacing:1.4px;text-transform:uppercase;
                          padding:3px 12px;border-radius:2px;margin-right:6px;">
              {label1}
            </span>
            <span style="display:inline-block;background:rgba(255,255,255,0.10);
                          color:#b8d8f0;font-size:10px;font-weight:600;
                          letter-spacing:1px;text-transform:uppercase;
                          padding:3px 12px;border-radius:2px;">
              {label2}
            </span>
          </p>
          <h1 style="margin:0;color:#ffffff;font-size:19px;font-weight:700;
                     line-height:1.35;letter-spacing:0.2px;">
            {title}
          </h1>
          <p style="margin:8px 0 0;color:#90c4e0;font-size:12px;letter-spacing:0.5px;">
            {ref}
          </p>
        </td>
      </tr>"""


def _detail_table(rows: list[tuple[str, str]]) -> str:
    row_html = ""
    for i, (label, value) in enumerate(rows):
        bg = "#f7f9fc" if i % 2 == 0 else "#ffffff"
        row_html += f"""
        <tr>
          <td width="42%" style="background:{bg};padding:10px 14px;
                                  font-size:12.5px;font-weight:600;color:#4a6080;
                                  border-bottom:1px solid #e4ecf4;vertical-align:top;">
            {label}
          </td>
          <td style="background:{bg};padding:10px 14px;font-size:13px;
                      color:#1a2a3e;font-weight:500;
                      border-bottom:1px solid #e4ecf4;vertical-align:top;">
            {value}
          </td>
        </tr>"""
    return f"""
      <!-- Detail table -->
      <tr>
        <td style="padding:0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border:1px solid #ccd8e8;border-radius:4px;
                        overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;">
            {row_html}
          </table>
        </td>
      </tr>"""


def _alert(icon: str, heading: str, text: str, kind: str = "info") -> str:
    styles = {
        "info":    ("background:#eef5ff;border-left:4px solid #2563eb;color:#1e3a8a",
                    "#1e3a8a", "#2563eb"),
        "success": ("background:#edfaf3;border-left:4px solid #16a34a;color:#14532d",
                    "#14532d", "#16a34a"),
        "warning": ("background:#fffbeb;border-left:4px solid #d97706;color:#78350f",
                    "#78350f", "#d97706"),
        "neutral": ("background:#f4f6f9;border-left:4px solid #6b7280;color:#374151",
                    "#374151", "#6b7280"),
    }
    outer, head_clr, _ = styles.get(kind, styles["info"])
    return f"""
      <!-- Alert -->
      <tr>
        <td style="padding:18px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="{outer};border-radius:3px;padding:14px 18px;
                         font-family:'Segoe UI',Arial,sans-serif;">
            <tr>
              <td>
                <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:{head_clr};">
                  {icon}&nbsp; {heading}
                </p>
                <p style="margin:0;font-size:12.5px;line-height:1.75;color:{head_clr};">
                  {text}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>"""


def _steps(items: list[str]) -> str:
    rows = ""
    for i, item in enumerate(items, 1):
        rows += f"""
        <tr>
          <td width="32" valign="top" style="padding:8px 12px 8px 0;">
            <div style="width:26px;height:26px;background:#0f2744;color:#ffffff;
                        font-size:11px;font-weight:700;border-radius:50%;
                        text-align:center;line-height:26px;">
              {i}
            </div>
          </td>
          <td style="font-size:13px;color:#2a3a4e;line-height:1.7;
                      padding:8px 0;border-bottom:1px dashed #dde8f0;vertical-align:top;">
            {item}
          </td>
        </tr>"""
    return f"""
      <!-- Steps -->
      <tr>
        <td style="padding:18px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            {rows}
          </table>
        </td>
      </tr>"""


def _cta_button(label: str, url: str, color: str = "#0f2744") -> str:
    return f"""
      <!-- CTA -->
      <tr>
        <td align="center" style="padding:28px 32px 8px;">
          <a href="{url}"
             style="display:inline-block;background:{color};color:#ffffff;
                    font-size:13.5px;font-weight:700;text-decoration:none;
                    padding:13px 36px;border-radius:3px;letter-spacing:0.5px;">
            {label} &rarr;
          </a>
        </td>
      </tr>"""


def _signature(dept: str) -> str:
    return f"""
      <!-- Signature -->
      <tr>
        <td style="padding:24px 32px 32px;">
          <p style="margin:0 0 18px;font-size:13px;color:#334155;line-height:1.75;">
            Yours faithfully,
          </p>
          <table cellpadding="0" cellspacing="0" border="0"
                 style="border-top:2px solid #0f2744;padding-top:14px;
                         margin-top:4px;width:auto;">
            <tr>
              <td style="padding-top:14px;">
                <p style="margin:0;font-size:14px;font-weight:700;color:#0f2744;">
                  Tender Inviting Authority (TIA)
                </p>
                <p style="margin:3px 0 0;font-size:12px;color:#4a6080;">
                  e-Procurement Cell
                </p>
                <p style="margin:2px 0 0;font-size:12px;color:#4a6080;">
                  {dept}, Government of Andhra Pradesh
                </p>
                <p style="margin:6px 0 0;font-size:11px;color:#7a9ab8;">
                  AP Secretariat &nbsp;&middot;&nbsp; Velagapudi, Amaravati &nbsp;&middot;&nbsp; AP — 522 239
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>"""


def _spacer(h: int = 16) -> str:
    return f'<tr><td style="height:{h}px;line-height:{h}px;">&nbsp;</td></tr>'


def _para(text: str, bold_prefix: str = "") -> str:
    prefix = f'<strong style="color:#0f2744;">{bold_prefix}</strong>&nbsp;' if bold_prefix else ""
    return f"""
      <tr>
        <td style="padding:12px 32px 0;font-size:13.5px;color:#3a4a5e;
                    line-height:1.85;font-family:'Segoe UI',Arial,sans-serif;">
          {prefix}{text}
        </td>
      </tr>"""


def _salutation(company_name: str) -> str:
    return f"""
      <tr>
        <td style="padding:28px 32px 0;font-size:13.5px;color:#334155;
                    line-height:1.85;font-family:'Segoe UI',Arial,sans-serif;">
          Dear Sir / Madam,<br/>
          <strong style="color:#0f2744;">{company_name}</strong>
        </td>
      </tr>"""


def _subject_line(text: str) -> str:
    return f"""
      <tr>
        <td style="padding:14px 32px 0;">
          <p style="margin:0;font-size:13.5px;color:#334155;line-height:1.75;
                     font-family:'Segoe UI',Arial,sans-serif;">
            <strong style="color:#0f2744;">Sub:</strong>&nbsp; {text}
          </p>
          <div style="margin-top:12px;border-top:1px solid #e4ecf4;"></div>
        </td>
      </tr>"""


# ═══════════════════════════════════════════════════════════════════════════════
# 1. TENDER CREATED — Notice Inviting Tender
# ═══════════════════════════════════════════════════════════════════════════════

def send_tender_created_notifications(vendor_emails: list[tuple[str, str]], tender: dict):
    portal_url = f"{FRONTEND_URL}/tenders"
    tid   = tender.get("id", "—")
    tname = tender.get("name", "—")
    dept  = tender.get("department", "—")
    cat   = tender.get("category", "—")
    val   = _fmt_inr(tender.get("estimatedValue", 0))
    dead  = tender.get("endDate", "—")

    for company_name, email in vendor_emails:
        subject = f"[AP Tender] Notice Inviting Tender — {tid} | {tname}"

        inner = f"""
        {_gov_header()}
        {_colour_header("Notice Inviting Tender", dept, tname,
                         f"Ref. No.: {tid} &nbsp;&middot;&nbsp; Date: {_today()}")}
        {_spacer(24)}
        {_salutation(company_name)}
        {_subject_line(f"Invitation to Bid — {tname} — Tender Ref. {tid}")}
        {_para("""
          The Government of Andhra Pradesh, through the AP Tender e-Procurement Portal,
          invites sealed competitive bids from eligible and qualified organisations for
          the work / supply / service detailed herein. Your organisation has been
          identified as a pre-qualified bidder and is hereby formally invited to participate
          in this tender process.
        """)}
        {_para("""
          We request you to carefully review the tender documents, eligibility conditions,
          and submission requirements before preparing your bid. All submissions must be
          made exclusively through the AP Tender Portal.
        """)}
        {_spacer(18)}
        {_detail_table([
            ("Tender Reference No.",       f"<strong>{tid}</strong>"),
            ("Name of Work / Supply",      tname),
            ("Tendering Department",       dept),
            ("Category",                   cat),
            ("Estimated Contract Value",   f"<strong style='color:#0f2744;font-size:14px;'>{val}</strong>"),
            ("Bid Submission Deadline",    f"<strong style='color:#b91c1c;'>{dead}</strong>"),
            ("Date of Issue",              _today()),
            ("Mode of Submission",         "Online — AP Tender e-Procurement Portal"),
            ("Bid Validity",               "90 days from last date of submission"),
        ])}
        {_alert("&#x1F4CB;", "Action Required",
                f"Log in to the AP Tender Portal immediately to download the complete "
                f"Notice Inviting Tender (NIT) documents and submit your bid before "
                f"<strong>{dead}</strong>. Late submissions will not be entertained "
                f"under any circumstances.",
                "info")}
        {_spacer(18)}
        <tr>
          <td style="padding:18px 32px 0;font-size:13px;font-weight:700;color:#0f2744;
                      font-family:'Segoe UI',Arial,sans-serif;">
            Instructions to Bidders
          </td>
        </tr>
        {_steps([
            f"Log in to the AP Tender Portal using your registered vendor credentials.",
            f"Navigate to <em>Tenders</em> and locate Tender Ref. <strong>{tid}</strong>.",
            "Download and read the complete NIT document, BOQ, and all annexures.",
            "Prepare your Technical Bid with all mandatory documents as listed in the NIT.",
            "Prepare your Financial Bid / Price Schedule (BOQ) accurately.",
            f"Upload and submit both bids on the portal before the deadline: <strong>{dead}</strong>.",
            "Retain the system-generated acknowledgement number for future reference.",
        ])}
        {_alert("&#x26A0;", "Important Notices",
                "• Canvassing in any form by the bidder or their representatives shall "
                "result in immediate disqualification.<br/>"
                "• All official communications must be conducted exclusively through "
                "the AP Tender Portal.<br/>"
                "• EMD must be submitted as per the NIT specifications. Bids without "
                "valid EMD shall be summarily rejected.",
                "warning")}
        {_cta_button("View &amp; Download Tender Documents", portal_url)}
        {_spacer(8)}
        {_para("Kindly acknowledge receipt of this notice by logging in to the portal.")}
        {_signature(dept)}
        """

        _fire(email, subject, _wrap(inner))


# ═══════════════════════════════════════════════════════════════════════════════
# 2. TENDER UPDATED — Corrigendum / Amendment
# ═══════════════════════════════════════════════════════════════════════════════

def send_tender_updated_notifications(vendor_emails: list[tuple[str, str]], tender: dict,
                                      change_note: str = ""):
    portal_url = f"{FRONTEND_URL}/tenders"
    tid   = tender.get("id", "—")
    tname = tender.get("name", "—")
    dept  = tender.get("department", "—")
    cat   = tender.get("category", "—")
    val   = _fmt_inr(tender.get("estimatedValue", 0))
    dead  = tender.get("endDate", "—")

    detail_rows = [
        ("Tender Reference No.",       f"<strong>{tid}</strong>"),
        ("Name of Work / Supply",      tname),
        ("Tendering Department",       dept),
        ("Category",                   cat),
        ("Revised Estimated Value",    f"<strong>{val}</strong>"),
        ("Revised Bid Deadline",       f"<strong style='color:#b91c1c;'>{dead}</strong>"),
        ("Amendment Date",             _today()),
    ]
    if change_note:
        detail_rows.append(("Nature of Amendment", f"<em>{change_note}</em>"))

    for company_name, email in vendor_emails:
        subject = f"[AP Tender] Corrigendum Notice — {tid} | {tname}"

        inner = f"""
        {_gov_header()}
        {_colour_header("Corrigendum / Amendment", dept,
                         f"Amendment Notice — {tname}",
                         f"Ref. No.: {tid}/AMD &nbsp;&middot;&nbsp; Date: {_today()}",
                         "#1a3060", "#1a6fa8")}
        {_spacer(24)}
        {_salutation(company_name)}
        {_subject_line(f"Corrigendum to Tender &mdash; {tname} &mdash; Ref. {tid}")}
        {_para("""
          This communication is with reference to the Notice Inviting Tender (NIT)
          issued under the above reference. The Government of Andhra Pradesh, through
          the AP Tender e-Procurement Portal, hereby notifies that the aforementioned
          tender has been <strong>formally amended</strong> as detailed below.
        """)}
        {_para("""
          You are advised to treat this Corrigendum as an integral part of the original
          tender document. All prospective bidders must review the revised terms carefully
          before finalising and submitting their bids.
        """)}
        {_spacer(18)}
        {_detail_table(detail_rows)}
        {_alert("&#x26A0;", "Mandatory Advisory",
                f"Any bid prepared on the basis of the <em>previous version</em> of this "
                f"tender document must be revised to incorporate the amendments notified "
                f"herein. The revised bid submission deadline is "
                f"<strong>{dead}</strong>. Bids submitted against superseded documents "
                f"shall be liable for rejection without further notice.",
                "warning")}
        {_spacer(18)}
        <tr>
          <td style="padding:18px 32px 0;font-size:13px;font-weight:700;color:#0f2744;
                      font-family:'Segoe UI',Arial,sans-serif;">
            Steps to Follow
          </td>
        </tr>
        {_steps([
            f"Log in to the AP Tender Portal and navigate to Tender Ref. <strong>{tid}</strong>.",
            "Download the latest (revised) NIT document and all updated annexures.",
            "Compare carefully against the original document to identify all changes.",
            "Revise your Technical and Financial Bids to reflect the updated requirements.",
            f"Re-submit your complete bid on the portal before the revised deadline: <strong>{dead}</strong>.",
        ])}
        {_alert("&#x1F4AC;", "Queries &amp; Clarifications",
                "All queries related to this amendment must be submitted in writing "
                "exclusively through the AP Tender Portal within the period specified in "
                "the NIT. Queries raised through any other channel will not be entertained.",
                "info")}
        {_cta_button("View Revised Tender Documents", portal_url, "#1a3060")}
        {_spacer(8)}
        {_para("We regret any inconvenience caused due to this amendment and appreciate your continued interest.")}
        {_signature(dept)}
        """

        _fire(email, subject, _wrap(inner))


# ═══════════════════════════════════════════════════════════════════════════════
# 3. LETTER OF AWARD — Winner
# ═══════════════════════════════════════════════════════════════════════════════

def send_award_winner_notification(company_name: str, email: str,
                                   tender: dict, contract_value: float):
    portal_url = f"{FRONTEND_URL}/awards"
    tid   = tender.get("id", "—")
    tname = tender.get("name", "—")
    dept  = tender.get("department", "—")
    cat   = tender.get("category", "—")
    val   = _fmt_inr(contract_value)

    subject = f"[AP Tender] Letter of Award — {tid} | {tname}"

    inner = f"""
    {_gov_header()}

    <!-- Gold trophy banner -->
    <tr>
      <td style="background:linear-gradient(135deg,#92600a 0%,#d4920e 50%,#f0b429 100%);
                  padding:22px 32px;text-align:center;">
        <p style="margin:0;font-size:32px;line-height:1;">&#127942;</p>
        <p style="margin:8px 0 0;font-size:17px;font-weight:700;color:#ffffff;
                   letter-spacing:0.5px;">
          Congratulations &mdash; Contract Awarded
        </p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.85);
                   letter-spacing:0.8px;text-transform:uppercase;">
          Letter of Award &nbsp;&middot;&nbsp; LoA Ref: {tid}/LoA
        </p>
      </td>
    </tr>

    {_colour_header("Letter of Award", dept, tname,
                     f"LoA Ref. No.: {tid}/LoA &nbsp;&middot;&nbsp; Dated: {_today()}",
                     "#0a3d1f", "#146c37")}
    {_spacer(24)}
    {_salutation(company_name)}
    {_subject_line(f"Award of Contract &mdash; {tname} &mdash; Tender Ref. {tid}")}

    {_para("""
      On behalf of the <strong>Government of Andhra Pradesh</strong>, we are greatly
      pleased to inform you that, following a rigorous, transparent, and competitive
      evaluation of bids received under the above-referenced tender — conducted strictly
      in accordance with GFR 2017, CVC Guidelines, and the AP e-Procurement Policy —
      your organisation has been identified as the <strong>L1 (Lowest Qualifying
      Bidder)</strong> and is hereby formally awarded the contract.
    """)}
    {_para("""
      This Letter of Award (LoA) constitutes an official and binding communication from
      the Government of Andhra Pradesh. Please ensure compliance with all conditions
      stipulated herein and in the original tender document.
    """)}

    {_spacer(18)}
    {_detail_table([
        ("LoA Reference No.",          f"<strong>{tid}/LoA</strong>"),
        ("Tender Reference No.",       tid),
        ("Name of Work / Supply",      tname),
        ("Awarding Department",        dept),
        ("Category",                   cat),
        ("Awarded Contract Value",
         f"<strong style='font-size:15px;color:#0a3d1f;'>{val}</strong>"),
        ("Basis of Selection",         "L1 — Lowest Qualifying Financial Bid"),
        ("Date of Award",              f"<strong>{_today()}</strong>"),
    ])}

    {_alert("&#x2714;", "Award Confirmed",
            "Your organisation has been selected based on meeting all technical "
            "qualification criteria and submitting the most competitive financial "
            "bid. This LoA is issued after due approval of the Competent Authority "
            "as required under GFR 2017.",
            "success")}

    {_spacer(18)}
    <tr>
      <td style="padding:18px 32px 0;font-size:13px;font-weight:700;color:#0f2744;
                  font-family:'Segoe UI',Arial,sans-serif;">
        Mandatory Actions &mdash; Required Within 15 Calendar Days
      </td>
    </tr>
    {_steps([
        "Log in to the AP Tender Portal and <strong>acknowledge receipt</strong> of this LoA within <strong>48 hours</strong>.",
        "Submit a <strong>Performance Security</strong> (Bank Guarantee or Demand Draft) for the prescribed percentage of contract value within <strong>7 working days</strong>.",
        "Execute the formal <strong>Agreement / Contract</strong> on non-judicial stamp paper (minimum &#8377;&nbsp;100) within <strong>15 calendar days</strong> of this LoA.",
        "Confirm validity of all statutory registrations (GST, PAN, Labour licence, etc.) before commencement of work.",
        "Attend the <strong>pre-commencement site meeting</strong> — date and venue will be communicated by the department separately.",
        "Ensure adequate insurance cover is in place as specified in the contract conditions.",
    ])}

    {_alert("&#x26A0;", "Important Conditions",
            "• Non-submission of Performance Security within the stipulated period "
            "shall render this Award liable for <strong>cancellation</strong> and the "
            "EMD shall stand <strong>forfeited</strong>.<br/>"
            "• Sub-contracting of the whole or any part of the work is not permitted "
            "without prior written approval of the Tendering Authority.<br/>"
            "• Violation of any condition of this LoA may result in termination of "
            "the contract and/or blacklisting under applicable rules.",
            "warning")}

    {_cta_button("View Letter of Award on Portal", portal_url, "#0a3d1f")}
    {_spacer(8)}

    {_para("""
      We congratulate your organisation on this achievement and look forward to a
      productive and successful partnership in delivering quality outcomes for the
      people of Andhra Pradesh. We are confident that your organisation will uphold
      the highest standards of quality, integrity, and timely delivery.
    """)}

    {_signature(dept)}
    """

    _fire(email, subject, _wrap(inner))


# ═══════════════════════════════════════════════════════════════════════════════
# 4. REGRET LETTER — Non-winning Vendors
# ═══════════════════════════════════════════════════════════════════════════════

def send_award_regret_notifications(vendor_emails: list[tuple[str, str]], tender: dict):
    portal_url = f"{FRONTEND_URL}/tenders"
    tid   = tender.get("id", "—")
    tname = tender.get("name", "—")
    dept  = tender.get("department", "—")
    cat   = tender.get("category", "—")

    for company_name, email in vendor_emails:
        subject = f"[AP Tender] Bid Result — {tid} | {tname}"

        inner = f"""
        {_gov_header()}

        <!-- Neutral result header -->
        <tr>
          <td style="background:#f0f4f8;border-bottom:3px solid #64748b;
                      padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#334155;
                       letter-spacing:0.3px;">
              Bid Result Notification
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#64748b;letter-spacing:0.8px;
                       text-transform:uppercase;">
              Ref. No.: {tid} &nbsp;&middot;&nbsp; Date: {_today()}
            </p>
          </td>
        </tr>

        {_colour_header("Bid Result", dept, tname,
                         f"Ref. No.: {tid} &nbsp;&middot;&nbsp; Dated: {_today()}",
                         "#2d3748", "#4a5568")}
        {_spacer(24)}
        {_salutation(company_name)}
        {_subject_line(f"Intimation of Bid Result &mdash; {tname} &mdash; Tender Ref. {tid}")}

        {_para("""
          We refer to your participation in the above-mentioned tender floated by the
          Government of Andhra Pradesh through the AP Tender e-Procurement Portal.
          The Bid Evaluation Committee constituted for this purpose has completed a
          thorough evaluation of all bids received, in strict compliance with GFR 2017,
          CVC Guidelines, and the terms of the Notice Inviting Tender.
        """)}
        {_para("""
          After due deliberation and approval of the Competent Authority, the contract
          has been awarded to the bidder who fulfilled all technical qualification
          criteria and offered the most competitive financial bid.
        """)}
        {_para("""
          We regret to inform you that your organisation has <strong>not been selected
          </strong> for the award of this contract.
        """)}

        {_spacer(18)}
        {_detail_table([
            ("Tender Reference No.", tid),
            ("Name of Work / Supply", tname),
            ("Tendering Department",  dept),
            ("Category",              cat),
            ("Date of Result",        _today()),
            ("Evaluation Basis",      "GFR 2017, CVC Guidelines, NIT Terms &amp; Conditions"),
        ])}

        {_alert("&#x1F4B8;", "EMD Refund — Action Required",
                "The Earnest Money Deposit (EMD) submitted by your organisation will "
                "be <strong>refunded within 30 working days</strong> from the date of "
                "this communication, subject to completion of internal financial "
                "formalities. Kindly ensure that your registered bank account details "
                "on the AP Tender Portal are current and accurate to avoid delays.",
                "neutral")}

        {_para("""
          The Government of Andhra Pradesh sincerely appreciates the time, effort, and
          resources invested by your organisation in preparing and submitting a bid for
          this tender. Your participation is a valued contribution to the objective,
          competitive, and transparent public procurement process of the State Government.
        """)}
        {_para("""
          We encourage your organisation to remain an active participant in the AP
          Tender e-Procurement Portal and to bid on future tenders that align with
          your areas of expertise and business capability. Consistent participation
          and continued improvement in bid quality strengthens public procurement
          outcomes for the citizens of Andhra Pradesh.
        """)}

        {_alert("&#x2139;", "Right to Seek Information (RTI Act 2005)",
                "You have the statutory right to seek information regarding the bid "
                "evaluation process under the <strong>Right to Information Act, 2005</strong>. "
                "A written application may be submitted to the Public Information "
                "Officer (PIO) of the concerned department within <strong>30 days</strong> "
                "from the date of this communication.",
                "info")}

        {_cta_button("Explore Open Tenders on the Portal", portal_url, "#2d3748")}
        {_spacer(8)}

        {_para("""
          We thank you once again for your interest in participating in Government of
          Andhra Pradesh procurement processes and extend our best wishes to your
          organisation for all future endeavours.
        """)}

        {_signature(dept)}
        """

        _fire(email, subject, _wrap(inner))


# ═══════════════════════════════════════════════════════════════════════════════
# 5. ADMIN ALERT — New Bid Submitted
# ═══════════════════════════════════════════════════════════════════════════════

def send_new_bid_admin_notification(admin_emails: list[str], bid: dict, vendor: dict, tender: dict):
    """Notify admin(s) when a vendor submits a new bid."""
    portal_url = f"{FRONTEND_URL}/bid-evaluation"
    tid    = tender.get("id", "—")
    tname  = tender.get("name", "—")
    dept   = tender.get("department", "—")
    val    = _fmt_inr(bid.get("amount", 0))
    vname  = vendor.get("company_name", "—")
    vnotes = bid.get("notes") or "—"

    subject = f"[AP Tender] New Bid Received — {tname} ({tid})"

    inner = f"""
    {_gov_header()}
    {_colour_header("Bid Alert", "Action Required", f"New Bid Received: {tname}",
                     f"Ref. No.: {tid} &nbsp;&middot;&nbsp; Received: {_today()}",
                     "#0f2744", "#1a5fa8")}
    {_spacer(20)}
    <tr>
      <td style="padding:18px 32px 0;font-size:13.5px;color:#334155;line-height:1.85;
                  font-family:'Segoe UI',Arial,sans-serif;">
        A new bid has been submitted on the AP e-Procurement Portal.
        Please review it in the Bid Evaluation section.
      </td>
    </tr>
    {_detail_table([
        ("Tender Reference", tid),
        ("Tender Name", tname),
        ("Department", dept),
        ("Vendor / Company", vname),
        ("Bid Amount", val),
        ("Notes", vnotes),
        ("Submitted On", _today()),
    ])}
    {_alert("&#128276;", "Review Required",
            "Please log in to the portal and review the bid in the Bid Evaluation section.",
            "info")}
    {_cta_button("View Bid Evaluation", portal_url, "#0f2744")}
    {_spacer(24)}
    {_signature("e-Procurement Cell")}
    """

    for adm_email in admin_emails:
        _fire(adm_email, subject, _wrap(inner))


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ADMIN ALERT — New Vendor Registration Request
# ═══════════════════════════════════════════════════════════════════════════════

def send_new_vendor_registration_notification(admin_emails: list[str], vendor: dict):
    """Notify admin(s) when a new vendor submits a registration application."""
    portal_url = f"{FRONTEND_URL}/vendors"
    company = vendor.get("company", "—")
    contact = vendor.get("contact", "—")
    email   = vendor.get("email", "—")
    phone   = vendor.get("phone", "—")

    subject = f"[AP Tender] New Vendor Application — {company}"

    inner = f"""
    {_gov_header()}
    {_colour_header("Vendor Registration", "Pending Review", f"New Vendor Application: {company}",
                     f"Received: {_today()}",
                     "#1a3a5f", "#2d6a9f")}
    {_spacer(20)}
    <tr>
      <td style="padding:18px 32px 0;font-size:13.5px;color:#334155;line-height:1.85;
                  font-family:'Segoe UI',Arial,sans-serif;">
        A new vendor has submitted a registration application on the AP e-Procurement Portal.
        Please review and process the application in the Vendors section.
      </td>
    </tr>
    {_detail_table([
        ("Company Name", company),
        ("Contact Person", contact),
        ("Email", email),
        ("Phone", phone),
        ("Received On", _today()),
        ("Status", "Pending Review"),
    ])}
    {_alert("&#128203;", "Action Required",
            "Please log in to the portal to review and approve or reject this vendor application.",
            "warning")}
    {_cta_button("Review Vendor Applications", portal_url, "#1a3a5f")}
    {_spacer(24)}
    {_signature("e-Procurement Cell")}
    """

    for adm_email in admin_emails:
        _fire(adm_email, subject, _wrap(inner))


# ═══════════════════════════════════════════════════════════════════════════════
# 7. VENDOR APPROVED — Registration Approved
# ═══════════════════════════════════════════════════════════════════════════════

def send_vendor_approval_notification(email: str, company: str, contact: str, vendor_id: str):
    portal_url = f"{FRONTEND_URL}/login"
    subject = f"[AP Tender] Registration Approved — {company}"

    inner = f"""
    {_gov_header()}
    <tr>
      <td style="background:linear-gradient(135deg,#0a3d1f 0%,#146c37 50%,#16a34a 100%);
                  padding:22px 32px;text-align:center;">
        <p style="margin:0;font-size:30px;line-height:1;">&#9989;</p>
        <p style="margin:8px 0 0;font-size:17px;font-weight:700;color:#ffffff;">
          Registration Approved
        </p>
        <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.85);
                   letter-spacing:0.8px;text-transform:uppercase;">
          AP Tender e-Procurement Portal &nbsp;&middot;&nbsp; Vendor ID: {vendor_id}
        </p>
      </td>
    </tr>
    {_colour_header("Vendor Registration", "APPROVED",
                     f"Welcome to AP e-Procurement — {company}",
                     f"Vendor ID: {vendor_id} &nbsp;&middot;&nbsp; Approved On: {_today()}",
                     "#0a3d1f", "#146c37")}
    {_spacer(24)}
    {_salutation(company)}
    {_subject_line(f"Approval of Vendor Registration &mdash; {company} &mdash; Vendor ID: {vendor_id}")}
    {_para(f"""
      We are pleased to inform you that the registration application submitted by
      <strong>{company}</strong> has been reviewed and <strong>formally approved</strong>
      by the Competent Authority. Your organisation is now an active registered vendor
      on the AP Tender e-Procurement Portal and is eligible to bid on tenders floated
      by the Government of Andhra Pradesh.
    """)}
    {_spacer(18)}
    {_detail_table([
        ("Company Name",   f"<strong>{company}</strong>"),
        ("Contact Person", contact),
        ("Vendor ID",      f"<strong style='color:#0a3d1f;font-size:14px;'>{vendor_id}</strong>"),
        ("Approved On",    f"<strong>{_today()}</strong>"),
        ("Portal Access",  "Full — Tender View, Download, Bid Submission"),
        ("Status",         "<span style='color:#16a34a;font-weight:700;'>ACTIVE &amp; VERIFIED</span>"),
    ])}
    {_alert("&#x2714;", "You're All Set",
            "Log in using your registered email and password to access the vendor dashboard, "
            "browse open tenders, and submit bids.",
            "success")}
    {_spacer(18)}
    <tr>
      <td style="padding:18px 32px 0;font-size:13px;font-weight:700;color:#0f2744;
                  font-family:'Segoe UI',Arial,sans-serif;">Next Steps</td>
    </tr>
    {_steps([
        "Log in to the AP Tender Portal using your registered email and password.",
        "Complete your Full Vendor Profile — upload GST, PAN, and company documents.",
        "Browse open tenders under <em>My Tenders</em> to view eligible tenders.",
        "Download NIT documents, prepare your bid, and submit before the deadline.",
    ])}
    {_cta_button("Login to Vendor Dashboard", portal_url, "#0a3d1f")}
    {_spacer(8)}
    {_para(f"We welcome <strong>{company}</strong> to the AP Tender e-Procurement ecosystem.")}
    {_signature("e-Procurement Cell")}
    """

    _fire(email, subject, _wrap(inner))


# ═══════════════════════════════════════════════════════════════════════════════
# 8. VENDOR REJECTED — Registration Rejected
# ═══════════════════════════════════════════════════════════════════════════════

def send_vendor_rejection_notification(email: str, company: str, contact: str):
    portal_url = f"{FRONTEND_URL}/vendor-signup"
    subject = f"[AP Tender] Registration Update — {company}"

    inner = f"""
    {_gov_header()}
    {_colour_header("Vendor Registration", "DECISION COMMUNICATED",
                     f"Registration Application Update — {company}",
                     f"Date: {_today()}",
                     "#4a3000", "#7a5100")}
    {_spacer(24)}
    {_salutation(company)}
    {_subject_line(f"Update on Vendor Registration Application &mdash; {company}")}
    {_para(f"""
      We refer to the vendor registration application submitted by
      <strong>{company}</strong> on the AP Tender e-Procurement Portal.
      After due consideration by the Competent Authority, we regret to inform you
      that your application could <strong>not be approved</strong> at this time,
      in accordance with the AP e-Procurement Vendor Empanelment Policy.
    """)}
    {_spacer(18)}
    {_detail_table([
        ("Company Name",   f"<strong>{company}</strong>"),
        ("Contact Person", contact),
        ("Decision Date",  f"<strong>{_today()}</strong>"),
        ("Status",         "<span style='color:#b45309;font-weight:700;'>NOT APPROVED</span>"),
    ])}
    {_alert("&#x1F4CB;", "What Happens Next",
            "You may review the eligibility criteria on the AP Tender Portal and re-apply "
            "once any identified gaps have been addressed. Reapplications with complete "
            "and accurate documentation are considered afresh.",
            "neutral")}
    {_spacer(18)}
    <tr>
      <td style="padding:18px 32px 0;font-size:13px;font-weight:700;color:#0f2744;
                  font-family:'Segoe UI',Arial,sans-serif;">Steps to Re-Apply</td>
    </tr>
    {_steps([
        "Review the vendor empanelment eligibility criteria on the AP Tender Portal.",
        "Ensure all mandatory documents (GST, PAN, Registration Certificate) are valid and current.",
        "Submit a fresh registration application with complete and accurate documentation.",
        "Contact the Help Desk for clarification on eligibility requirements if needed.",
    ])}
    {_alert("&#x2139;", "Right to Seek Information (RTI Act 2005)",
            "You have the right to seek information under the RTI Act, 2005. A written "
            "application may be submitted to the PIO of the e-Procurement Cell within "
            "<strong>30 days</strong> of this communication.",
            "info")}
    {_cta_button("Re-Apply on the Portal", portal_url, "#7a5100")}
    {_spacer(8)}
    {_para(f"We appreciate the interest shown by <strong>{company}</strong> and encourage you to reapply.")}
    {_signature("e-Procurement Cell")}
    """

    _fire(email, subject, _wrap(inner))
