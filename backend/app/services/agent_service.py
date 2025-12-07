from sqlmodel import Session
from app.models import OAuthCredential
from app.agents.email_writer import EmailWriterAgent
from app.agents.email_reader import EmailReaderAgent
from app.agents.email_summarizer import EmailSummarizerAgent
from app.agents.send_email import SendEmailAgent

class AgentService:
    def __init__(self, session: Session):
        self.session = session

    def execute_intent(self, intent_name: str, slots: dict, user_id: int, draft_id: str = None) -> dict:
        # Get User Credentials
        creds = self.session.exec(select(OAuthCredential).where(OAuthCredential.user_id == user_id)).first()
        if not creds:
             return {"status": "error", "message": "Fehler: Keine Anmeldeinformationen gefunden."}

        agent = None
        if intent_name == "send_email" or intent_name == "save_draft":
             agent = EmailWriterAgent(creds)
             return agent.execute(slots)
        elif intent_name == "read_emails":
             agent = EmailReaderAgent(creds)
             return agent.execute(slots)
        elif intent_name == "summarize_emails":
             agent = EmailSummarizerAgent(creds)
             return agent.execute(slots)
        elif intent_name == "confirm_send":
             if draft_id:
                 agent = SendEmailAgent(creds)
                 return agent.execute({"draft_id": draft_id})
             else:
                 return {"status": "error", "message": "Kein Entwurf zum Senden gefunden."}
        
        return {"status": "error", "message": f"Kein Agent für Intent '{intent_name}' gefunden."}
