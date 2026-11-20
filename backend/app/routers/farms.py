import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.farm import Farm, CropCycle
from app.models.observation import FieldObservation, ActivityLog
from app.schemas.farm import (
    FarmCreate,
    FarmUpdate,
    FarmOut,
    CropCycleCreate,
    CropCycleOut,
)
from app.schemas.observation import ObservationCreate, ObservationOut, LocalizedText
from app.security import get_current_user, get_optional_user

router = APIRouter(prefix="/farms", tags=["Farms"])

DISTRICT_COORDS = {
    "bogura": (24.86, 89.36, "বগুড়া"),
    "munshiganj": (23.53, 90.52, "মুন্সীগঞ্জ"),
    "tangail": (24.27, 89.93, "টাঙ্গাইল"),
    "dinajpur": (25.62, 88.63, "দিনাজপুর"),
    "rangpur": (25.75, 89.25, "রংপুর"),
    "jashore": (23.16, 89.21, "যশোর"),
    "sylhet": (24.89, 91.87, "সিলেট"),
    "rajshahi": (24.37, 88.60, "রাজশাহী"),
    "mymensingh": (24.75, 90.40, "ময়মনসিংহ"),
    "comilla": (23.46, 91.18, "কুমিল্লা"),
    "barishal": (22.70, 90.36, "বরিশাল"),
    "khulna": (22.84, 89.54, "খুলনা"),
    "dhaka": (23.81, 90.41, "ঢাকা"),
    "chittagong": (22.35, 91.78, "চট্টগ্রাম"),
}

SAMPLE_FARMS = [
    {
        "id": "farm_sample_bogura",
        "name": "Aman paddy — east plot",
        "name_bn": "আমন ধান — পূর্বের জমি",
        "crop": "rice",
        "district_id": "bogura",
        "lat": 24.86,
        "lng": 89.36,
        "area_acres": 1.6,
        "planting_date": "2026-07-28",
        "created_at": "2026-07-20T08:00:00.000Z",
        "sample": True
    },
    {
        "id": "farm_sample_munshiganj",
        "name": "Potato — riverside field",
        "name_bn": "আলু — নদীর পাড়ের জমি",
        "crop": "potato",
        "district_id": "munshiganj",
        "lat": 23.53,
        "lng": 90.52,
        "area_acres": 0.9,
        "planting_date": "2026-11-05",
        "created_at": "2026-10-30T08:00:00.000Z",
        "sample": True
    },
    {
        "id": "farm_sample_tangail",
        "name": "Mustard — north block",
        "name_bn": "সরিষা — উত্তরের খণ্ড",
        "crop": "mustard",
        "district_id": "tangail",
        "lat": 24.27,
        "lng": 89.93,
        "area_acres": 1.2,
        "planting_date": "2026-10-22",
        "created_at": "2026-10-18T08:00:00.000Z",
        "sample": True
    }
]

def resolve_farm_coords(farm_id: str, db: Session):
    for sf in SAMPLE_FARMS:
        if sf["id"] == farm_id:
            return sf["lat"], sf["lng"]
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        return 24.86, 89.36
    return farm.lat, farm.lng

def farm_to_out(f: Farm) -> FarmOut:
    return FarmOut(
        id=f.id,
        name=f.name,
        nameBn=f.name_bn,
        crop=f.crop,
        districtId=f.district_id,
        lat=f.lat,
        lng=f.lng,
        areaAcres=f.area_acres,
        plantingDate=f.planting_date,
        notes=f.notes,
        sample=f.sample,
        createdAt=f.created_at.isoformat() if isinstance(f.created_at, datetime) else str(f.created_at)
    )

@router.get("", response_model=List[FarmOut])
def list_farms(
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    if current_user:
        farms = db.query(Farm).filter(Farm.user_id == current_user.id).order_by(Farm.created_at.desc()).all()
        if farms:
            return [farm_to_out(f) for f in farms]
    # Return sample baseline farms
    return [FarmOut(**sf) for sf in SAMPLE_FARMS]

@router.post("", response_model=FarmOut, status_code=status.HTTP_201_CREATED)
def create_farm(
    payload: FarmCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    district_info = DISTRICT_COORDS.get(payload.district_id.lower(), (24.86, 89.36, "বগুড়া"))
    lat, lng, bn_dist = district_info
    
    # Slight micro-offset based on name length so distinct fields don't directly overlap
    offset_lat = ((len(payload.name) % 7) - 3) * 0.015
    offset_lng = ((len(payload.name) % 5) - 2) * 0.015

    farm = Farm(
        id=f"farm_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        name=payload.name,
        name_bn=f"{payload.name} ({bn_dist})",
        crop=payload.crop,
        district_id=payload.district_id,
        lat=round(lat + offset_lat, 4),
        lng=round(lng + offset_lng, 4),
        area_acres=payload.area_acres,
        planting_date=payload.planting_date,
        notes=payload.notes,
        sample=False
    )
    db.add(farm)

    # Initial active crop cycle
    cycle = CropCycle(
        farm_id=farm.id,
        season="aman" if payload.crop == "rice" else "rabi",
        crop=payload.crop,
        start_date=payload.planting_date,
        status="active"
    )
    db.add(cycle)

    # Activity log
    log = ActivityLog(
        user_id=current_user.id,
        farm_id=farm.id,
        kind="farm",
        text_en=f"Added field “{farm.name}”",
        text_bn=f"নতুন জমি যোগ হয়েছে: “{farm.name}”"
    )
    db.add(log)

    db.commit()
    db.refresh(farm)
    return farm_to_out(farm)

@router.get("/{farm_id}", response_model=FarmOut)
def get_farm(
    farm_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    # Check sample farms
    for sf in SAMPLE_FARMS:
        if sf["id"] == farm_id:
            return FarmOut(**sf)

    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")
    if current_user and farm.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return farm_to_out(farm)

@router.patch("/{farm_id}", response_model=FarmOut)
def update_farm(
    farm_id: str,
    payload: FarmUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found or unauthorized")
    
    if payload.name is not None:
        farm.name = payload.name
    if payload.crop is not None:
        farm.crop = payload.crop
    if payload.area_acres is not None:
        farm.area_acres = payload.area_acres
    if payload.planting_date is not None:
        farm.planting_date = payload.planting_date
    if payload.notes is not None:
        farm.notes = payload.notes

    farm.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(farm)
    return farm_to_out(farm)

@router.delete("/{farm_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_farm(
    farm_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        # If it's a sample farm or not found, return clean 204
        return None
    db.delete(farm)
    db.commit()
    return None

@router.get("/{farm_id}/cycles", response_model=List[CropCycleOut])
def get_crop_cycles(farm_id: str, db: Session = Depends(get_db)):
    cycles = db.query(CropCycle).filter(CropCycle.farm_id == farm_id).all()
    if not cycles:
        # Default active cycle
        return [
            CropCycleOut(
                id=f"cycle_{farm_id}",
                farmId=farm_id,
                season="aman",
                crop="rice",
                startDate="2026-07-28",
                endDate="2026-11-25",
                expectedYieldTons=3.8,
                actualYieldTons=None,
                status="active",
                createdAt=datetime.now(timezone.utc).isoformat()
            )
        ]
    return [
        CropCycleOut(
            id=c.id,
            farmId=c.farm_id,
            season=c.season,
            crop=c.crop,
            startDate=c.start_date,
            endDate=c.end_date,
            expectedYieldTons=c.expected_yield_tons,
            actualYieldTons=c.actual_yield_tons,
            status=c.status,
            createdAt=c.created_at.isoformat()
        )
        for c in cycles
    ]

@router.post("/{farm_id}/cycles", response_model=CropCycleOut, status_code=status.HTTP_201_CREATED)
def create_crop_cycle(
    farm_id: str,
    payload: CropCycleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")

    cycle = CropCycle(
        farm_id=farm_id,
        season=payload.season,
        crop=payload.crop,
        start_date=payload.start_date,
        end_date=payload.end_date,
        expected_yield_tons=payload.expected_yield_tons,
        status="active"
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return CropCycleOut(
        id=cycle.id,
        farmId=cycle.farm_id,
        season=cycle.season,
        crop=cycle.crop,
        startDate=cycle.start_date,
        endDate=cycle.end_date,
        expectedYieldTons=cycle.expected_yield_tons,
        actualYieldTons=cycle.actual_yield_tons,
        status=cycle.status,
        createdAt=cycle.created_at.isoformat()
    )

@router.get("/{farm_id}/observations", response_model=List[ObservationOut])
def get_observations(farm_id: str, db: Session = Depends(get_db)):
    obs = db.query(FieldObservation).filter(FieldObservation.farm_id == farm_id).order_by(FieldObservation.created_at.desc()).all()
    if not obs:
        return [
            ObservationOut(
                id="obs_seed_1",
                farmId=farm_id,
                date="2026-11-15",
                kind="scan",
                title=LocalizedText(en="Leaf check completed", bn="পাতার পরীক্ষা সম্পন্ন"),
                detail=LocalizedText(en="Healthy foliage with no active blast sporulation", bn="গাছের পাতা সতেজ ও ব্লাস্টমুক্ত")
            ),
            ObservationOut(
                id="obs_seed_2",
                farmId=farm_id,
                date="2026-11-10",
                kind="weather",
                title=LocalizedText(en="Rain event recorded", bn="বৃষ্টিপাত রেকর্ড"),
                detail=LocalizedText(en="18mm rainfall provided adequate soil moisture", bn="১৮ মিমি বৃষ্টিপাত পর্যাপ্ত মাটির আর্দ্রতা প্রদান করেছে")
            )
        ]
    return [
        ObservationOut(
            id=o.id,
            farmId=o.farm_id,
            date=o.date,
            kind=o.kind,
            title=LocalizedText(en=o.title_en, bn=o.title_bn),
            detail=LocalizedText(en=o.detail_en, bn=o.detail_bn) if o.detail_en else None
        )
        for o in obs
    ]

@router.post("/{farm_id}/observations", response_model=ObservationOut, status_code=status.HTTP_201_CREATED)
def add_observation(
    farm_id: str,
    payload: ObservationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    obs = FieldObservation(
        farm_id=farm_id,
        user_id=current_user.id,
        date=payload.date,
        kind=payload.kind,
        title_en=payload.title_en,
        title_bn=payload.title_bn,
        detail_en=payload.detail_en,
        detail_bn=payload.detail_bn
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    return ObservationOut(
        id=obs.id,
        farmId=obs.farm_id,
        date=obs.date,
        kind=obs.kind,
        title=LocalizedText(en=obs.title_en, bn=obs.title_bn),
        detail=LocalizedText(en=obs.detail_en, bn=obs.detail_bn) if obs.detail_en else None
    )
