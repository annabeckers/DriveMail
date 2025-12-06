import os
import json
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from sqlmodel import Session, select
from ..database import get_session
from ..models import User, Conversation, Message, Task, OAuthCredential
from ..agents.email_writer import EmailWriterAgent
from ..agents.email_reader import EmailReaderAgent
from ..agents.email_summarizer import EmailSummarizerAgent
from ..agents.send_email import SendEmailAgent
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
        with open("example-json-output.json", "r", encoding="utf-8") as f:
            intent_schema = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load intent schema: {e}")

    # 2. Get or Create Conversation
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
    current_state = json.loads(conversation.state)
    
    system_prompt = f"""
    You are an intelligent assistant for an email app called DriveMail.
    Your goal is to classify the user's intent and extract necessary information based on the provided schema.
    
    Capabilities:
    - You can READ emails ("Lies meine E-Mails", "Was gibt es Neues?").
    - You can SUMMARIZE emails ("Fasse meine E-Mails zusammen", "Worum geht es in der Mail von X?").
    - You can WRITE and SEND emails ("Schreibe eine E-Mail an X", "Antworte auf die letzte Mail").
    - You can answer general questions about what you can do (Chitchat).
    
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
    5. If the intent is 'chitchat', provide a helpful and natural response in German in the 'response' field. Explain your capabilities if asked.
    6. Return a JSON object with the following structure:
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
        
        # Check if completed
        if result_json.get("completed"):
            # Execute Agent
            intent_name = result_json.get("intent")
            slots = new_state["slots"]
            
            # Get User Credentials
            creds = session.exec(select(OAuthCredential).where(OAuthCredential.user_id == request.user_id)).first()
            if not creds:
                result_json["response"] = "Fehler: Keine Anmeldeinformationen gefunden."
            else:
                agent_response = None
                if intent_name == "send_email" or intent_name == "save_draft":
                     agent = EmailWriterAgent(creds)
                     agent_response = agent.execute(slots)
                elif intent_name == "read_emails":
                     agent = EmailReaderAgent(creds)
                     agent_response = agent.execute(slots)
                elif intent_name == "summarize_emails":
                     agent = EmailSummarizerAgent(creds)
                     agent_response = agent.execute(slots)
                elif intent_name == "chitchat":
                     # No agent needed, the response is already in result_json["response"]
                     # But we need to ensure we don't treat it as an error or empty agent response
                     agent_response = {"status": "success", "message": result_json.get("response")}
                elif intent_name == "confirm_send":
                     # We need to find the last draft created in this conversation
                     last_task = session.exec(select(Task).where(Task.conversation_id == conversation.id).where(Task.intent == "send_email").order_by(Task.created_at.desc())).first()
                     
                     draft_id = None
                     if last_task and last_task.result:
                         try:
                             last_result = json.loads(last_task.result)
                             draft_id = last_result.get("draft_id")
                         except:
                             pass
                     
                     if draft_id:
                         agent = SendEmailAgent(creds)
                         agent_response = agent.execute({"draft_id": draft_id})
                     else:
                         agent_response = {"status": "error", "message": "Kein Entwurf zum Senden gefunden."}
                
                if agent_response:
                    # Create Task Record
                    task = Task(
                        conversation_id=conversation.id,
                        intent=intent_name,
                        slots=json.dumps(slots),
                        status=agent_response.get("status", "completed"),
                        result=json.dumps(agent_response),
                        completed_at=datetime.utcnow()
                    )
                    session.add(task)
                    
                    # Update Response to User
                    if agent_response.get("status") == "success":
                        # Just return the message directly for voice clarity
                        result_json["response"] = agent_response.get('message')
                        # Reset State after successful execution
                        new_state = {} 
                    else:
                        result_json["response"] = f"Fehler: {agent_response.get('message')}"

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

