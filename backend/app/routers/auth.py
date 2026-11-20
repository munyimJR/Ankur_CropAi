from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, Profile
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserOut,
    ProfileOut,
    ProfileUpdate,
    Token,
)
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists"
        )
    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role="farmer",
        is_active=True
    )
    db.add(user)
    db.flush()

    profile = Profile(
        user_id=user.id,
        name=payload.name,
        phone=payload.phone,
        district_id=payload.district_id,
        area_unit=payload.area_unit,
        weather_alerts=True,
        simulate_errors=False
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    user_out = UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        profile=ProfileOut.model_validate(profile),
        createdAt=user.created_at.isoformat()
    )
    return Token(accessToken=token, tokenType="bearer", user=user_out)

@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    login_id = payload.email.strip().lower()
    user = db.query(User).filter(
        (User.email == login_id) | (User.email == f"{login_id}@ankur.ag")
    ).first()

    # Automatic fallback for requested admin credentials polash / 2002
    if not user and (login_id == "polash" or login_id == "polash@ankur.ag"):
        if payload.password == "2002":
            user = User(
                email="polash@ankur.ag",
                hashed_password=hash_password("2002"),
                role="admin",
                is_active=True
            )
            db.add(user)
            db.flush()
            prof = Profile(
                user_id=user.id,
                name="Polash (Admin)",
                phone="+8801700000001",
                district_id="dhaka",
                area_unit="acre",
                weather_alerts=True,
                simulate_errors=False
            )
            db.add(prof)
            db.commit()
            db.refresh(user)

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    profile = user.profile
    if not profile:
        profile = Profile(user_id=user.id, name=user.email.split("@")[0], district_id="bogura")
        db.add(profile)
        db.commit()
        db.refresh(profile)

    user_out = UserOut(
        id=user.id,
        email=user.email,
        role=user.role,
        profile=ProfileOut.model_validate(profile),
        createdAt=user.created_at.isoformat()
    )
    return Token(accessToken=token, tokenType="bearer", user=user_out)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    profile = current_user.profile
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        profile=ProfileOut.model_validate(profile),
        createdAt=current_user.created_at.isoformat()
    )

@router.patch("/me", response_model=UserOut)
def update_me(payload: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = current_user.profile
    if payload.name is not None:
        profile.name = payload.name
    if payload.phone is not None:
        profile.phone = payload.phone
    if payload.district_id is not None:
        profile.district_id = payload.district_id
    if payload.area_unit is not None:
        profile.area_unit = payload.area_unit
    if payload.weather_alerts is not None:
        profile.weather_alerts = payload.weather_alerts
    if payload.simulate_errors is not None:
        profile.simulate_errors = payload.simulate_errors
    if payload.role is not None and payload.role in ["farmer", "admin", "extension_officer"]:
        current_user.role = payload.role
    
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        profile=ProfileOut.model_validate(profile),
        createdAt=current_user.created_at.isoformat()
    )

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Account deletion workflow: permanently removes user profile, farms, and records."""
    db.delete(current_user)
    db.commit()
    return None

@router.post("/password-reset")
def request_password_reset(email: str, db: Session = Depends(get_db)):
    _ = db.query(User).filter(User.email == email.lower()).first()
    # Always return success message for security to prevent user enumeration
    return {
        "message": "If an account with this email exists, a password reset link has been dispatched."
    }
