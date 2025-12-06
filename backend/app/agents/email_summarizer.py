import os
import google.generativeai as genai
from .base import BaseAgent
from ..services.gmail import GmailService
from typing import Dict, Any

class EmailSummarizerAgent(BaseAgent):
    def execute(self, slots: Dict[str, Any]) -> Dict[str, Any]:
        limit = slots.get("limit", 3)
        sender = slots.get("sender")

        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 3

        gmail_service = GmailService(self.user_credentials)
        messages = gmail_service.list_messages(limit=limit, sender=sender, include_body=True)

        if not messages:
            return {"status": "success", "message": "Keine E-Mails zum Zusammenfassen gefunden."}

        # Prepare content for summarization
        email_texts = []
        for i, msg in enumerate(messages):
            body = msg.get('body', '') or msg.get('snippet', '')
            sender = msg.get('sender', 'Unknown')
            subject = msg.get('subject', 'No Subject')
            email_texts.append(f"Email {i+1} from {sender}: Subject: {subject}. Body: {body}\n")

        full_text = "\n".join(email_texts)
        
        # Call Gemini to summarize
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             return {"status": "error", "message": "API Key fehlt für Zusammenfassung."}

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            
            prompt = f"""
            Fasse die folgenden E-Mails für einen Autofahrer zusammen, der sie sich anhört.
            Halte dich extrem kurz und gesprächig.
            KEINE Markdown-Formatierung (kein Fett, keine Listen, keine Aufzählungszeichen).
            KEINE Sonderzeichen wie *, #, -.
            Nur reiner Text, der gut vorgelesen werden kann.
            Sprache: Deutsch.
            
            Struktur: "Du hast X neue E-Mails. [Absender] schreibt wegen [Betreff/Thema]. [Absender 2] hat..."
            
            E-Mails:
            {full_text}
            """
            
            response = model.generate_content(prompt)
            summary = response.text
            
            return {
                "status": "success",
                "message": summary,
                "data": messages
            }
            
        except Exception as e:
            return {"status": "error", "message": f"Fehler bei der Zusammenfassung: {str(e)}"}
