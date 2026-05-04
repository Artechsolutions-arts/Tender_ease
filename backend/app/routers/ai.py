from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.models import Tender, Vendor, AiValidation, TenderEligibleVendor, Bid, User, PendingVendor
from app.core.deps import require_admin
from app.services import ai_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


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
def validate_tender(request: Request, tender_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
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
    result = ai_service.validate_tender(payload)

    record = AiValidation(
        tender_id=t.id,
        validation_type="tender_validation",
        result=result,
        score=result.get("validationScore"),
        risk_level=result.get("riskLevel"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _validation_dict(record)


@router.post("/analyze-bids/{tender_id}")
@limiter.limit("20/minute")
def analyze_bids(request: Request, tender_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Tender).filter(Tender.id == tender_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")

    bids = []
    for b in t.bids:
        vendor = db.query(Vendor).filter(Vendor.id == b.vendor_id).first()
        if vendor:
            bids.append({"vendorId": b.vendor_id, "vendorName": vendor.company_name, "amount": b.amount, "blacklisted": vendor.blacklisted})

    result = ai_service.analyze_bids(
        {"id": t.id, "name": t.name, "estimatedValue": t.estimated_value},
        bids,
    )
    record = AiValidation(tender_id=t.id, validation_type="bid_analysis", result=result)
    db.add(record)
    db.commit()
    db.refresh(record)
    return _validation_dict(record)


@router.get("/compliance-check")
@limiter.limit("20/minute")
def compliance_check(request: Request, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    tenders = db.query(Tender).all()
    tender_list = [{
        "id": t.id, "name": t.name,
        "startDate": t.start_date.isoformat(),
        "endDate": t.end_date.isoformat(),
        "status": t.status.value,
        "documents": len(t.documents),
    } for t in tenders]

    total_vendors = db.query(Vendor).count()
    blacklisted = db.query(Vendor).filter(Vendor.blacklisted == True).count()
    pending = db.query(PendingVendor).filter(PendingVendor.status == "Pending Review").count()

    result = ai_service.check_compliance(tender_list, {
        "totalVendors": total_vendors,
        "blacklistedVendors": blacklisted,
        "pendingVerifications": pending,
    })
    return result


@router.get("/insights")
@limiter.limit("20/minute")
def get_insights(request: Request, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    tenders = db.query(Tender).all()
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

    return ai_service.generate_insights(tender_list, vendor_list)


@router.get("/tender-validations/{tender_id}")
def get_validations(tender_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    records = db.query(AiValidation).filter(AiValidation.tender_id == tender_id).order_by(AiValidation.created_at.desc()).all()
    return [_validation_dict(v) for v in records]
