import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum, UniqueConstraint, CheckConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


def _now():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


# ── Enums ─────────────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    VENDOR = "VENDOR"


class TenderStatusEnum(str, enum.Enum):
    Draft = "Draft"
    Published = "Published"
    Closed = "Closed"
    Evaluated = "Evaluated"
    Awarded = "Awarded"


class NotificationTypeEnum(str, enum.Enum):
    tender_created = "tender_created"
    tender_updated = "tender_updated"
    bid_submitted = "bid_submitted"
    tender_awarded = "tender_awarded"
    info = "info"


class VerificationStepEnum(str, enum.Enum):
    STEP_1 = "STEP_1"
    STEP_2 = "STEP_2"
    STEP_3 = "STEP_3"
    STEP_4 = "STEP_4"
    STEP_5 = "STEP_5"
    COMPLETED = "COMPLETED"


class DocTypeEnum(str, enum.Enum):
    GST_CERTIFICATE = "GST_CERTIFICATE"
    PAN_CARD = "PAN_CARD"
    AADHAAR_CARD = "AADHAAR_CARD"
    COMPANY_REGISTRATION = "COMPANY_REGISTRATION"
    EXPERIENCE_CERTIFICATE = "EXPERIENCE_CERTIFICATE"
    FINANCIAL_STATEMENT = "FINANCIAL_STATEMENT"
    BANK_STATEMENT = "BANK_STATEMENT"
    BANK_GUARANTEE = "BANK_GUARANTEE"
    BID_DOCUMENT = "BID_DOCUMENT"
    TENDER_DOCUMENT = "TENDER_DOCUMENT"
    OTHER = "OTHER"


class OcrStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ValidationStatusEnum(str, enum.Enum):
    PENDING_OCR = "PENDING_OCR"
    OCR_COMPLETE = "OCR_COMPLETE"
    AI_REVIEWED = "AI_REVIEWED"
    OFFICER_APPROVED = "OFFICER_APPROVED"
    OFFICER_REJECTED = "OFFICER_REJECTED"
    NEEDS_MORE_INFO = "NEEDS_MORE_INFO"


class OfficerDecisionEnum(str, enum.Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_MORE_INFO = "NEEDS_MORE_INFO"


# ── Models ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False, default=RoleEnum.VENDOR)
    organization = Column(String, nullable=False, default="")
    vendor_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_step = Column(SAEnum(VerificationStepEnum), nullable=True, default=VerificationStepEnum.STEP_1)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    uploaded_docs = relationship("VendorDocument", back_populates="uploader", foreign_keys="VendorDocument.uploaded_by")
    reviewed_docs = relationship("DocumentValidation", back_populates="officer_user", foreign_keys="DocumentValidation.officer_user_id")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=_uuid)
    token = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)

    user = relationship("User", back_populates="refresh_tokens")


class Tender(Base):
    __tablename__ = "tenders"
    __table_args__ = (
        CheckConstraint("estimated_value > 0", name="ck_tender_value_positive"),
        CheckConstraint("end_date > start_date",  name="ck_tender_dates_valid"),
    )

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    estimated_value = Column(Float, nullable=False)
    category = Column(String, nullable=False, index=True)
    department = Column(String, nullable=False, index=True)
    status = Column(SAEnum(TenderStatusEnum), nullable=False, default=TenderStatusEnum.Draft, index=True)
    awarded_vendor_id = Column(String, nullable=True)
    created_by = Column(String, nullable=False)
    # Soft-delete — record preserved for audit trail even after "deletion"
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    deleted_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    documents = relationship("TenderDocument", back_populates="tender", cascade="all, delete-orphan")
    eligible_vendors = relationship("TenderEligibleVendor", back_populates="tender", cascade="all, delete-orphan")
    history = relationship("TenderHistory", back_populates="tender", cascade="all, delete-orphan")
    bids = relationship("Bid", back_populates="tender")
    ai_validations = relationship("AiValidation", back_populates="tender", cascade="all, delete-orphan")
    addenda = relationship("TenderAddendum", back_populates="tender", cascade="all, delete-orphan")


class TenderDocument(Base):
    __tablename__ = "tender_documents"

    id = Column(String, primary_key=True, default=_uuid)
    tender_id = Column(String, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    url = Column(String, default="")
    size = Column(String, nullable=False)

    tender = relationship("Tender", back_populates="documents")


class TenderEligibleVendor(Base):
    __tablename__ = "tender_eligible_vendors"

    tender_id = Column(String, ForeignKey("tenders.id", ondelete="CASCADE"), primary_key=True)
    vendor_id = Column(String, primary_key=True, index=True)

    tender = relationship("Tender", back_populates="eligible_vendors")


class TenderHistory(Base):
    __tablename__ = "tender_history"

    id = Column(String, primary_key=True, default=_uuid)
    tender_id = Column(String, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    edited_at = Column(DateTime(timezone=True), default=_now)
    edited_by = Column(String, nullable=False)
    changes = Column(Text, nullable=False)
    snapshot = Column(JSON, nullable=False)

    tender = relationship("Tender", back_populates="history")


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String, primary_key=True)
    company_name = Column(String, nullable=False)
    contact_person = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    gst = Column(String, nullable=False)
    pan = Column(String, nullable=False)
    registered_on = Column(DateTime(timezone=True), default=_now)
    past_performance = Column(Integer, default=100)
    completed_tenders = Column(Integer, default=0)
    blacklisted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    bids = relationship("Bid", back_populates="vendor")


class PendingVendor(Base):
    __tablename__ = "pending_vendors"

    id = Column(String, primary_key=True, default=_uuid)
    company = Column(String, nullable=False)
    contact = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    submitted_on = Column(DateTime(timezone=True), default=_now)
    status = Column(String, default="Pending Review", index=True)


class Bid(Base):
    __tablename__ = "bids"
    __table_args__ = (
        UniqueConstraint("tender_id", "vendor_id"),
        CheckConstraint("amount > 0", name="ck_bid_amount_positive"),
    )

    id = Column(String, primary_key=True, default=_uuid)
    tender_id = Column(String, ForeignKey("tenders.id"), nullable=False, index=True)
    vendor_id = Column(String, ForeignKey("vendors.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    documents = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    status = Column(String, default="Submitted")
    submitted_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    tender = relationship("Tender", back_populates="bids")
    vendor = relationship("Vendor", back_populates="bids")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    type = Column(SAEnum(NotificationTypeEnum), default=NotificationTypeEnum.info)
    audience = Column(String, nullable=False)
    target_role = Column(String, nullable=True, index=True)
    target_vendor_ids = Column(JSON, default=list)
    channels = Column(JSON, default=lambda: ["in_app"])
    read = Column(Boolean, default=False, index=True)
    related_tender_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)


class AiValidation(Base):
    __tablename__ = "ai_validations"

    id = Column(String, primary_key=True, default=_uuid)
    tender_id = Column(String, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    validation_type = Column(String, nullable=False)
    result = Column(JSON, nullable=False)
    score = Column(Integer, nullable=True)
    risk_level = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)

    tender = relationship("Tender", back_populates="ai_validations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details = Column(JSON, nullable=False)
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now, index=True)

    user = relationship("User", back_populates="audit_logs")


class VendorDocument(Base):
    __tablename__ = "vendor_documents"

    id = Column(String, primary_key=True, default=_uuid)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    vendor_id = Column(String, nullable=True, index=True)
    tender_id = Column(String, nullable=True)
    file_name = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    doc_type = Column(SAEnum(DocTypeEnum), default=DocTypeEnum.OTHER)
    seaweed_fid = Column(String, nullable=True)
    seaweed_url = Column(String, nullable=True)
    ocr_text = Column(Text, nullable=True)
    ocr_status = Column(SAEnum(OcrStatusEnum), default=OcrStatusEnum.PENDING)
    ocr_error = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    uploader = relationship("User", back_populates="uploaded_docs", foreign_keys=[uploaded_by])
    validation = relationship("DocumentValidation", back_populates="document", uselist=False, cascade="all, delete-orphan")


class DocumentValidation(Base):
    __tablename__ = "document_validations"

    id = Column(String, primary_key=True, default=_uuid)
    document_id = Column(String, ForeignKey("vendor_documents.id", ondelete="CASCADE"), unique=True, nullable=False)
    ai_score = Column(Float, nullable=False)
    ai_rating = Column(String, nullable=False)
    ai_findings = Column(JSON, nullable=False)
    ai_summary = Column(Text, nullable=False)
    ai_flagged = Column(Boolean, default=False)
    ai_extracted_fields = Column(JSON, nullable=True)
    ai_detected_type = Column(String, nullable=True)
    officer_user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    officer_decision = Column(SAEnum(OfficerDecisionEnum), nullable=True)
    officer_remarks = Column(Text, nullable=True)
    officer_reviewed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(SAEnum(ValidationStatusEnum), default=ValidationStatusEnum.AI_REVIEWED)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)

    document = relationship("VendorDocument", back_populates="validation")
    officer_user = relationship("User", back_populates="reviewed_docs", foreign_keys=[officer_user_id])


# ── GFR 2017 Compliance Models ────────────────────────────────────────────────

class EMDStatusEnum(str, enum.Enum):
    SUBMITTED  = "SUBMITTED"
    VERIFIED   = "VERIFIED"
    REFUNDED   = "REFUNDED"
    FORFEITED  = "FORFEITED"


class EMDSubmission(Base):
    """Earnest Money Deposit — GFR 2017 Section 6.2.
    Each bid must be backed by an EMD; tracked here for refund/forfeiture audit.
    """
    __tablename__ = "emd_submissions"

    id              = Column(String, primary_key=True, default=_uuid)
    bid_id          = Column(String, ForeignKey("bids.id", ondelete="CASCADE"), unique=True, nullable=False)
    tender_id       = Column(String, ForeignKey("tenders.id"), nullable=False, index=True)
    vendor_id       = Column(String, ForeignKey("vendors.id"), nullable=False, index=True)
    amount          = Column(Float, nullable=False)
    bank_name       = Column(String, nullable=False)
    guarantee_number = Column(String, unique=True, nullable=False)
    guarantee_date  = Column(DateTime(timezone=True), nullable=False)
    valid_upto      = Column(DateTime(timezone=True), nullable=False)
    status          = Column(SAEnum(EMDStatusEnum), default=EMDStatusEnum.SUBMITTED, nullable=False, index=True)
    refund_date     = Column(DateTime(timezone=True), nullable=True)
    forfeiture_reason = Column(Text, nullable=True)
    recorded_by     = Column(String, ForeignKey("users.id"), nullable=False)
    created_at      = Column(DateTime(timezone=True), default=_now)
    updated_at      = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class TenderAddendum(Base):
    """Corrigendum / Addendum — GFR 2017 requires all pre-bid amendments to be documented.
    Each addendum gets an immutable record with amendment number and issuing officer.
    """
    __tablename__ = "tender_addenda"

    id               = Column(String, primary_key=True, default=_uuid)
    tender_id        = Column(String, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    amendment_number = Column(Integer, nullable=False)
    title            = Column(String, nullable=False)
    description      = Column(Text, nullable=False)
    affects_dates    = Column(Boolean, default=False)
    new_end_date     = Column(DateTime(timezone=True), nullable=True)
    issued_by        = Column(String, ForeignKey("users.id"), nullable=False)
    issued_on        = Column(DateTime(timezone=True), default=_now, nullable=False)
    created_at       = Column(DateTime(timezone=True), default=_now)

    tender    = relationship("Tender", back_populates="addenda")
    __table_args__ = (UniqueConstraint("tender_id", "amendment_number", name="uq_addendum_number"),)


class TECMember(Base):
    """Tender Evaluation Committee member — GFR 2017 mandates documented TEC for evaluation.
    Members are named officers with designation; their individual scoring is recorded in BidTechnicalScore.
    """
    __tablename__ = "tec_members"

    id           = Column(String, primary_key=True, default=_uuid)
    tender_id    = Column(String, ForeignKey("tenders.id", ondelete="CASCADE"), nullable=False, index=True)
    member_name  = Column(String, nullable=False)
    designation  = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    is_chair     = Column(Boolean, default=False)
    appointed_by = Column(String, ForeignKey("users.id"), nullable=False)
    appointed_on = Column(DateTime(timezone=True), default=_now)
    created_at   = Column(DateTime(timezone=True), default=_now)


class BidTechnicalScore(Base):
    """Individual technical evaluation score given by a TEC member for a specific bid.
    Separate from financial (L1) scoring — enables two-envelope evaluation per GFR 2017.
    """
    __tablename__ = "bid_technical_scores"

    id              = Column(String, primary_key=True, default=_uuid)
    bid_id          = Column(String, ForeignKey("bids.id", ondelete="CASCADE"), nullable=False, index=True)
    tec_member_id   = Column(String, ForeignKey("tec_members.id"), nullable=False)
    technical_score = Column(Float, nullable=False)
    criteria_scores = Column(JSON, nullable=True)  # {criterion: score} breakdown
    remarks         = Column(Text, nullable=True)
    scored_at       = Column(DateTime(timezone=True), default=_now)
    created_at      = Column(DateTime(timezone=True), default=_now)
    __table_args__  = (
        UniqueConstraint("bid_id", "tec_member_id", name="uq_tec_bid_score"),
        CheckConstraint("technical_score >= 0 AND technical_score <= 100", name="ck_tech_score_range"),
    )
