from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserRegister(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=2, max_length=60)
    phone: Optional[str] = Field(None, max_length=32)
    district_id: str = Field("bogura", alias="districtId")
    area_unit: str = Field("acre", alias="areaUnit")

class UserLogin(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(None, min_length=2, max_length=60)
    phone: Optional[str] = None
    district_id: Optional[str] = Field(None, alias="districtId")
    area_unit: Optional[str] = Field(None, alias="areaUnit")
    weather_alerts: Optional[bool] = Field(None, alias="weatherAlerts")
    simulate_errors: Optional[bool] = Field(None, alias="simulateErrors")
    role: Optional[str] = None

class ProfileOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    name: str
    phone: Optional[str] = None
    district_id: str = Field(..., alias="districtId")
    area_unit: str = Field(..., alias="areaUnit")
    weather_alerts: bool = Field(..., alias="weatherAlerts")
    simulate_errors: bool = Field(..., alias="simulateErrors")

class UserOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str
    email: str
    role: str
    profile: ProfileOut
    created_at: str = Field(..., alias="createdAt")

class Token(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    access_token: str = Field(..., alias="accessToken")
    token_type: str = Field("bearer", alias="tokenType")
    user: UserOut
