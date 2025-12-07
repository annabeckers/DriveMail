import os
import google.generativeai as genai
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
from sqlmodel import Session
from ..database import get_session
from ..services.llm_service import LLMService

load_dotenv()

router = APIRouter()

from ..schemas.ai import AIRequest, IntentRequest

@router.post("/generate")
def generate_text(request: AIRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        response = model.generate_content(request.prompt)
        
        return {"result": response.text}
        
    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini Error: {str(e)}")

@router.post("/process_intent")
def process_intent(request: IntentRequest, session: Session = Depends(get_session)):
    llm_service = LLMService(session)
    return llm_service.process_message(request.text, request.user_id)

