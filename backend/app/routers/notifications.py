from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Notification, User, RoleEnum
from app.core.deps import get_current_user
from app.services.audit_service import log as audit_log, get_ip

router = APIRouter()


def _notif_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "title": n.title,
        "body": n.body,
        "type": n.type.value,
        "audience": n.audience,
        "targetRole": n.target_role,
        "targetVendorIds": n.target_vendor_ids or [],
        "channels": n.channels or ["in_app"],
        "read": n.read,
        "relatedTenderId": n.related_tender_id,
        "createdAt": n.created_at.isoformat() if n.created_at else None,
    }


def _visible(n: Notification, user: User) -> bool:
    if n.target_role and n.target_role != user.role.value:
        return False
    if user.role == RoleEnum.VENDOR and n.target_vendor_ids:
        return user.vendor_id in (n.target_vendor_ids or [])
    return True


@router.get("")
def list_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_notifs = db.query(Notification).order_by(Notification.created_at.desc()).all()
    visible = [n for n in all_notifs if _visible(n, current_user)]
    return {"notifications": [_notif_dict(n) for n in visible], "total": len(visible)}


@router.get("/unread-count")
def unread_count(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    all_notifs = db.query(Notification).filter(Notification.read == False).all()
    count = sum(1 for n in all_notifs if _visible(n, current_user))
    return {"count": count}


@router.patch("/{notif_id}/read")
def mark_read(
    request: Request,
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(Notification.id == notif_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    audit_log(db, "NOTIFICATION_READ", "Notification", notif_id,
              user_id=current_user.id, ip_address=get_ip(request))
    db.commit()
    return _notif_dict(n)


@router.patch("/read-all")
def mark_all_read(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    all_notifs = db.query(Notification).filter(Notification.read == False).all()  # noqa: E712
    count = 0
    for n in all_notifs:
        if _visible(n, current_user):
            n.read = True
            count += 1
    audit_log(db, "NOTIFICATION_READ_ALL", "Notification", "bulk",
              user_id=current_user.id,
              details={"count": count},
              ip_address=get_ip(request))
    db.commit()
    return {"message": "All notifications marked as read"}
