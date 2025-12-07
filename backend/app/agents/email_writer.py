import os
import google.generativeai as genai
from .base import BaseAgent
from ..services.gmail import GmailService
from typing import Dict, Any

class EmailWriterAgent(BaseAgent):
    """
    Agent responsible for generating email drafts using the LLM and the Gmail API.
    Interacts with Gmail to fetch context and create drafts.
    """
    def execute(self, slots: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's logic to generate and draft an email.

        Args:
            slots (Dict[str, Any]): slots containing 'recipient', 'subject', and 'body' instructions.

        Returns:
            Dict[str, Any]: Result dictionary containing status, message, and draft information.
        """
        recipient = slots.get("recipient")
        subject = slots.get("subject")
        raw_body_instruction = slots.get("body")

        if not all([recipient, subject, raw_body_instruction]):
            return {"status": "error", "message": "Missing required slots for writing email."}

        gmail_service = GmailService(self.user_credentials)
        
        # 1. Fetch Context (Last 3 emails with this recipient)
        received_msgs = gmail_service.list_messages(limit=3, sender=recipient, include_body=True)
        
        # Attempt to resolve email address if recipient is just a name
        resolved_recipient = recipient
        if "@" not in recipient and received_msgs:
            # Extract email from the most recent message's sender
            last_sender = received_msgs[0]['sender']
            if "<" in last_sender and ">" in last_sender:
                resolved_recipient = last_sender.split("<")[1].split(">")[0]
            elif "@" in last_sender:
                resolved_recipient = last_sender
        
        context_text = ""
        if received_msgs:
            context_text = "Verlauf der letzten E-Mails mit diesem Empfänger:\n"
            for msg in received_msgs:
                body_preview = msg.get('body', '')[:500] # Limit body length
                context_text += f"- Von: {msg['sender']}\n  Betreff: {msg['subject']}\n  Inhalt: {body_preview}\n\n"
        else:
            context_text = "Keine vorherigen E-Mails mit diesem Empfänger gefunden."

        # 2. Generate Email Content with Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             return {"status": "error", "message": "API Key missing for email generation."}

        try:
            genai.configure(api_key=api_key)
            from app.core.config import settings
            model = genai.GenerativeModel(settings.GEMINI_MODEL_NAME)
            
            prompt = f"""
            Du bist ein professioneller E-Mail-Assistent.
            Deine Aufgabe ist es, den Text für eine E-Mail zu verfassen.
            
            Empfänger: {recipient} (Email: {resolved_recipient})
            Betreff: {subject}
            Benutzer-Anweisung: "{raw_body_instruction}"
            
            Kontext (Vorherige E-Mails):
            {context_text}
            
            Anweisungen:
            1. Analysiere den Tonfall der vorherigen E-Mails (falls vorhanden). Ist er formell (Sie) oder informell (Du)?
            2. Passe den Tonfall der neuen E-Mail entsprechend an. Wenn kein Kontext vorhanden ist, wähle einen höflichen, professionellen Ton.
            3. Verfasse den E-Mail-Text basierend auf der Benutzer-Anweisung.
            4. Gib NUR den E-Mail-Text zurück. Keine Betreffzeile, keine Einleitung wie "Hier ist der Entwurf".
            """
            
            response = model.generate_content(prompt)
            generated_body = response.text
            
            # 3. Create Draft
            draft = gmail_service.create_draft(resolved_recipient, subject, generated_body)

            if draft:
                return {
                    "status": "success",
                    "message": f"Entwurf erstellt. Inhalt: {generated_body}. Soll ich ihn senden?",
                    "draft_id": draft['id'],
                    "action_needed": "confirm_send",
                    "generated_content": generated_body
                }
            else:
                return {"status": "error", "message": "Fehler beim Erstellen des Entwurfs. Überprüfen Sie die E-Mail-Adresse."}

        except Exception as e:
            return {"status": "error", "message": f"Fehler bei der E-Mail-Generierung: {str(e)}"}
