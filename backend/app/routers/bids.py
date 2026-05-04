from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Bid, Tender, Vendor, TenderEligibleVendor, TenderStatusEnum, User, RoleEnum
from app.core.deps import get_current_user
from app.services.email_service import send_new_bid_admin_notification

router = APIRouter()


class BidRequest(BaseModel):
    tenderId: str
    amount: float
    notes: str = None
    documents: list = []


def _bid_dict(b: Bid) -> dict:
    return {
        "id": b.id,
        "tenderId": b.tender_id,
        "vendorId": b.vendor_id,
        "amount": b.amount,
        "documents": b.documents,
        "notes": b.notes,
        "status": b.status,
        "submittedAt": b.submitted_at.isoformat() if b.submitted_at else None,
        "updatedAt": b.updated_at.isoformat() if b.updated_at else None,
        "vendor": {
            "companyName": b.vendor.company_name,
            "contactPerson": b.vendor.contact_person,
            "blacklisted": b.vendor.blacklisted,
        } if b.vendor else None,
    }


@router.get("")
def list_bids(
    tender_id: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Bid)
    if current_user.role == RoleEnum.VENDOR:
        vendor = db.query(Vendor).filter(Vendor.id == current_user.vendor_id).first()
        if vendor:
            q = q.filter(Bid.vendor_id == vendor.id)
        else:
            return {"bids": [], "total": 0}
    if tender_id:
        q = q.filter(Bid.tender_id == tender_id)
    total = q.count()
    items = q.order_by(Bid.submitted_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"bids": [_bid_dict(b) for b in items], "total": total}


@router.post("")
def submit_bid(body: BidRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != RoleEnum.VENDOR:
        raise HTTPException(status_code=403, detail="Only vendors can submit bids")

    tender = db.query(Tender).filter(Tender.id == body.tenderId).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    if tender.status != TenderStatusEnum.Published:
        raise HTTPException(status_code=400, detail="Tender is not accepting bids")
    if tender.end_date.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Bid deadline has passed")

    vendor = db.query(Vendor).filter(Vendor.id == current_user.vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=400, detail="Vendor profile not found")
    if vendor.blacklisted:
        raise HTTPException(status_code=403, detail="Blacklisted vendors cannot bid")

    eligible = db.query(TenderEligibleVendor).filter(
        TenderEligibleVendor.tender_id == tender.id,
        TenderEligibleVendor.vendor_id == vendor.id,
    ).first()
    if not eligible:
        raise HTTPException(status_code=403, detail="Vendor not eligible for this tender")

    existing = db.query(Bid).filter(Bid.tender_id == tender.id, Bid.vendor_id == vendor.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bid already submitted for this tender")

    bid = Bid(
        tender_id=tender.id,
        vendor_id=vendor.id,
        amount=body.amount,
        notes=body.notes,
        documents=body.documents,
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)

    # Notify all admin users by email (background, non-blocking)
    admin_emails = [u.email for u in db.query(User).filter(User.role == RoleEnum.ADMIN).all()]
    send_new_bid_admin_notification(
        admin_emails,
        bid={"amount": bid.amount, "notes": bid.notes},
        vendor={"company_name": vendor.company_name},
        tender={"id": tender.id, "name": tender.name, "department": tender.department},
    )

    return _bid_dict(bid)


@router.get("/{bid_id}")
def get_bid(bid_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    if current_user.role == RoleEnum.VENDOR and bid.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _bid_dict(bid)
