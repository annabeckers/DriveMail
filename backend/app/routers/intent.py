from fastapi import APIRouter, HTTPException
from models.intent import IntentInput
from services.llm import call_llm

router = APIRouter(prefix="/intent")


@router.post("/find_user_intent")
async def find_user_intent(data: IntentInput):
    try:
        return await call_llm(data.data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
