from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
import bcrypt as _bcrypt
from jose import jwt, JWTError
from app.core.config import JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_MINUTES, JWT_REFRESH_EXPIRES_DAYS

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str, vendor_id: Optional[str] = None) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MINUTES)
    payload = {"id": user_id, "email": email, "role": role, "vendorId": vendor_id, "exp": exp}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])


def create_refresh_token() -> str:
    return str(uuid.uuid4())


def create_refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRES_DAYS)
