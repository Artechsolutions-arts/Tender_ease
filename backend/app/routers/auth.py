import re
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, RefreshToken, PendingVendor, RoleEnum, VerificationStepEnum
from app.core.security import (
    verify_password, hash_password,
    create_access_token, decode_access_token,
    create_refresh_token, create_refresh_token_expiry,
)
from app.core.config import IS_PRODUCTION, JWT_REFRESH_EXPIRES_DAYS
from app.core.deps import get_current_user
from app.services.email_service import send_new_vendor_registration_notification
from app.services.audit_service import log as audit_log, get_ip, Action
from jose import JWTError

router = APIRouter()

# ── Password policy ───────────────────────────────────────────────────────────
_PASSWORD_RULES = [
    (r".{12,}",              "at least 12 characters"),
    (r"[A-Z]",               "at least one uppercase letter"),
    (r"[a-z]",               "at least one lowercase letter"),
    (r"[0-9]",               "at least one digit"),
    (r"[^A-Za-z0-9]",        "at least one special character (!@#$%^&* etc.)"),
]

def _validate_password(value: str) -> str:
    failed = [msg for pattern, msg in _PASSWORD_RULES if not re.search(pattern, value)]
    if failed:
        raise ValueError("Password must contain " + "; ".join(failed))
    return value


# ── Request schemas ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str


class RegisterVendorRequest(BaseModel):
    company: str
    contact: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("company")
    @classmethod
    def company_not_empty(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Company name must be at least 3 characters")
        return v

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return v

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str

    @field_validator("newPassword")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)


class VerificationStepRequest(BaseModel):
    step: str


# ── Helpers ───────────────────────────────────────────────────────────────────

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


# ── Endpoints ─────────────────────────────────────────────────────────────────

_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_MINUTES = 15


@router.post("/login")
def login(request: Request, response: Response, body: LoginRequest, db: Session = Depends(get_db)):
    ip = get_ip(request)
    user = db.query(User).filter(User.email == body.email).first()

    # Brute-force lockout check
    if user and user.locked_until:
        if user.locked_until.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
            remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds() // 60) + 1
            audit_log(db, Action.LOGIN_FAILED, "User", body.email,
                      details={"reason": "account_locked", "email": body.email}, ip_address=ip)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked. Try again in {remaining} minute(s).",
            )
        else:
            user.locked_until = None
            user.failed_login_attempts = 0

    if not user or not verify_password(body.password, user.password_hash):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= _MAX_FAILED_ATTEMPTS:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=_LOCKOUT_MINUTES)
                user.failed_login_attempts = 0
        audit_log(db, Action.LOGIN_FAILED, "User", body.email,
                  details={"email": body.email}, ip_address=ip)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user.failed_login_attempts = 0
    user.locked_until = None

    access_token = create_access_token(user.id, user.email, user.role.value, user.vendor_id)
    raw_refresh = create_refresh_token()
    db.add(RefreshToken(token=raw_refresh, user_id=user.id, expires_at=create_refresh_token_expiry()))

    audit_log(db, Action.LOGIN, "User", user.id,
              user_id=user.id, details={"email": user.email, "role": user.role.value}, ip_address=ip)
    db.commit()

    # Set httpOnly cookie so browser can't read the token via JS (XSS mitigation)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="strict",
        max_age=60 * 60,  # 1 hour in seconds
        path="/api",
    )

    return {"accessToken": access_token, "refreshToken": raw_refresh, "user": _user_dict(user)}


@router.post("/refresh")
def refresh(response: Response, body: RefreshRequest, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter(RefreshToken.token == body.refreshToken).first()
    if not rt or rt.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate refresh token (old one deleted, new one issued)
    db.delete(rt)
    new_refresh = create_refresh_token()
    db.add(RefreshToken(token=new_refresh, user_id=user.id, expires_at=create_refresh_token_expiry()))
    db.commit()

    new_access = create_access_token(user.id, user.email, user.role.value, user.vendor_id)

    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=IS_PRODUCTION,
        samesite="strict",
        max_age=60 * 60,
        path="/api",
    )

    return {"accessToken": new_access, "refreshToken": new_refresh}


@router.post("/logout")
def logout(request: Request, response: Response, body: RefreshRequest, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter(RefreshToken.token == body.refreshToken).first()
    if rt:
        audit_log(db, Action.LOGOUT, "User", rt.user_id,
                  user_id=rt.user_id, ip_address=get_ip(request))
        db.delete(rt)
        db.commit()
    response.delete_cookie(key="access_token", path="/api")
    return {"message": "Logged out"}


@router.post("/logout-all")
def logout_all(request: Request, response: Response, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).delete()
    audit_log(db, Action.LOGOUT, "User", current_user.id,
              user_id=current_user.id, details={"all_sessions": True}, ip_address=get_ip(request))
    db.commit()
    response.delete_cookie(key="access_token", path="/api")
    return {"message": "All sessions terminated"}


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


@router.post("/register-vendor")
def register_vendor(request: Request, body: RegisterVendorRequest, db: Session = Depends(get_db)):
    ip = get_ip(request)
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    if db.query(PendingVendor).filter(PendingVendor.email == body.email).first():
        raise HTTPException(status_code=400, detail="Application already submitted for this email")

    pv = PendingVendor(
        company=body.company.strip(),
        contact=body.contact.strip(),
        email=body.email,
        phone=body.phone,
    )
    db.add(pv)
    db.flush()

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=RoleEnum.VENDOR,
        name=body.contact.strip(),
        organization=body.company.strip(),
        vendor_id=pv.id,
        is_verified=False,
    )
    db.add(user)
    db.flush()

    raw_refresh = create_refresh_token()
    db.add(RefreshToken(token=raw_refresh, user_id=user.id, expires_at=create_refresh_token_expiry()))

    audit_log(db, Action.REGISTER, "User", user.id,
              user_id=user.id,
              details={"email": user.email, "company": body.company},
              ip_address=ip)
    db.commit()

    admin_emails = [u.email for u in db.query(User).filter(User.role == RoleEnum.ADMIN).all()]
    send_new_vendor_registration_notification(
        admin_emails,
        vendor={"company": body.company, "contact": body.contact, "email": body.email, "phone": body.phone},
    )

    access_token = create_access_token(user.id, user.email, user.role.value, user.vendor_id)
    return {"accessToken": access_token, "refreshToken": raw_refresh, "user": _user_dict(user)}


@router.patch("/change-password")
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if body.currentPassword == body.newPassword:
        raise HTTPException(status_code=400, detail="New password must differ from current password")

    current_user.password_hash = hash_password(body.newPassword)
    # Invalidate all existing sessions after password change
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).delete()

    audit_log(db, Action.PASSWORD_CHANGE, "User", current_user.id,
              user_id=current_user.id, ip_address=get_ip(request))
    db.commit()
    return {"message": "Password changed. Please log in again."}


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
