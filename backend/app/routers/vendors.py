from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Vendor, PendingVendor, User
from app.core.deps import get_current_user, require_admin

router = APIRouter()


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
    # Attach linked user account to each vendor
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
def update_vendor(vendor_id: str, body: dict, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    v = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for field, col in [
        ("companyName", "company_name"), ("contactPerson", "contact_person"),
        ("phone", "phone"), ("category", "category"), ("gst", "gst"),
        ("pan", "pan"), ("blacklisted", "blacklisted"),
        ("pastPerformance", "past_performance"), ("completedTenders", "completed_tenders"),
    ]:
        if field in body:
            setattr(v, col, body[field])
    db.commit()
    db.refresh(v)
    return _vendor_dict(v)


@router.patch("/{vendor_id}/approve")
def approve_vendor(vendor_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    pv = db.query(PendingVendor).filter(PendingVendor.id == vendor_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Pending vendor not found")
    pv.status = "Approved"
    db.commit()
    return _pending_dict(pv)


@router.patch("/{vendor_id}/reject")
def reject_vendor(vendor_id: str, body: dict = None, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    pv = db.query(PendingVendor).filter(PendingVendor.id == vendor_id).first()
    if not pv:
        raise HTTPException(status_code=404, detail="Pending vendor not found")
    pv.status = "Rejected"
    db.commit()
    return _pending_dict(pv)
