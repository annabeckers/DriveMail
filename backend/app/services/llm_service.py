import os
import json
import google.generativeai as genai
from datetime import datetime
from sqlmodel import Session, select
from fastapi import HTTPException
from app.models import Conversation, Message, Task
from app.services.agent_service import AgentService

class LLMService:
    def __init__(self, session: Session):
        self.session = session
        self.agent_service = AgentService(session)
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        genai.configure(api_key=self.api_key)

    def process_message(self, text: str, user_id: int) -> dict:
        # 1. Load Intent Schema
        try:
            with open("example-json-output.json", "r", encoding="utf-8") as f:
                intent_schema = json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not load intent schema: {e}")

        # 2. Get or Create Conversation
        conversation = self.session.exec(select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc())).first()
        
        if not conversation:
            conversation = Conversation(user_id=user_id, state="{}")
            self.session.add(conversation)
            self.session.commit()
            self.session.refresh(conversation)

        # 3. Save User Message
        user_msg = Message(conversation_id=conversation.id, role="user", content=text)
        self.session.add(user_msg)
        self.session.commit()

        # 4. Construct Prompt for Gemini
        current_state = json.loads(conversation.state)
        
        system_prompt = f"""
        You are an intelligent assistant for an email app called DriveMail.
        Your goal is to classify the user's intent and extract necessary information based on the provided schema.
        
        Schema:
        {json.dumps(intent_schema, indent=2)}
        
        Current State:
        {json.dumps(current_state, indent=2)}
        
        User Input: "{text}"
        
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
                intent_name = result_json.get("intent")
                slots = new_state["slots"]
                
                # Logic to find draft_id if confirming send
                draft_id = None
                if intent_name == "confirm_send":
                     last_task = self.session.exec(select(Task).where(Task.conversation_id == conversation.id).where(Task.intent == "send_email").order_by(Task.created_at.desc())).first()
                     if last_task and last_task.result:
                         try:
                             last_result = json.loads(last_task.result)
                             draft_id = last_result.get("draft_id")
                         except:
                             pass

                agent_response = self.agent_service.execute_intent(intent_name, slots, user_id, draft_id)
                
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
                    self.session.add(task)
                    
                    # Update Response to User
                    if agent_response.get("status") == "success":
                        result_json["response"] = agent_response.get('message')
                        new_state = {} 
                    else:
                        result_json["response"] = f"Fehler: {agent_response.get('message')}"

            conversation.state = json.dumps(new_state)
            conversation.updated_at = datetime.utcnow()
            self.session.add(conversation)
            
            # 6. Save Assistant Message
            assistant_msg = Message(conversation_id=conversation.id, role="assistant", content=result_json.get("response"))
            self.session.add(assistant_msg)
            self.session.commit()
            
            return result_json

        except Exception as e:
            print(f"Intent Processing Error: {e}")
            raise HTTPException(status_code=500, detail=f"Intent Processing Error: {str(e)}")
