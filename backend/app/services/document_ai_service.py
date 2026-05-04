"""AI document validation using Ollama local models."""
import json
import re
import os
import requests
from app.core.config import OLLAMA_HOST, OLLAMA_MODEL

SYSTEM = """You are DocVerify AI, a document validation expert for the Government of Andhra Pradesh e-Procurement system.
Analyze OCR-extracted text from vendor documents and produce a structured validation report.

Rules:
- GST: 2-digit state code + 10-char PAN + 1Z + 2 alphanumeric (e.g. 37AABCS1234N1Z5)
- PAN: 10 chars, format AAAAA1234A
- Be strict but fair — flag genuine concerns, not formatting trivialities
- Respond ONLY with valid JSON, no prose, no markdown fences."""

RATING_THRESHOLDS = [
    (90, "Excellent"), (75, "Good"), (60, "Fair"), (40, "Poor"), (0, "Invalid")
]


def score_to_rating(score: float) -> str:
    for threshold, label in RATING_THRESHOLDS:
        if score >= threshold:
            return label
    return "Invalid"


def _parse_json(raw: str) -> dict:
    match = re.search(r"```json\s*([\s\S]*?)\s*```", raw) or re.search(r"(\{[\s\S]*\})", raw)
    return json.loads(match.group(1) if match else raw)


def _call_ollama(system: str, user: str, max_tokens: int = 1500) -> str:
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


def validate_document(ocr_text: str, doc_type: str, file_name: str, vendor_ctx: dict = None) -> dict:
    ctx = ""
    if vendor_ctx:
        ctx = f'Vendor context: Company="{vendor_ctx.get("company_name","unknown")}", GST="{vendor_ctx.get("gst","unknown")}", PAN="{vendor_ctx.get("pan","unknown")}".'

    prompt = f"""Validate the following document extracted via OCR.

Document type: {doc_type}
File name: {file_name}
{ctx}

OCR Extracted Text (first 4000 chars):
\"\"\"
{ocr_text[:4000]}
\"\"\"

Analyze for: authenticity, completeness, format correctness, required fields, consistency with vendor context, forgery indicators.

Respond with this exact JSON:
{{
  "score": <integer 0-100>,
  "rating": "Excellent|Good|Fair|Poor|Invalid",
  "flagged": <true/false>,
  "findings": [
    {{"category": "<area>", "status": "Pass|Fail|Warning", "detail": "<observation>"}}
  ],
  "summary": "<2-3 sentence assessment>",
  "recommendations": ["<action if needed>"]
}}"""

    raw = _call_ollama(SYSTEM, prompt, max_tokens=1500)
    result = _parse_json(raw)
    result["rating"] = score_to_rating(result.get("score", 0))
    return result
