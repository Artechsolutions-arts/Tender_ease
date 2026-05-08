"""Centralised audit logging — every procurement action must go through here."""
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import AuditLog

logger = logging.getLogger("audit")

# Action constants — used in all routers
class Action:
    # Auth
    LOGIN            = "LOGIN"
    LOGIN_FAILED     = "LOGIN_FAILED"
    LOGOUT           = "LOGOUT"
    REGISTER         = "REGISTER_VENDOR"
    PASSWORD_CHANGE  = "PASSWORD_CHANGE"

    # Tender lifecycle
    TENDER_CREATE    = "TENDER_CREATE"
    TENDER_UPDATE    = "TENDER_UPDATE"
    TENDER_DELETE    = "TENDER_DELETE"
    TENDER_STATUS    = "TENDER_STATUS_CHANGE"
    TENDER_AWARD     = "TENDER_AWARD"

    # Bidding
    BID_SUBMIT       = "BID_SUBMIT"
    BID_WITHDRAW     = "BID_WITHDRAW"
    BID_EVALUATE     = "BID_EVALUATE"

    # Vendors
    VENDOR_APPROVE   = "VENDOR_APPROVE"
    VENDOR_REJECT    = "VENDOR_REJECT"
    VENDOR_BLACKLIST = "VENDOR_BLACKLIST"
    VENDOR_UNBLACKLIST = "VENDOR_UNBLACKLIST"

    # Documents
    DOC_UPLOAD       = "DOC_UPLOAD"
    DOC_DELETE       = "DOC_DELETE"
    DOC_REVIEW       = "DOC_REVIEW"
    DOC_RETRY        = "DOC_RETRY"

    # Compliance
    EMD_SUBMIT       = "EMD_SUBMIT"
    EMD_REFUND       = "EMD_REFUND"
    EMD_FORFEIT      = "EMD_FORFEIT"
    ADDENDUM_ISSUE   = "ADDENDUM_ISSUE"


def log(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    user_id: str = None,
    details: dict = None,
    ip_address: str = None,
) -> None:
    """Write an immutable audit record. Caller must commit the DB session."""
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
        ip_address=ip_address or "unknown",
    )
    db.add(entry)
    logger.info(
        "AUDIT | %s | %s | %s | user=%s | ip=%s",
        action, entity_type, entity_id, user_id or "anon", ip_address or "unknown",
    )


def get_ip(request) -> str:
    """Extract real client IP, honouring X-Forwarded-For (nginx/load-balancer)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
