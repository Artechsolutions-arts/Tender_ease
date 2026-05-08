import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.models import Tender, Vendor, AiValidation, TenderEligibleVendor, Bid, User, PendingVendor
from app.core.deps import require_admin
from app.services import ai_service
from app.services.audit_service import log as audit_log, get_ip

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("ai")


def _validation_dict(v: AiValidation) -> dict:
    return {
        "id": v.id,
        "tenderId": v.tender_id,
        "validationType": v.validation_type,
        "result": v.result,
        "score": v.score,
        "riskLevel": v.risk_level,
        "createdAt": v.created_at.isoformat() if v.created_at else None,
    }


@router.post("/validate-tender/{tender_id}")
@limiter.limit("20/minute")
def validate_tender(
    request: Request,
    tender_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")

    payload = {
        "id": t.id, "name": t.name, "description": t.description,
        "category": t.category, "department": t.department,
        "estimatedValue": t.estimated_value,
        "startDate": t.start_date.isoformat(),
        "endDate": t.end_date.isoformat(),
        "eligibleVendorCount": len(t.eligible_vendors),
        "documentCount": len(t.documents),
    }

    try:
        result = ai_service.validate_tender(payload)
    except Exception as exc:
        logger.error("AI tender validation failed for %s: %s", tender_id, exc)
        raise HTTPException(status_code=503, detail="AI validation service unavailable")

    record = AiValidation(
        tender_id=t.id, validation_type="tender_validation",
        result=result, score=result.get("validationScore"), risk_level=result.get("riskLevel"),
    )
    db.add(record)
    audit_log(db, "AI_VALIDATE_TENDER", "Tender", t.id,
              user_id=current_user.id,
              details={"score": result.get("validationScore"), "risk": result.get("riskLevel")},
              ip_address=get_ip(request))
    db.commit()
    db.refresh(record)
    return _validation_dict(record)


@router.post("/analyze-bids/{tender_id}")
@limiter.limit("20/minute")
def analyze_bids(
    request: Request,
    tender_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")

    bids = []
    for b in t.bids:
        vendor = db.query(Vendor).filter(Vendor.id == b.vendor_id).first()
        if vendor:
            bids.append({
                "vendorId": b.vendor_id, "vendorName": vendor.company_name,
                "amount": b.amount, "blacklisted": vendor.blacklisted,
            })

    try:
        result = ai_service.analyze_bids(
            {"id": t.id, "name": t.name, "estimatedValue": t.estimated_value}, bids
        )
    except Exception as exc:
        logger.error("AI bid analysis failed for %s: %s", tender_id, exc)
        raise HTTPException(status_code=503, detail="AI analysis service unavailable")

    record = AiValidation(tender_id=t.id, validation_type="bid_analysis", result=result)
    db.add(record)
    audit_log(db, "AI_ANALYZE_BIDS", "Tender", t.id,
              user_id=current_user.id,
              details={"bid_count": len(bids)},
              ip_address=get_ip(request))
    db.commit()
    db.refresh(record)
    return _validation_dict(record)


@router.get("/compliance-check")
@limiter.limit("20/minute")
def compliance_check(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tenders = db.query(Tender).filter(Tender.is_deleted == False).all()  # noqa: E712
    tender_list = [{
        "id": t.id, "name": t.name,
        "startDate": t.start_date.isoformat(), "endDate": t.end_date.isoformat(),
        "status": t.status.value, "documents": len(t.documents),
    } for t in tenders]

    total_vendors = db.query(Vendor).count()
    blacklisted = db.query(Vendor).filter(Vendor.blacklisted == True).count()  # noqa: E712
    pending = db.query(PendingVendor).filter(PendingVendor.status == "Pending Review").count()

    try:
        result = ai_service.check_compliance(tender_list, {
            "totalVendors": total_vendors, "blacklistedVendors": blacklisted,
            "pendingVerifications": pending,
        })
    except Exception as exc:
        logger.error("AI compliance check failed: %s", exc)
        raise HTTPException(status_code=503, detail="AI compliance service unavailable")

    audit_log(db, "AI_COMPLIANCE_CHECK", "System", "compliance",
              user_id=current_user.id, ip_address=get_ip(request))
    db.commit()
    return result


@router.get("/insights")
@limiter.limit("20/minute")
def get_insights(
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tenders = db.query(Tender).filter(Tender.is_deleted == False).all()  # noqa: E712
    vendors = db.query(Vendor).all()

    tender_list = [{
        "id": t.id, "name": t.name, "status": t.status.value,
        "estimatedValue": t.estimated_value, "category": t.category,
        "eligibleVendors": len(t.eligible_vendors),
    } for t in tenders]
    vendor_list = [{
        "id": v.id, "pastPerformance": v.past_performance,
        "completedTenders": v.completed_tenders, "blacklisted": v.blacklisted,
    } for v in vendors]

    try:
        result = ai_service.generate_insights(tender_list, vendor_list)
    except Exception as exc:
        logger.error("AI insights generation failed: %s", exc)
        raise HTTPException(status_code=503, detail="AI insights service unavailable")

    audit_log(db, "AI_INSIGHTS", "System", "insights",
              user_id=current_user.id, ip_address=get_ip(request))
    db.commit()
    return result


@router.get("/tender-validations/{tender_id}")
def get_validations(
    tender_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    records = (
        db.query(AiValidation)
        .filter(AiValidation.tender_id == tender_id)
        .order_by(AiValidation.created_at.desc())
        .all()
    )
    return [_validation_dict(v) for v in records]
