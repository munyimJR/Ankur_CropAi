from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserOut, ProfileUpdate
from app.security import get_current_user
from app.routers.auth import get_me, update_me

router = APIRouter(tags=["User Profile"])

@router.get("/me", response_model=UserOut)
def api_get_me(current_user: User = Depends(get_current_user)):
    return get_me(current_user)

@router.patch("/me", response_model=UserOut)
def api_update_me(payload: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_me(payload, current_user, db)
