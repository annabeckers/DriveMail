from .base import BaseAgent
from ..services.gmail import GmailService
from typing import Dict, Any

class SendEmailAgent(BaseAgent):
    def execute(self, slots: Dict[str, Any]) -> Dict[str, Any]:
        # This agent expects a 'draft_id' to be passed in slots, 
        # OR it might need to look up the last created draft from context if not provided explicitly.
        # For now, let's assume the orchestrator or the user provides it, 
        # or we handle the "send the last draft" logic here.
        
        draft_id = slots.get("draft_id")
        
        if not draft_id:
            return {"status": "error", "message": "Keine Entwurfs-ID gefunden. Bitte erstelle zuerst einen Entwurf."}

        gmail_service = GmailService(self.user_credentials)
        result = gmail_service.send_email(draft_id)

        if result:
            return {
                "status": "success",
                "message": "E-Mail erfolgreich gesendet!",
                "data": result
            }
        else:
            return {"status": "error", "message": "Fehler beim Senden der E-Mail."}
