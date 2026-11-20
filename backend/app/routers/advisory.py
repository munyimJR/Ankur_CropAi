from fastapi import APIRouter
from app.schemas.advisory import AdvisoryQuestion, AdvisorReplyOut
from app.services.advisory_service import advisory_service

router = APIRouter(tags=["Farm Advisor"])

@router.post("/advisor/ask", response_model=AdvisorReplyOut)
def ask_advisor(payload: AdvisoryQuestion):
    return advisory_service.answer(
        query=payload.query,
        lang=payload.lang,
        crop=payload.crop or "rice"
    )
