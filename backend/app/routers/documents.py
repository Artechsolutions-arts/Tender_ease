import os
import uuid
import threading
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import VendorDocument, DocumentValidation, Vendor, User, RoleEnum
from app.models import OcrStatusEnum, ValidationStatusEnum, DocTypeEnum, OfficerDecisionEnum
from app.core.deps import get_current_user, require_admin
from app.core.config import UPLOADS_DIR
from app.services.ocr_service import extract_text, allowed_mime
from app.services.document_ai_service import validate_document

router = APIRouter()

os.makedirs(UPLOADS_DIR, exist_ok=True)

STATUS_MAP = {
    "APPROVED": ValidationStatusEnum.OFFICER_APPROVED,
    "REJECTED": ValidationStatusEnum.OFFICER_REJECTED,
    "NEEDS_MORE_INFO": ValidationStatusEnum.NEEDS_MORE_INFO,
}


def _doc_dict(d: VendorDocument) -> dict:
    v = d.validation
    return {
        "id": d.id,
        "uploadedBy": d.uploaded_by,
        "uploader": {"name": d.uploader.name, "email": d.uploader.email} if d.uploader else None,
        "vendorId": d.vendor_id,
        "tenderId": d.tender_id,
        "fileName": d.file_name,
        "originalName": d.original_name,
        "mimeType": d.mime_type,
        "fileSize": d.file_size,
        "filePath": d.file_path,
        "docType": d.doc_type.value,
        "ocrText": d.ocr_text,
        "ocrStatus": d.ocr_status.value,
        "ocrError": d.ocr_error,
        "validation": _val_dict(v) if v else None,
        "createdAt": d.created_at.isoformat() if d.created_at else None,
        "updatedAt": d.updated_at.isoformat() if d.updated_at else None,
    }


def _val_dict(v: DocumentValidation) -> dict:
    return {
        "id": v.id,
        "documentId": v.document_id,
        "aiScore": v.ai_score,
        "aiRating": v.ai_rating,
        "aiFindings": v.ai_findings,
        "aiSummary": v.ai_summary,
        "aiFlagged": v.ai_flagged,
        "officerUserId": v.officer_user_id,
        "officerUser": {"name": v.officer_user.name, "email": v.officer_user.email} if v.officer_user else None,
        "officerDecision": v.officer_decision.value if v.officer_decision else None,
        "officerRemarks": v.officer_remarks,
        "officerReviewedAt": v.officer_reviewed_at.isoformat() if v.officer_reviewed_at else None,
        "status": v.status.value,
        "createdAt": v.created_at.isoformat() if v.created_at else None,
        "updatedAt": v.updated_at.isoformat() if v.updated_at else None,
    }


def _process_document(doc_id: str):
    """Run OCR + AI validation in a background thread."""
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
        if not doc:
            return

        doc.ocr_status = OcrStatusEnum.PROCESSING
        db.commit()

        ocr_text = extract_text(doc.file_path, doc.mime_type)
        doc.ocr_text = ocr_text
        doc.ocr_status = OcrStatusEnum.COMPLETED
        db.commit()

        # Vendor context for cross-checking
        vendor_ctx = None
        if doc.vendor_id:
            v = db.query(Vendor).filter(Vendor.id == doc.vendor_id).first()
            if v:
                vendor_ctx = {"company_name": v.company_name, "gst": v.gst, "pan": v.pan}

        result = validate_document(ocr_text, doc.doc_type.value, doc.original_name, vendor_ctx)

        db.add(DocumentValidation(
            document_id=doc_id,
            ai_score=result["score"],
            ai_rating=result["rating"],
            ai_findings=result.get("findings", []),
            ai_summary=result.get("summary", ""),
            ai_flagged=result.get("flagged", False),
            status=ValidationStatusEnum.AI_REVIEWED,
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        try:
            doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
            if doc:
                doc.ocr_status = OcrStatusEnum.FAILED
                doc.ocr_error = str(e)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    docType: str = Form("OTHER"),
    vendorId: str = Form(None),
    tenderId: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not allowed_mime(file.content_type):
        raise HTTPException(status_code=400, detail="Only PDF, PNG, JPG, JPEG, WEBP allowed.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit.")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".bin"
    file_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(UPLOADS_DIR, file_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        doc_type_enum = DocTypeEnum(docType)
    except ValueError:
        doc_type_enum = DocTypeEnum.OTHER

    doc = VendorDocument(
        uploaded_by=current_user.id,
        vendor_id=vendorId,
        tender_id=tenderId,
        file_name=file_name,
        original_name=file.filename or file_name,
        mime_type=file.content_type,
        file_size=len(contents),
        file_path=file_path,
        doc_type=doc_type_enum,
        ocr_status=OcrStatusEnum.PENDING,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Background OCR + AI — non-blocking
    threading.Thread(target=_process_document, args=(doc.id,), daemon=True).start()

    return _doc_dict(doc)


@router.get("")
def list_documents(
    vendorId: str = Query(None),
    status: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(VendorDocument)

    if current_user.role != RoleEnum.ADMIN:
        q = q.filter(VendorDocument.uploaded_by == current_user.id)
    elif vendorId:
        q = q.filter(VendorDocument.vendor_id == vendorId)

    total = q.count()
    docs = q.order_by(VendorDocument.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"docs": [_doc_dict(d) for d in docs], "total": total, "page": page, "limit": limit}


@router.get("/{doc_id}")
def get_document(doc_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role != RoleEnum.ADMIN and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return _doc_dict(doc)


@router.post("/{doc_id}/retry")
def retry_document(doc_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.query(DocumentValidation).filter(DocumentValidation.document_id == doc_id).delete()
    doc.ocr_status = OcrStatusEnum.PENDING
    doc.ocr_text = None
    doc.ocr_error = None
    db.commit()
    threading.Thread(target=_process_document, args=(doc_id,), daemon=True).start()
    return {"message": "Reprocessing started"}


@router.patch("/{doc_id}/review")
def review_document(
    doc_id: str,
    body: dict,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    decision = body.get("decision")
    if decision not in ("APPROVED", "REJECTED", "NEEDS_MORE_INFO"):
        raise HTTPException(status_code=400, detail="decision must be APPROVED, REJECTED, or NEEDS_MORE_INFO")

    doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    val = db.query(DocumentValidation).filter(DocumentValidation.document_id == doc_id).first()
    if not val:
        raise HTTPException(status_code=400, detail="Document not yet AI-validated")

    val.officer_user_id = current_user.id
    val.officer_decision = OfficerDecisionEnum(decision)
    val.officer_remarks = body.get("remarks")
    val.officer_reviewed_at = datetime.now(timezone.utc)
    val.status = STATUS_MAP[decision]
    db.commit()
    db.refresh(val)
    return _val_dict(val)


@router.delete("/{doc_id}")
def delete_document(doc_id: str, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    doc = db.query(VendorDocument).filter(VendorDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        os.remove(doc.file_path)
    except OSError:
        pass
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
