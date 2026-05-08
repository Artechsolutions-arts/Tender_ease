import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vendor, PendingVendor, User
from app.core.deps import get_current_user, require_admin
from app.services.email_service import (
    send_vendor_approval_notification,
    send_vendor_rejection_notification,
)
from app.services.audit_service import log as audit_log, get_ip, Action

router = APIRouter()


# ── Request schemas ───────────────────────────────────────────────────────────

class VendorUpdateRequest(BaseModel):
    companyName: Optional[str] = Field(None, min_length=2, max_length=300)
    contactPerson: Optional[str] = Field(None, min_length=2, max_length=200)
    phone: Optional[str] = None
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    gst: Optional[str] = None
    pan: Optional[str] = None
    blacklisted: Optional[bool] = None
    pastPerformance: Optional[int] = Field(None, ge=0, le=100)
    completedTenders: Optional[int] = Field(None, ge=0)

    @field_validator("gst")
    @classmethod
    def gst_format(cls, v: str) -> str:
        if v is None:
            return v
        v = v.strip().upper()
        if v and len(v) != 15:
            raise ValueError("GST number must be 15 characters")
        return v

    @field_validator("pan")
    @classmethod
    def pan_format(cls, v: str) -> str:
        if v is None:
            return v
        v = v.strip().upper()
        if v and len(v) != 10:
            raise ValueError("PAN must be 10 characters")
        return v


class RejectRequest(BaseModel):
    reason: Optional[str] = None


# ── Serialisers ───────────────────────────────────────────────────────────────

def _vendor_dict(v: Vendor, user: User = None) -> dict:
    return {
        "id": v.id,
        "companyName": v.company_name,
        "contactPerson": v.contact_person,
        "email": v.email,
        "phone": v.phone,
        "category": v.category,
        "gst": v.gst,
        "pan": v.pan,
        "registeredOn": v.registered_on.isoformat() if v.registered_on else None,
        "pastPerformance": v.past_performance,
        "completedTenders": v.completed_tenders,
        "blacklisted": v.blacklisted,
        "createdAt": v.created_at.isoformat() if v.created_at else None,
        "updatedAt": v.updated_at.isoformat() if v.updated_at else None,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "isVerified": user.is_verified,
            "verificationStep": user.verification_step.value if user.verification_step else None,
        } if user else None,
    }


def _pending_dict(p: PendingVendor) -> dict:
    return {
        "id": p.id,
        "company": p.company,
        "contact": p.contact,
        "email": p.email,
        "phone": p.phone,
        "submittedOn": p.submitted_on.isoformat() if p.submitted_on else None,
        "status": p.status,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("")
def list_vendors(
    category: str = Query(None),
    blacklisted: bool = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Vendor)
    if category:
        q = q.filter(Vendor.category == category)
    if blacklisted is not None:
        q = q.filter(Vendor.blacklisted == blacklisted)
    total = q.count()
    items = q.order_by(Vendor.company_name).offset((page - 1) * limit).limit(limit).all()
    vendor_ids = [v.id for v in items]
    users_map = {
        u.vendor_id: u
        for u in db.query(User).filter(User.vendor_id.in_(vendor_ids)).all()
    }
    return {"vendors": [_vendor_dict(v, users_map.get(v.id)) for v in items], "total": total, "page": page, "limit": limit}


@router.get("/pending")
def list_pending(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    items = db.query(PendingVendor).filter(PendingVendor.status == "Pending Review").all()
    return {"vendors": [_pending_dict(p) for p in items], "total": len(items)}


@router.get("/{vendor_id}")
def get_vendor(vendor_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    user = db.query(User).filter(User.vendor_id == vendor_id).first()
    return _vendor_dict(v, user)


@router.put("/{vendor_id}")
def update_vendor(
    vendor_id: str,
    request: Request,
    body: VendorUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")

    changes = {}
    field_map = [
        ("companyName", "company_name"), ("contactPerson", "contact_person"),
        ("phone", "phone"), ("category", "category"),
        ("gst", "gst"), ("pan", "pan"),
        ("pastPerformance", "past_performance"), ("completedTenders", "completed_tenders"),
    ]
    for req_field, col in field_map:
        val = getattr(body, req_field)
        if val is not None:
            old = getattr(v, col)
            setattr(v, col, val)
            changes[req_field] = {"old": old, "new": val}

    # Blacklist change — critical action, always audit with dedicated action code
    if body.blacklisted is not None and body.blacklisted != v.blacklisted:
        action = Action.VENDOR_BLACKLIST if body.blacklisted else Action.VENDOR_UNBLACKLIST
        v.blacklisted = body.blacklisted
        audit_log(db, action, "Vendor", v.id,
                  user_id=current_user.id,
                  details={"company": v.company_name, "blacklisted": body.blacklisted,
                           "gst": v.gst, "pan": v.pan},
                  ip_address=get_ip(request))
    elif changes:
        audit_log(db, "VENDOR_UPDATE", "Vendor", v.id,
                  user_id=current_user.id,
                  details={"changes": changes},
                  ip_address=get_ip(request))

    db.commit()
    db.refresh(v)
    return _vendor_dict(v)


@router.patch("/{vendor_id}/approve")
def approve_vendor(
    vendor_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pv = db.query(PendingVendor).filter(PendingVendor.id == vendor_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Pending vendor not found")

    new_vendor_id = f"VEN-{datetime.now(timezone.utc).year}-{str(uuid.uuid4())[:6].upper()}"
    vendor = Vendor(
        id=new_vendor_id,
        company_name=pv.company,
        contact_person=pv.contact,
        email=pv.email,
        phone=pv.phone,
        category="General",
        gst="",
        pan="",
    )
    db.add(vendor)
    db.flush()

    pv.status = "Approved"
    user = db.query(User).filter(User.email == pv.email).first()
    if user:
        user.is_verified = True
        user.vendor_id = new_vendor_id

    audit_log(db, Action.VENDOR_APPROVE, "Vendor", new_vendor_id,
              user_id=current_user.id,
              details={"company": pv.company, "email": pv.email, "pending_id": vendor_id},
              ip_address=get_ip(request))
    db.commit()

    send_vendor_approval_notification(pv.email, pv.company, pv.contact, new_vendor_id)
    return {**_pending_dict(pv), "vendorId": new_vendor_id}


@router.patch("/{vendor_id}/reject")
def reject_vendor(
    vendor_id: str,
    request: Request,
    body: RejectRequest = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    pv = db.query(PendingVendor).filter(PendingVendor.id == vendor_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Pending vendor not found")

    pv.status = "Rejected"
    audit_log(db, Action.VENDOR_REJECT, "Vendor", vendor_id,
              user_id=current_user.id,
              details={"company": pv.company, "email": pv.email,
                       "reason": body.reason if body else None},
              ip_address=get_ip(request))
    db.commit()

    send_vendor_rejection_notification(pv.email, pv.company, pv.contact)
    return _pending_dict(pv)
