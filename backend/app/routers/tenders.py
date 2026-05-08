import uuid
from datetime import datetime, date, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator, model_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import func, extract, case, Integer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    Tender, TenderDocument, TenderEligibleVendor, TenderHistory,
    TenderStatusEnum, User, Vendor, Bid,
)
from app.core.deps import get_current_user, require_admin
from app.core.config import MIN_BIDS_FOR_EVALUATION
from app.services.audit_service import log as audit_log, get_ip, Action
from app.services.email_service import (
    send_tender_created_notifications,
    send_tender_updated_notifications,
    send_award_winner_notification,
    send_award_regret_notifications,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ── Request schemas ───────────────────────────────────────────────────────────

class TenderDocumentInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    size: str = ""


class TenderCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., min_length=5, max_length=500,
                      description="Tender title — must be descriptive")
    description: str = Field(..., min_length=20,
                              description="Detailed scope of work")
    startDate: str = Field(..., description="ISO 8601 datetime")
    endDate: str = Field(..., description="ISO 8601 datetime — must be after startDate")
    estimatedValue: float = Field(..., gt=0,
                                   description="Estimated contract value in INR")
    category: str = Field(..., min_length=2, max_length=100)
    department: str = Field(..., min_length=2, max_length=100)
    status: str = "Draft"
    eligibleVendorIds: List[str] = []
    documents: List[TenderDocumentInput] = []

    @field_validator("name")
    @classmethod
    def no_sql_in_name(cls, v: str) -> str:
        forbidden = ["'", '"', ";", "--", "/*", "*/", "xp_", "DROP ", "SELECT ", "INSERT "]
        if any(f.lower() in v.lower() for f in forbidden):
            raise ValueError("Tender name contains invalid characters")
        return v.strip()

    @model_validator(mode="after")
    def dates_valid(self) -> "TenderCreateRequest":
        try:
            start = datetime.fromisoformat(self.startDate)
            end = datetime.fromisoformat(self.endDate)
        except ValueError:
            raise ValueError("startDate and endDate must be valid ISO 8601 datetimes")
        if end <= start:
            raise ValueError("endDate must be after startDate")
        return self


class TenderUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=5, max_length=500)
    description: Optional[str] = Field(None, min_length=20)
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    estimatedValue: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    department: Optional[str] = Field(None, min_length=2, max_length=100)
    eligibleVendorIds: Optional[List[str]] = None
    changeNote: str = ""

    @model_validator(mode="after")
    def dates_valid(self) -> "TenderUpdateRequest":
        if self.startDate and self.endDate:
            try:
                start = datetime.fromisoformat(self.startDate)
                end = datetime.fromisoformat(self.endDate)
            except ValueError:
                raise ValueError("startDate and endDate must be valid ISO 8601 datetimes")
            if end <= start:
                raise ValueError("endDate must be after startDate")
        return self


class StatusChangeRequest(BaseModel):
    status: str
    awardedVendorId: Optional[str] = None
    justification: Optional[str] = None  # Required for single-bid awards


# ── Status flow (forward-only — cannot go backward) ──────────────────────────

STATUS_FLOW = {
    TenderStatusEnum.Draft:      [TenderStatusEnum.Published],
    TenderStatusEnum.Published:  [TenderStatusEnum.Closed],
    TenderStatusEnum.Closed:     [TenderStatusEnum.Evaluated],
    TenderStatusEnum.Evaluated:  [TenderStatusEnum.Awarded],
    TenderStatusEnum.Awarded:    [],
}


# ── Serialisers ───────────────────────────────────────────────────────────────

def _tender_dict(t: Tender, include_docs: bool = True) -> dict:
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
        d["documents"] = [
            {"id": doc.id, "name": doc.name, "url": doc.url, "size": doc.size}
            for doc in t.documents
        ]
    return d


def _get_vendor_emails(db: Session, vendor_ids: list[str]) -> list[tuple[str, str]]:
    if not vendor_ids:
        return []
    vendors = db.query(Vendor).filter(Vendor.id.in_(vendor_ids)).all()
    return [(v.company_name, v.email) for v in vendors if v.email]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stats")
@limiter.limit("30/minute")
def get_tender_stats(request: Request, db: Session = Depends(get_db)):
    """Public — no auth required."""
    today = date.today()
    active_count = db.query(func.count(Tender.id)).filter(
        Tender.status == TenderStatusEnum.Published,
    ).scalar() or 0
    closing_today = db.query(func.count(Tender.id)).filter(
        Tender.status == TenderStatusEnum.Published,
        func.date(Tender.end_date) == today,
    ).scalar() or 0
    yr_col  = func.cast(extract("year",  Tender.created_at), Integer)
    mon_col = func.cast(extract("month", Tender.created_at), Integer)
    rows = (
        db.query(yr_col.label("yr"), mon_col.label("mon"),
                 func.count(Tender.id).label("count"),
                 func.sum(Tender.estimated_value).label("value"))
        .group_by(yr_col, mon_col).order_by(yr_col, mon_col).all()
    )
    MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return {
        "byYear": [
            {"year": f"{MONTH_ABBR[r.mon - 1]} {str(r.yr)[2:]}", "count": r.count, "value": round(r.value or 0, 2)}
            for r in rows
        ],
        "active": active_count,
        "closingToday": closing_today,
    }


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
    q = db.query(Tender).filter(Tender.is_deleted == False)  # noqa: E712
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
def create_tender(
    request: Request,
    body: TenderCreateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    tender_id = body.id or f"TND-{datetime.utcnow().year}-{str(uuid.uuid4())[:6].upper()}"

    tender = Tender(
        id=tender_id,
        name=body.name,
        description=body.description,
        start_date=datetime.fromisoformat(body.startDate),
        end_date=datetime.fromisoformat(body.endDate),
        estimated_value=body.estimatedValue,
        category=body.category,
        department=body.department,
        status=TenderStatusEnum(body.status),
        created_by=current_user.id,
    )
    db.add(tender)
    db.flush()

    for vid in body.eligibleVendorIds:
        db.add(TenderEligibleVendor(tender_id=tender.id, vendor_id=vid))
    for doc in body.documents:
        db.add(TenderDocument(tender_id=tender.id, name=doc.name, size=doc.size))

    audit_log(db, Action.TENDER_CREATE, "Tender", tender.id,
              user_id=current_user.id,
              details={"name": tender.name, "value": tender.estimated_value, "dept": tender.department},
              ip_address=get_ip(request))
    db.commit()
    db.refresh(tender)

    vendor_emails = _get_vendor_emails(db, body.eligibleVendorIds)
    tender_info = {
        "id": tender.id, "name": tender.name, "department": tender.department,
        "category": tender.category, "estimatedValue": tender.estimated_value,
        "endDate": tender.end_date.strftime("%d %b %Y") if tender.end_date else "—",
    }
    send_tender_created_notifications(vendor_emails, tender_info)
    return _tender_dict(tender)


@router.get("/{tender_id}")
def get_tender(
    tender_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id, Tender.is_deleted == False).first()  # noqa: E712
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")
    return _tender_dict(t)


@router.put("/{tender_id}")
def update_tender(
    tender_id: str,
    request: Request,
    body: TenderUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id, Tender.is_deleted == False).first()  # noqa: E712
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")
    if t.status in (TenderStatusEnum.Awarded,):
        raise HTTPException(status_code=400, detail="Awarded tenders cannot be modified")

    # Save immutable version snapshot
    version = len(t.history) + 1
    db.add(TenderHistory(
        tender_id=t.id, version=version, edited_by=current_user.id,
        changes=body.changeNote or "Updated",
        snapshot=_tender_dict(t, include_docs=False),
    ))

    field_map = [
        ("name", "name"), ("description", "description"),
        ("estimatedValue", "estimated_value"), ("category", "category"), ("department", "department"),
    ]
    changes = {}
    for req_field, col in field_map:
        val = getattr(body, req_field)
        if val is not None:
            old = getattr(t, col)
            setattr(t, col, val)
            changes[req_field] = {"old": old, "new": val}
    if body.startDate:
        t.start_date = datetime.fromisoformat(body.startDate)
    if body.endDate:
        t.end_date = datetime.fromisoformat(body.endDate)
    if body.eligibleVendorIds is not None:
        db.query(TenderEligibleVendor).filter(TenderEligibleVendor.tender_id == t.id).delete()
        for vid in body.eligibleVendorIds:
            db.add(TenderEligibleVendor(tender_id=t.id, vendor_id=vid))

    audit_log(db, Action.TENDER_UPDATE, "Tender", t.id,
              user_id=current_user.id,
              details={"changes": changes, "note": body.changeNote},
              ip_address=get_ip(request))
    db.commit()
    db.refresh(t)

    current_eligible_ids = [ev.vendor_id for ev in t.eligible_vendors]
    vendor_emails = _get_vendor_emails(db, current_eligible_ids)
    tender_info = {
        "id": t.id, "name": t.name, "department": t.department,
        "category": t.category, "estimatedValue": t.estimated_value,
        "endDate": t.end_date.strftime("%d %b %Y") if t.end_date else "—",
    }
    send_tender_updated_notifications(vendor_emails, tender_info, body.changeNote)
    return _tender_dict(t)


@router.patch("/{tender_id}/status")
def change_status(
    tender_id: str,
    request: Request,
    body: StatusChangeRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id, Tender.is_deleted == False).first()  # noqa: E712
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")

    try:
        new_status = TenderStatusEnum(body.status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status value")

    allowed = STATUS_FLOW.get(t.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move from '{t.status.value}' to '{new_status.value}'. "
                   f"Allowed transitions: {[s.value for s in allowed]}",
        )

    # GFR 2017 — minimum bid count before evaluation
    if new_status == TenderStatusEnum.Evaluated:
        bid_count = db.query(Bid).filter(Bid.tender_id == t.id).count()
        if bid_count < MIN_BIDS_FOR_EVALUATION:
            if not body.justification:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"GFR 2017 requires at least {MIN_BIDS_FOR_EVALUATION} bids. "
                        f"Only {bid_count} received. Provide 'justification' for single/low-bid approval."
                    ),
                )
            # Single-bid approval — log the justification for CVC audit
            audit_log(db, Action.TENDER_STATUS, "Tender", t.id,
                      user_id=current_user.id,
                      details={
                          "from": t.status.value, "to": new_status.value,
                          "single_bid_approval": True, "bid_count": bid_count,
                          "justification": body.justification,
                      },
                      ip_address=get_ip(request))

    if new_status == TenderStatusEnum.Awarded:
        if not body.awardedVendorId:
            raise HTTPException(status_code=400, detail="awardedVendorId is required when awarding")
        t.awarded_vendor_id = body.awardedVendorId

    old_status = t.status.value
    t.status = new_status

    audit_log(db, Action.TENDER_STATUS if new_status != TenderStatusEnum.Awarded else Action.TENDER_AWARD,
              "Tender", t.id,
              user_id=current_user.id,
              details={"from": old_status, "to": new_status.value, "awarded_to": body.awardedVendorId},
              ip_address=get_ip(request))
    db.commit()
    db.refresh(t)

    if new_status == TenderStatusEnum.Awarded:
        winner_id = t.awarded_vendor_id
        all_eligible_ids = [ev.vendor_id for ev in t.eligible_vendors]
        loser_ids = [vid for vid in all_eligible_ids if vid != winner_id]
        tender_info = {
            "id": t.id, "name": t.name, "department": t.department,
            "category": t.category, "estimatedValue": t.estimated_value,
            "endDate": t.end_date.strftime("%d %b %Y") if t.end_date else "—",
        }
        winner_rows = _get_vendor_emails(db, [winner_id]) if winner_id else []
        if winner_rows:
            send_award_winner_notification(
                company_name=winner_rows[0][0], email=winner_rows[0][1],
                tender=tender_info, contract_value=t.estimated_value,
            )
        send_award_regret_notifications(_get_vendor_emails(db, loser_ids), tender_info)

    return _tender_dict(t)


@router.delete("/{tender_id}")
def delete_tender(
    tender_id: str,
    request: Request,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = db.query(Tender).filter(Tender.id == tender_id, Tender.is_deleted == False).first()  # noqa: E712
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")
    if t.status not in (TenderStatusEnum.Draft,):
        raise HTTPException(
            status_code=400,
            detail="Only Draft tenders can be deleted. Published/Closed tenders must follow the cancellation workflow.",
        )

    # Soft delete — record is preserved in DB for audit trail
    t.is_deleted = True
    t.deleted_at = datetime.now(timezone.utc)
    t.deleted_by = current_user.id

    audit_log(db, Action.TENDER_DELETE, "Tender", t.id,
              user_id=current_user.id,
              details={"name": t.name, "status": t.status.value},
              ip_address=get_ip(request))
    db.commit()
    return {"message": "Tender deleted"}
