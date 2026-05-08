import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Tender, Vendor, Bid, AuditLog, TenderStatusEnum, User
from app.core.deps import require_admin
from app.services.audit_service import log as audit_log, get_ip

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("reports")


@router.get("/dashboard")
def dashboard(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Only count live (non-deleted) tenders
    tenders = db.query(Tender).filter(Tender.is_deleted == False).all()  # noqa: E712
    vendors = db.query(Vendor).all()
    bids = db.query(Bid).all()
    now = datetime.now(timezone.utc)

    total_value = sum(t.estimated_value for t in tenders)
    active = [t for t in tenders if t.status == TenderStatusEnum.Published]
    awarded = [t for t in tenders if t.status == TenderStatusEnum.Awarded]
    pending_eval = [t for t in tenders if t.status in (TenderStatusEnum.Closed, TenderStatusEnum.Evaluated)]

    cat_map: dict = {}
    for t in tenders:
        cat_map.setdefault(t.category, {"category": t.category, "count": 0, "value": 0.0})
        cat_map[t.category]["count"] += 1
        cat_map[t.category]["value"] += t.estimated_value

    upcoming = sorted(
        [t for t in tenders if t.status == TenderStatusEnum.Published and
         t.end_date.replace(tzinfo=timezone.utc) > now],
        key=lambda t: t.end_date,
    )[:5]

    audit_log(db, "REPORT_ACCESS", "Report", "dashboard",
              user_id=current_user.id, ip_address=get_ip(request))
    db.commit()

    return {
        "kpis": {
            "activeTenders": len(active),
            "totalVendors": len(vendors),
            "totalBids": len(bids),
            "pendingEvaluations": len(pending_eval),
            "awardedTenders": len(awarded),
            "totalValue": total_value,
        },
        "categoryBreakdown": list(cat_map.values()),
        "upcomingDeadlines": [
            {"id": t.id, "name": t.name, "endDate": t.end_date.isoformat(),
             "category": t.category, "estimatedValue": t.estimated_value}
            for t in upcoming
        ],
        "recentTenders": [
            {"id": t.id, "name": t.name, "status": t.status.value,
             "category": t.category, "estimatedValue": t.estimated_value,
             "endDate": t.end_date.isoformat()}
            for t in sorted(tenders, key=lambda x: x.created_at, reverse=True)[:5]
        ],
    }


@router.get("/analytics")
def analytics(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tenders = db.query(Tender).filter(Tender.is_deleted == False).order_by(Tender.created_at).all()  # noqa: E712

    monthly: dict = {}
    for t in tenders:
        key = t.created_at.strftime("%b %Y")
        monthly.setdefault(key, {"month": key, "tenders": 0, "value": 0.0})
        monthly[key]["tenders"] += 1
        monthly[key]["value"] += t.estimated_value

    top_vendors = (
        db.query(Vendor)
        .filter(Vendor.blacklisted == False)  # noqa: E712
        .order_by(Vendor.completed_tenders.desc())
        .limit(5)
        .all()
    )

    audit_log(db, "REPORT_ACCESS", "Report", "analytics",
              user_id=current_user.id, ip_address=get_ip(request))
    db.commit()

    return {
        "monthlyTrend": list(monthly.values())[-12:],
        "topVendors": [
            {"id": v.id, "companyName": v.company_name,
             "completedTenders": v.completed_tenders, "pastPerformance": v.past_performance,
             "category": v.category}
            for v in top_vendors
        ],
    }


@router.get("/audit-trail")
@limiter.limit("10/minute")
def audit_trail(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    entity_type: str = Query(None),
    action: str = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if action:
        q = q.filter(AuditLog.action == action)

    total = q.count()
    logs = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Audit that someone accessed the audit trail
    audit_log(db, "REPORT_ACCESS", "Report", "audit-trail",
              user_id=current_user.id,
              details={"page": page, "entity_type": entity_type, "action_filter": action},
              ip_address=get_ip(request))
    db.commit()

    return {
        "logs": [
            {"id": l.id, "userId": l.user_id, "action": l.action,
             "entityType": l.entity_type, "entityId": l.entity_id,
             "details": l.details, "ipAddress": l.ip_address,
             "createdAt": l.created_at.isoformat() if l.created_at else None}
            for l in logs
        ],
        "total": total, "page": page, "limit": limit,
    }
