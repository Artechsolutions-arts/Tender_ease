from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, RefreshToken, PendingVendor, RoleEnum, VerificationStepEnum
from app.core.security import (
    verify_password, hash_password,
    create_access_token, decode_access_token,
    create_refresh_token, create_refresh_token_expiry,
)
from app.core.deps import get_current_user
from app.services.email_service import send_new_vendor_registration_notification
from jose import JWTError

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str


class RegisterVendorRequest(BaseModel):
    company: str
    contact: str
    email: str
    phone: str


class VerificationStepRequest(BaseModel):
    step: str


def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "organization": user.organization,
        "vendorId": user.vendor_id,
        "isVerified": user.is_verified,
        "verificationStep": user.verification_step.value if user.verification_step else None,
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    access_token = create_access_token(user.id, user.email, user.role.value, user.vendor_id)
    raw_refresh = create_refresh_token()
    db.add(RefreshToken(token=raw_refresh, user_id=user.id, expires_at=create_refresh_token_expiry()))
    db.commit()

    return {"accessToken": access_token, "refreshToken": raw_refresh, "user": _user_dict(user)}


@router.post("/refresh")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter(RefreshToken.token == body.refreshToken).first()
    if not rt or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate refresh token
    db.delete(rt)
    new_refresh = create_refresh_token()
    db.add(RefreshToken(token=new_refresh, user_id=user.id, expires_at=create_refresh_token_expiry()))
    db.commit()

    return {
        "accessToken": create_access_token(user.id, user.email, user.role.value, user.vendor_id),
        "refreshToken": new_refresh,
    }


@router.post("/logout")
def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    db.query(RefreshToken).filter(RefreshToken.token == body.refreshToken).delete()
    db.commit()
    return {"message": "Logged out"}


@router.post("/logout-all")
def logout_all(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).delete()
    db.commit()
    return {"message": "All sessions terminated"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


@router.post("/register-vendor")
def register_vendor(body: RegisterVendorRequest, db: Session = Depends(get_db)):
    existing = db.query(PendingVendor).filter(PendingVendor.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Application already submitted for this email")
    pv = PendingVendor(company=body.company, contact=body.contact, email=body.email, phone=body.phone)
    db.add(pv)
    db.commit()

    # Notify all admin users by email (background, non-blocking)
    admin_emails = [u.email for u in db.query(User).filter(User.role == RoleEnum.ADMIN).all()]
    send_new_vendor_registration_notification(
        admin_emails,
        vendor={"company": body.company, "contact": body.contact, "email": body.email, "phone": body.phone},
    )

    return {"id": pv.id, "message": "Application submitted. You will be contacted for verification."}


@router.patch("/verification-step")
def update_verification_step(
    body: VerificationStepRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        current_user.verification_step = VerificationStepEnum(body.step)
        db.commit()
        return _user_dict(current_user)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid step: {body.step}")
