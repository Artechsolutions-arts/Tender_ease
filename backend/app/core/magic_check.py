"""Pure-Python magic-bytes file type verification (no libmagic system dependency)."""

# (signature_bytes, canonical_mime_type)
_SIGNATURES: list[tuple[bytes, str]] = [
    (b"%PDF",               "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff",       "image/jpeg"),
    # WEBP: "RIFF" at 0 and "WEBP" at offset 8
    (b"RIFF",               "image/webp"),
]

# Browser-sent MIME aliases that map to a canonical type
_ALIASES: dict[str, str] = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
}

_ALLOWED_MIMES = {"application/pdf", "image/png", "image/jpeg", "image/webp"}


def _detect(data: bytes) -> str | None:
    """Return canonical MIME type from magic bytes, or None if unrecognised."""
    for sig, mime in _SIGNATURES:
        if data[:len(sig)] == sig:
            # Extra check for WEBP: must have "WEBP" at offset 8
            if mime == "image/webp" and data[8:12] != b"WEBP":
                return None
            return mime
    return None


def verify(data: bytes, claimed_mime: str) -> tuple[bool, str]:
    """
    Verify that the file content matches the claimed MIME type.

    Returns (ok: bool, reason: str).
    ok=True  → file is safe to accept
    ok=False → file should be rejected, reason explains why
    """
    if not data:
        return False, "File is empty"

    canonical_claimed = _ALIASES.get(claimed_mime, claimed_mime)

    if canonical_claimed not in _ALLOWED_MIMES:
        return False, f"File type '{claimed_mime}' is not permitted"

    detected = _detect(data)

    if detected is None:
        return False, (
            f"File does not match any permitted format "
            f"(claimed: {claimed_mime}). Upload PDF, PNG, JPG, or WEBP only."
        )

    if detected != canonical_claimed:
        return False, (
            f"File content is {detected} but was declared as {claimed_mime}. "
            "Possible file-type spoofing — upload rejected."
        )

    return True, "ok"
