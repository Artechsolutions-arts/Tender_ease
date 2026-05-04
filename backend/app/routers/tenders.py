import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Tender, TenderDocument, TenderEligibleVendor, TenderHistory,
    TenderStatusEnum, User, Vendor,
)
from app.core.deps import get_current_user, require_admin
from app.services.email_service import (
    send_tender_created_notifications,
    send_tender_updated_notifications,
    send_award_winner_notification,
    send_award_regret_notifications,
)

router = APIRouter()


def _get_vendor_emails(db: Session, vendor_ids: list[str]) -> list[tuple[str, str]]:
    """Returns list of (company_name, email) for the given vendor IDs."""
    if not vendor_ids:
        return []
    vendors = db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()
    return [(v.company_name, v.email) for v in vendors if v.email]


STATUS_FLOW = {
    TenderStatusEnum.Draft: [TenderStatusEnum.Published],
    TenderStatusEnum.Published: [TenderStatusEnum.Closed],
    TenderStatusEnum.Closed: [TenderStatusEnum.Evaluated],
    TenderStatusEnum.Evaluated: [TenderStatusEnum.Awarded],
    TenderStatusEnum.Awarded: [],
}


def _tender_dict(t: Tender, include_docs=True) -> dict:
    d = {
        "id": t.id,
        "name": t.name,
        "description": t.description,
        "startDate": t.start_date.isoformat() if t.start_date else None,
        "endDate": t.end_date.isoformat() if t.end_date else None,
        "estimatedValue": t.estimated_value,
        "category": t.category,
        "department": t.department,
        "status": t.status.value,
        "awardedVendorId": t.awarded_vendor_id,
        "createdBy": t.created_by,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
        "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
        "eligibleVendorIds": [ev.vendor_id for ev in t.eligible_vendors],
        "eligibleVendorCount": len(t.eligible_vendors),
    }
    if include_docs:
        d["documents"] = [{"id": doc.id, "name": doc.name, "url": doc.url, "size": doc.size} for doc in t.documents]
    return d


@router.get("")
def list_tenders(
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Tender)
    if status:
        try:
            q = q.filter(Tender.status == TenderStatusEnum(status))
        except ValueError:
            pass
    if category:
        q = q.filter(Tender.category == category)
    if department:
        q = q.filter(Tender.department == department)

    total = q.count()
    items = q.order_by(Tender.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"tenders": [_tender_dict(t) for t in items], "total": total, "page": page, "limit": limit}


@router.post("")
def create_tender(body: dict, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    tender_id = body.get("id") or f"TND-{datetime.utcnow().year}-{str(uuid.uuid4())[:6].upper()}"
    eligible_ids = body.pop("eligibleVendorIds", [])
    docs_data = body.pop("documents", [])

    tender = Tender(
        id=tender_id,
        name=body["name"],
        description=body.get("description", ""),
        start_date=datetime.fromisoformat(body["startDate"]),
        end_date=datetime.fromisoformat(body["endDate"]),
        estimated_value=float(body["estimatedValue"]),
        category=body["category"],
        department=body["department"],
        status=TenderStatusEnum(body.get("status", "Draft")),
        created_by=current_user.id,
    )
    db.add(tender)
    db.flush()

    for vid in eligible_ids:
        db.add(TenderEligibleVendor(tender_id=tender.id, vendor_id=vid))
    for doc in docs_data:
        db.add(TenderDocument(tender_id=tender.id, name=doc["name"], size=doc.get("size", "")))

    db.commit()
    db.refresh(tender)

    # Notify eligible vendors by email (background, non-blocking)
    vendor_emails = _get_vendor_emails(db, eligible_ids)
    tender_info = {
        "id": tender.id,
        "name": tender.name,
        "department": tender.department,
        "category": tender.category,
        "estimatedValue": tender.estimated_value,
        "endDate": tender.end_date.strftime("%d %b %Y") if tender.end_date else "—",
    }
    send_tender_created_notifications(vendor_emails, tender_info)

    return _tender_dict(tender)


@router.get("/{tender_id}")
def get_tender(tender_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = db.query(Tender).filter(Tender.id == tender_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")
    return _tender_dict(t)


@router.put("/{tender_id}")
def update_tender(
    tender_id: str,
    body: dict,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")

    # Save history snapshot
    version = len(t.history) + 1
    db.add(TenderHistory(
        tender_id=t.id, version=version,
        edited_by=current_user.id, changes="Updated",
        snapshot=_tender_dict(t, include_docs=False),
    ))

    eligible_ids = body.pop("eligibleVendorIds", None)
    for field, col in [("name","name"),("description","description"),("estimatedValue","estimated_value"),("category","category"),("department","department")]:
        if field in body:
            setattr(t, col, body[field])
    if "startDate" in body:
        t.start_date = datetime.fromisoformat(body["startDate"])
    if "endDate" in body:
        t.end_date = datetime.fromisoformat(body["endDate"])

    if eligible_ids is not None:
        db.query(TenderEligibleVendor).filter(TenderEligibleVendor.tender_id == t.id).delete()
        for vid in eligible_ids:
            db.add(TenderEligibleVendor(tender_id=t.id, vendor_id=vid))

    db.commit()
    db.refresh(t)

    # Notify eligible vendors by email (background, non-blocking)
    current_eligible_ids = [ev.vendor_id for ev in t.eligible_vendors]
    vendor_emails = _get_vendor_emails(db, current_eligible_ids)
    tender_info = {
        "id": t.id,
        "name": t.name,
        "department": t.department,
        "category": t.category,
        "estimatedValue": t.estimated_value,
        "endDate": t.end_date.strftime("%d %b %Y") if t.end_date else "—",
    }
    change_note = body.get("changeNote", "")
    send_tender_updated_notifications(vendor_emails, tender_info, change_note)

    return _tender_dict(t)


@router.patch("/{tender_id}/status")
def change_status(
    tender_id: str,
    body: dict,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")

    try:
        new_status = TenderStatusEnum(body["status"])
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid status")

    allowed = STATUS_FLOW.get(t.status, [])
    if new_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Cannot move from {t.status.value} to {new_status.value}")

    if new_status == TenderStatusEnum.Awarded:
        if not body.get("awardedVendorId"):
            raise HTTPException(status_code=400, detail="awardedVendorId is required when awarding")
        t.awarded_vendor_id = body["awardedVendorId"]

    t.status = new_status
    db.commit()
    db.refresh(t)

    # On award: send winner LoA email + regret letters to all other eligible vendors
    if new_status == TenderStatusEnum.Awarded:
        winner_id = t.awarded_vendor_id
        all_eligible_ids = [ev.vendor_id for ev in t.eligible_vendors]
        loser_ids = [vid for vid in all_eligible_ids if vid != winner_id]

        tender_info = {
            "id": t.id,
            "name": t.name,
            "department": t.department,
            "category": t.category,
            "estimatedValue": t.estimated_value,
            "endDate": t.end_date.strftime("%d %b %Y") if t.end_date else "—",
        }

        # Winner email
        winner_rows = _get_vendor_emails(db, [winner_id]) if winner_id else []
        if winner_rows:
            send_award_winner_notification(
                company_name=winner_rows[0][0],
                email=winner_rows[0][1],
                tender=tender_info,
                contract_value=t.estimated_value,
            )

        # Regret emails to all non-winning eligible vendors
        loser_emails = _get_vendor_emails(db, loser_ids)
        send_award_regret_notifications(loser_emails, tender_info)

    return _tender_dict(t)


@router.delete("/{tender_id}")
def delete_tender(tender_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    t = db.query(Tender).filter(Tender.id == tender_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")
    db.delete(t)
    db.commit()
    return {"message": "Tender deleted"}
