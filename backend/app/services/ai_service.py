"""Tender AI services — GFR compliance, bid analysis, insights."""
import json
import re
import requests
from datetime import datetime, timezone
from app.core.config import OLLAMA_HOST, OLLAMA_MODEL

SYSTEM = """You are ProcureAI, an expert AI assistant for the Government of Andhra Pradesh e-Procurement system.
You specialize in government procurement compliance (GFR 2017, CVC guidelines), tender validation,
bid anomaly detection, vendor due diligence, and procurement risk scoring.
Always respond with valid, parseable JSON. Be precise and aligned with Indian government procurement rules."""


def _call(prompt: str, max_tokens: int = 2048) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {"num_predict": max_tokens},
    }
    resp = requests.post(f"{OLLAMA_HOST}/api/chat", json=payload, timeout=180)
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _parse(raw: str) -> dict:
    match = re.search(r"```json\s*([\s\S]*?)\s*```", raw) or re.search(r"(\{[\s\S]*\})", raw)
    return json.loads(match.group(1) if match else raw)


def validate_tender(tender: dict) -> dict:
    days = (datetime.fromisoformat(tender["endDate"]).replace(tzinfo=timezone.utc) -
            datetime.fromisoformat(tender["startDate"]).replace(tzinfo=timezone.utc)).days

    prompt = f"""Validate this government tender for GFR 2017 and AP procurement compliance:

Tender ID: {tender["id"]}
Name: {tender["name"]}
Description: {tender["description"]}
Category: {tender["category"]}
Department: {tender["department"]}
Estimated Value: ₹{tender["estimatedValue"]/10_000_000:.2f} Crore
Bid Window: {days} days
Eligible Vendors: {tender["eligibleVendorCount"]}
Uploaded Documents: {tender["documentCount"]}

Respond with JSON:
{{
  "validationScore": <0-100>,
  "riskLevel": "Low|Medium|High",
  "complianceStatus": "Compliant|Partial|Non-Compliant",
  "issues": [{{"category": "...", "severity": "Low|Medium|High", "description": "..."}}],
  "recommendations": ["..."],
  "summary": "..."
}}"""
    return _parse(_call(prompt))


def analyze_bids(tender: dict, bids: list) -> dict:
    if not bids:
        return {
            "overallRisk": "Medium",
            "anomalies": [{"type": "No Bids", "severity": "Medium", "description": "No bids received.", "recommendation": "Re-tender with relaxed eligibility or extended deadline."}],
            "recommendedAction": "Re-tender with revised parameters.",
            "summary": "No bids received. Consider re-tendering.",
        }

    amounts = [b["amount"] for b in bids]
    min_a, max_a = min(amounts), max(amounts)
    spread = (max_a - min_a) / min_a * 100

    prompt = f"""Analyze these bids for anomalies (bid rigging, cartel behaviour, price variance):

Tender: {tender["name"]} ({tender["id"]})
Estimated Value: ₹{tender["estimatedValue"]/10_000_000:.2f} Crore

Bids ({len(bids)}):
{chr(10).join(f"{i+1}. {b['vendorName']} ({b['vendorId']}): ₹{b['amount']/10_000_000:.2f} Cr | Blacklisted: {b['blacklisted']}" for i, b in enumerate(bids))}

Bid spread: {spread:.1f}% | L1 vs estimate: {((min_a - tender["estimatedValue"]) / tender["estimatedValue"] * 100):.1f}%

Respond with JSON:
{{
  "overallRisk": "Low|Medium|High",
  "anomalies": [{{"type": "...", "severity": "Low|Medium|High", "description": "...", "recommendation": "..."}}],
  "recommendedAction": "...",
  "summary": "..."
}}"""
    return _parse(_call(prompt))


def check_compliance(tenders: list, stats: dict) -> dict:
    under_window = [t for t in tenders if (
        datetime.fromisoformat(t["endDate"]) - datetime.fromisoformat(t["startDate"])
    ).days < 21]

    prompt = f"""CVC compliance audit for AP e-Procurement:

Active Tenders: {len(tenders)}
Tenders with <21 day bid window: {len(under_window)} ({", ".join(t["id"] for t in under_window)})
Tenders missing documents: {sum(1 for t in tenders if t["documents"] == 0)}
Total vendors: {stats["totalVendors"]}
Blacklisted vendors: {stats["blacklistedVendors"]}
Pending KYC verifications: {stats["pendingVerifications"]}

Respond with JSON:
{{
  "overallScore": <0-100>,
  "checks": [{{"rule": "...", "compliant": true/false, "detail": "..."}}],
  "criticalIssues": ["..."],
  "recommendations": ["..."]
}}"""
    return _parse(_call(prompt))


_insights_cache: dict = {"data": None, "ts": None}
CACHE_TTL = 3600


def generate_insights(tenders: list, vendors: list) -> dict:
    now = datetime.now(timezone.utc).timestamp()
    if _insights_cache["data"] and _insights_cache["ts"] and (now - _insights_cache["ts"]) < CACHE_TTL:
        return _insights_cache["data"]

    total_value = sum(t["estimatedValue"] for t in tenders)
    awarded = sum(1 for t in tenders if t["status"] == "Awarded")
    published = sum(1 for t in tenders if t["status"] == "Published")
    categories = list({t["category"] for t in tenders})
    avg_perf = sum(v["pastPerformance"] for v in vendors) // max(len(vendors), 1)

    prompt = f"""Generate comprehensive AI procurement insights for Government of Andhra Pradesh:

Portfolio:
- Total tenders: {len(tenders)} (Value: ₹{total_value/10_000_000:.1f} Cr)
- Published: {published} | Awarded: {awarded}
- Categories: {", ".join(categories)}

Vendor ecosystem:
- Total vendors: {len(vendors)}
- Blacklisted: {sum(1 for v in vendors if v["blacklisted"])}
- Avg performance score: {avg_perf}

Tender details: {json.dumps([dict(id=t["id"], name=t["name"][:40], status=t["status"], value=t["estimatedValue"], vendors=t.get("eligibleVendors",0)) for t in tenders[:5]])}

Respond with JSON:
{{
  "healthScore": <0-100>,
  "riskIndex": "Low|Medium|High",
  "confidence": <85-99>,
  "savingsEstimate": <number in INR>,
  "keyFindings": ["..."],
  "recommendations": [{{"title": "...", "impact": "...", "priority": "High|Medium|Low"}}],
  "anomalies": [{{"id": "AN-01", "tenderId": "...", "type": "...", "severity": "Low|Medium|High", "description": "...", "recommendation": "..."}}],
  "forecasts": [{{"label": "...", "value": "...", "trend": "...", "up": true/false}}]
}}"""

    result = _parse(_call(prompt, max_tokens=3000))
    _insights_cache["data"] = result
    _insights_cache["ts"] = now
    return result
