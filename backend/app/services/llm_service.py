import os
import json
import google.generativeai as genai
from datetime import datetime
from sqlmodel import Session, select
from fastapi import HTTPException
from app.models import Conversation, Message, Task
from app.services.agent_service import AgentService

class LLMService:
    """
    Service for handling interactions with the Google Gemini LLM.
    Manages conversation state, intent classification, and slot extraction.
    """
    def __init__(self, session: Session):
        """
        Initialize the LLMService.

        Args:
            session (Session): Database session for retrieving conversation history.
        """
        self.session = session
        self.agent_service = AgentService(session)
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        genai.configure(api_key=self.api_key)

    def process_message(self, text: str, user_id: int) -> dict:
        """
        Process a user message, update conversation state, and generate a response.

        Args:
            text (str): The user's input text.
            user_id (int): The ID of the user.

        Returns:
            dict: JSON response containing intent, extracted slots, and agent response.
        """
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
        
        print(f"--- DEBUG: process_intent ---")
        print(f"User Input: {request.text}")
        print(f"Current State: {current_state}")
        
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
        1. **Analyze Intent**: Identify the intent from the user's input.
           - If the intent is already known in Current State, continue with it unless the user explicitly changes topic.
           - **Ambiguity Check**: If the user's input is ambiguous (e.g., "I want to send" -> write new or send draft?), ask for clarification in 'response' and set 'intent' to null or keep previous.
           - Be careful not to confuse "sending" with "writing". 'send_email' is for drafting. 'confirm_send' is ONLY for actually dispatching the email.
        
        2. **Slot Extraction & Validation**: Extract values for the slots defined in the schema.
           - **CRITICAL**: For 'send_email' or 'confirm_send', you MUST have a 'recipient'. If 'recipient' is missing in both Current State and User Input, you CANNOT set 'completed' to true.
           - If a required slot is missing, your 'response' MUST be the 'prompt' defined in the schema for that slot (e.g., "An wen soll die E-Mail gehen?").
           - Do not make up or hallucinate email addresses.
           - **Verification**: If you extract a complex slot like 'recipient' (especially if phonetically spelled out), you MUST ask for confirmation in 'response' (e.g., "I understood [email]. Is that correct?"). Do NOT set 'completed' to true until the user confirms (unless they just confirmed it).
        
        3. **Formulate Response**:
           - If a required slot is missing: Ask for it clearly.
           - If verification is needed: Ask for confirmation.
           - If all required slots are filled AND verified: valid response is a confirmation message in German, like "Bereit, die E-Mail an [recipient] mit dem Betreff [subject] zu senden...".
           - **NEVER** say "E-Mail gesendet" (Email sent) in the 'send_email' intent. That is only for 'confirm_send' AFTER success.
        
        4. **Return JSON**:
        {{
            "intent": "string (name of the intent)",
            "slots": {{ "slot_name": "extracted_value" }},
            "missing_slots": ["slot_name"],
            "response": "string (what to say back to the user)",
            "completed": boolean (true ONLY if all required slots are present AND verified)
        }}
        
        Only return the JSON object, no markdown formatting.
        """

        try:
            from app.core.config import settings
            model = genai.GenerativeModel(settings.GEMINI_MODEL_NAME, generation_config={"response_mime_type": "application/json"})
            response = model.generate_content(system_prompt)
            print(f"DEBUG: LLM Raw Response: {response.text}")
            result_json = json.loads(response.text)
            print(f"DEBUG: Extracted Intent Data: {json.dumps(result_json, indent=2)}")
            
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
