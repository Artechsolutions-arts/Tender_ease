"""OCR text extraction — vision LLM (Ollama) for images, PyMuPDF direct-text for PDFs."""
import base64
import io
import re
import requests
import fitz  # PyMuPDF
from PIL import Image
from app.core.config import OLLAMA_HOST, OLLAMA_VISION_MODEL

ALLOWED_MIMES = {"application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"}

# Prompt optimised for document OCR — qwen2.5vl follows this precisely
OCR_PROMPT = (
    "You are an OCR engine. Extract ALL text from this document image exactly as written. "
    "Include every number, code, date, label and value. "
    "Preserve the original layout line by line. "
    "Output ONLY the extracted text — no explanation, no commentary."
)


def allowed_mime(mime: str) -> bool:
    return mime in ALLOWED_MIMES


def _image_to_base64(img: Image.Image) -> str:
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _vision_ocr(b64_image: str) -> str:
    """Send image to Ollama vision model and return extracted text."""
    payload = {
        "model": OLLAMA_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": OCR_PROMPT,
                "images": [b64_image],
            }
        ],
        "stream": False,
        "options": {"num_predict": 2048, "temperature": 0},
    }
    resp = requests.post(f"{OLLAMA_HOST}/api/chat", json=payload, timeout=120)
    resp.raise_for_status()
    data = resp.json()
    # chat API returns message.content; generate API returns response
    return (data.get("message", {}).get("content") or data.get("response") or "").strip()


def extract_text(file_path: str, mime_type: str) -> str:
    if mime_type == "application/pdf":
        return _extract_pdf(file_path)
    if mime_type.startswith("image/"):
        return _extract_image(file_path)
    raise ValueError(f"Unsupported MIME type for OCR: {mime_type}")


def _extract_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    pages_text = []

    for page in doc:
        # Native text extraction first — fast and lossless for digital PDFs
        text = page.get_text("text").strip()

        if text:
            pages_text.append(text)
        else:
            # Scanned page — render to image and run vision OCR
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            b64 = _image_to_base64(img)
            ocr_text = _vision_ocr(b64)
            pages_text.append(ocr_text)

    doc.close()

    combined = "\n\n".join(pages_text).strip()
    if not combined:
        return "[PDF contained no extractable text]"

    combined = re.sub(r"[ \t]+", " ", combined)
    combined = re.sub(r"\n{3,}", "\n\n", combined)
    return combined.strip()


def _extract_image(file_path: str) -> str:
    img = Image.open(file_path)
    b64 = _image_to_base64(img)
    text = _vision_ocr(b64)
    return text or "[Vision OCR returned empty — check image quality]"
