from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Bid, Tender, Vendor, TenderEligibleVendor, TenderStatusEnum, User, RoleEnum
from app.core.deps import get_current_user
from app.services.email_service import send_new_bid_admin_notification
from app.services.audit_service import log as audit_log, get_ip, Action

router = APIRouter()


class BidRequest(BaseModel):
    tenderId: str
    amount: float = Field(..., gt=0, description="Bid amount in INR — must be positive")
    notes: str = None
    documents: list = []


# ── Bid sealing ───────────────────────────────────────────────────────────────
# Bid amounts are sealed (hidden) while the tender is open (Draft/Published).
# Revealed only after tender moves to Closed or beyond, preventing pre-opening leakage.

_SEALED_STATUSES = {TenderStatusEnum.Draft, TenderStatusEnum.Published}


def _bid_dict(b: Bid, reveal_amount: bool = True) -> dict:
    return {
        "id": b.id,
        "tenderId": b.tender_id,
        "vendorId": b.vendor_id,
        "amount": b.amount if reveal_amount else None,
        "amountSealed": not reveal_amount,
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


def _should_reveal(tender: Tender, current_user: User) -> bool:
    """Bid amounts only visible after tender closes — even admins are blocked while open."""
    if tender is None:
        return True
    return tender.status not in _SEALED_STATUSES


# ── Endpoints ─────────────────────────────────────────────────────────────────

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

    tender = db.query(Tender).filter(Tender.id == tender_id).first() if tender_id else None
    reveal = _should_reveal(tender, current_user)
    return {"bids": [_bid_dict(b, reveal_amount=reveal) for b in items], "total": total}


@router.post("")
def submit_bid(
    request: Request,
    body: BidRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
        raise HTTPException(status_code=403, detail="Blacklisted vendors cannot bid on government tenders")

    eligible = db.query(TenderEligibleVendor).filter(
        TenderEligibleVendor.tender_id == tender.id,
        TenderEligibleVendor.vendor_id == vendor.id,
    ).first()
    if not eligible:
        raise HTTPException(status_code=403, detail="Vendor not in the eligibility list for this tender")

    existing = db.query(Bid).filter(Bid.tender_id == tender.id, Bid.vendor_id == vendor.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Bid already submitted. Bids cannot be modified after submission.")

    bid = Bid(
        tender_id=tender.id,
        vendor_id=vendor.id,
        amount=body.amount,
        notes=body.notes,
        documents=body.documents,
    )
    db.add(bid)
    audit_log(db, Action.BID_SUBMIT, "Bid", tender.id,
              user_id=current_user.id,
              details={"vendor_id": vendor.id, "company": vendor.company_name,
                       "amount": body.amount, "tender_name": tender.name},
              ip_address=get_ip(request))
    db.commit()
    db.refresh(bid)

    admin_emails = [u.email for u in db.query(User).filter(User.role == RoleEnum.ADMIN).all()]
    send_new_bid_admin_notification(
        admin_emails,
        bid={"amount": bid.amount, "notes": bid.notes},
        vendor={"company_name": vendor.company_name},
        tender={"id": tender.id, "name": tender.name, "department": tender.department},
    )

    # Never return amount immediately after submission (sealed until tender closes)
    return _bid_dict(bid, reveal_amount=False)


@router.get("/{bid_id}")
def get_bid(
    bid_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    if current_user.role == RoleEnum.VENDOR and bid.vendor_id != current_user.vendor_id:
        raise HTTPException(status_code=403, detail="Access denied")
    tender = db.query(Tender).filter(Tender.id == bid.tender_id).first()
    return _bid_dict(bid, reveal_amount=_should_reveal(tender, current_user))
