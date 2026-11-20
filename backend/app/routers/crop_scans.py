import os
import uuid
import json
import logging
from typing import Optional, List, Tuple
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from PIL import Image

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.crop_scan import CropScan, ScanFeedback
from app.models.observation import ActivityLog
from app.schemas.crop_scan import (
    CropAnalysisResultOut,
    FeedbackCreate,
    FeedbackOut,
    CropConditionSchema,
    AlternativePrediction,
    ModelMetadataOut,
)
from app.schemas.observation import LocalizedText
from app.security import get_optional_user
from app.services.inference_service import inference_engine

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Crop Guardian Diagnostics"])

def validate_and_save_upload(file: UploadFile) -> Tuple[Path, str, int]:
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type '{file.content_type}'. Must be JPEG, PNG, or WebP."
        )
    # Check extension
    ext = Path(file.filename or "image.jpg").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"

    unique_name = f"{uuid.uuid4().hex}{ext}"
    saved_path = settings.UPLOAD_DIR / unique_name

    # Read bytes and check size
    contents = file.file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )
    if len(contents) > settings.MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_IMAGE_SIZE_BYTES // (1024*1024)} MB"
        )

    # Save to disk
    with open(saved_path, "wb") as f:
        f.write(contents)

    # Safe image verification with PIL
    try:
        with Image.open(saved_path) as img:
            img.verify()
    except Exception:
        if saved_path.exists():
            os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image file"
        )

    return saved_path, file.filename or unique_name, len(contents)

@router.post("/crop-scans", response_model=CropAnalysisResultOut)
@router.post("/vision/analyze", response_model=CropAnalysisResultOut)
def analyze_crop_scan(
    image: UploadFile = File(...),
    crop: str = Form("rice"),
    farm_id: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    saved_path, orig_name, file_size = validate_and_save_upload(image)
    
    try:
        result = inference_engine.predict(saved_path, crop=crop, farm_id=farm_id)
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference engine failure: {str(e)}"
        )

    # Persist in database
    scan_record = CropScan(
        id=result.id,
        user_id=current_user.id if current_user else None,
        farm_id=farm_id,
        crop=crop,
        image_path=str(saved_path.relative_to(settings.BASE_DIR)),
        original_filename=orig_name,
        file_size_bytes=file_size,
        predicted_class=result.condition.name.en,
        predicted_class_bn=result.condition.name.bn,
        condition_id=result.condition.id,
        category=result.condition.category,
        confidence=result.sampleConfidence,
        severity=result.severity,
        guidance_json=json.dumps([g.model_dump() for g in result.guidance], ensure_ascii=False),
        alternatives_json=json.dumps([a.model_dump() for a in result.alternatives], ensure_ascii=False),
        supported_classes_json=json.dumps([s.model_dump() for s in result.supportedClasses], ensure_ascii=False),
        model_name=result.model.name,
        model_version=result.model.version,
        is_demo=False,
        safety_notice=result.safetyNotice
    )
    db.add(scan_record)

    if current_user:
        log = ActivityLog(
            user_id=current_user.id,
            farm_id=farm_id,
            kind="scan",
            text_en=f"Crop check: {result.condition.name.en}",
            text_bn=f"ফসল যাচাই: {result.condition.name.bn}"
        )
        db.add(log)

    db.commit()
    return result

@router.get("/crop-scans/{scan_id}", response_model=CropAnalysisResultOut)
def get_crop_scan(scan_id: str, db: Session = Depends(get_db)):
    scan = db.query(CropScan).filter(CropScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan record not found")

    guidance = [LocalizedText(**g) for g in json.loads(scan.guidance_json)]
    alternatives = [AlternativePrediction(**a) for a in json.loads(scan.alternatives_json)]
    supported = [LocalizedText(**s) for s in json.loads(scan.supported_classes_json)]

    return CropAnalysisResultOut(
        id=scan.id,
        crop=scan.crop,
        condition=CropConditionSchema(
            id=scan.condition_id,
            name=LocalizedText(en=scan.predicted_class, bn=scan.predicted_class_bn),
            category=scan.category
        ),
        sampleConfidence=scan.confidence,
        alternatives=alternatives,
        severity=scan.severity,
        guidance=guidance,
        supportedClasses=supported,
        model=ModelMetadataOut(name=scan.model_name, version=scan.model_version, mode="api"),
        analyzedAt=scan.created_at.isoformat(),
        isDemo=scan.is_demo,
        safetyNotice=scan.safety_notice,
        lowConfidence=(scan.confidence < 0.40)
    )

@router.get("/farms/{farm_id}/crop-scans", response_model=List[CropAnalysisResultOut])
def get_farm_scans(farm_id: str, db: Session = Depends(get_db)):
    scans = db.query(CropScan).filter(CropScan.farm_id == farm_id).order_by(CropScan.created_at.desc()).limit(20).all()
    results = []
    for scan in scans:
        guidance = [LocalizedText(**g) for g in json.loads(scan.guidance_json)]
        alternatives = [AlternativePrediction(**a) for a in json.loads(scan.alternatives_json)]
        supported = [LocalizedText(**s) for s in json.loads(scan.supported_classes_json)]
        results.append(
            CropAnalysisResultOut(
                id=scan.id,
                crop=scan.crop,
                condition=CropConditionSchema(
                    id=scan.condition_id,
                    name=LocalizedText(en=scan.predicted_class, bn=scan.predicted_class_bn),
                    category=scan.category
                ),
                sampleConfidence=scan.confidence,
                alternatives=alternatives,
                severity=scan.severity,
                guidance=guidance,
                supportedClasses=supported,
                model=ModelMetadataOut(name=scan.model_name, version=scan.model_version, mode="api"),
                analyzedAt=scan.created_at.isoformat(),
                isDemo=scan.is_demo,
                safetyNotice=scan.safety_notice,
                lowConfidence=(scan.confidence < 0.40)
            )
        )
    return results

@router.post("/crop-scans/{scan_id}/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    scan_id: str,
    payload: FeedbackCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    scan = db.query(CropScan).filter(CropScan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan record not found")

    fb = ScanFeedback(
        scan_id=scan_id,
        user_id=current_user.id if current_user else None,
        is_accurate=payload.is_accurate,
        farmer_notes=payload.farmer_notes
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return FeedbackOut(
        id=fb.id,
        scanId=fb.scan_id,
        isAccurate=fb.is_accurate,
        farmerNotes=fb.farmer_notes,
        createdAt=fb.created_at.isoformat()
    )
