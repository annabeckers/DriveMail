import os
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from sqlmodel import Session, select
from ..database import get_session
from ..models import User, Conversation, Message
from datetime import datetime

load_dotenv()

router = APIRouter()

class AIRequest(BaseModel):
    prompt: str

class IntentRequest(BaseModel):
    text: str
    user_id: int

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
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    # 1. Load Intent Schema
    try:
        with open("example-json-output.json", "r") as f:
            intent_schema = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load intent schema: {e}")

    # 2. Get or Create Conversation
    # For simplicity, we'll just get the last active conversation or create a new one
    # In a real app, you might want to manage sessions more explicitly
    conversation = session.exec(select(Conversation).where(Conversation.user_id == request.user_id).order_by(Conversation.updated_at.desc())).first()
    
    if not conversation:
        conversation = Conversation(user_id=request.user_id, state="{}")
        session.add(conversation)
        session.commit()
        session.refresh(conversation)

    # 3. Save User Message
    user_msg = Message(conversation_id=conversation.id, role="user", content=request.text)
    session.add(user_msg)
    session.commit()

    # 4. Construct Prompt for Gemini
    # We include the schema, current state, and the new user input
    current_state = json.loads(conversation.state)
    
    system_prompt = f"""
    You are an intelligent assistant for an email app called DriveMail.
    Your goal is to classify the user's intent and extract necessary information based on the provided schema.
    
    Schema:
    {json.dumps(intent_schema, indent=2)}
    
    Current State:
    {json.dumps(current_state, indent=2)}
    
    User Input: "{request.text}"
    
    Instructions:
    1. Identify the intent from the user's input. If the intent is already known in Current State, continue with it unless the user explicitly changes topic.
    2. Extract values for the slots defined in the schema for that intent.
    3. If a required slot is missing, your 'response' should be the 'prompt' defined in the schema for that slot.
    4. If all required slots are filled, your 'response' should be a confirmation message in German, like "Bereit, die E-Mail an [recipient] mit dem Betreff [subject] zu senden...".
    5. Return a JSON object with the following structure:
    {{
        "intent": "string (name of the intent)",
        "slots": {{ "slot_name": "extracted_value" }},
        "missing_slots": ["slot_name"],
        "response": "string (what to say back to the user)",
        "completed": boolean (true if all required slots are filled)
    }}
    
    Only return the JSON object, no markdown formatting.
    """

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash", generation_config={"response_mime_type": "application/json"})
        
        response = model.generate_content(system_prompt)
        result_json = json.loads(response.text)
        
        # 5. Update State
        new_state = {
            "intent": result_json.get("intent"),
            "slots": {**current_state.get("slots", {}), **result_json.get("slots", {})}
        }
        conversation.state = json.dumps(new_state)
        conversation.updated_at = datetime.utcnow()
        session.add(conversation)
        
        # 6. Save Assistant Message
        assistant_msg = Message(conversation_id=conversation.id, role="assistant", content=result_json.get("response"))
        session.add(assistant_msg)
        session.commit()
        
        return result_json

    except Exception as e:
        print(f"Intent Processing Error: {e}")
        raise HTTPException(status_code=500, detail=f"Intent Processing Error: {str(e)}")

