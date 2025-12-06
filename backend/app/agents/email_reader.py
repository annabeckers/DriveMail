from .base import BaseAgent
from ..services.gmail import GmailService
from typing import Dict, Any
import email.utils
from datetime import datetime
import os
import google.generativeai as genai

class EmailReaderAgent(BaseAgent):
    def execute(self, slots: Dict[str, Any]) -> Dict[str, Any]:
        limit = slots.get("limit", 5)
        sender = slots.get("sender")

        # Ensure limit is an integer
        try:
            limit = int(limit)
        except (ValueError, TypeError):
            limit = 5

        gmail_service = GmailService(self.user_credentials)
        # User requested body to be read
        messages = gmail_service.list_messages(limit=limit, sender=sender, include_body=True)

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
             return {"status": "error", "message": "API Key fehlt."}
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")

        if messages:
            formatted_messages = []
            for msg in messages:
                # Clean sender: "Name <email>" -> "Name"
                sender_raw = msg.get('sender', 'Unknown')
                if '<' in sender_raw:
                    sender_clean = sender_raw.split('<')[0].strip().replace('"', '')
                else:
                    sender_clean = sender_raw

                # Format date: "Fri, 06 Dec 2024 14:30:00 +0000" -> "Heute um 14:30" or "6. Dezember um 14:30"
                date_raw = msg.get('date', '')
                date_str = "Unbekannte Zeit"
                if date_raw:
                    try:
                        parsed_date = email.utils.parsedate_to_datetime(date_raw)
                        now = datetime.now(parsed_date.tzinfo)
                        if parsed_date.date() == now.date():
                            date_str = parsed_date.strftime("Heute um %H:%M")
                        else:
                            # German month names would require locale or manual mapping, keeping simple for now
                            # or just numeric
                            date_str = parsed_date.strftime("%d.%m. um %H:%M")
                    except Exception:
                        date_str = date_raw # Fallback

                subject = msg.get('subject', 'Kein Betreff')
                body = msg.get('body') or msg.get('snippet', 'Kein Inhalt')
                
                # Use LLM to clean and format for voice
                prompt = f"""
                Du bist ein Assistent für einen Autofahrer.
                Formatiere die folgende E-Mail so, dass sie laut vorgelesen werden kann.
                Sprache: Deutsch.
                
                Infos:
                Absender: {sender_clean}
                Zeitpunkt: {date_str}
                Betreff: {subject}
                Inhalt: {body}
                
                Anweisungen:
                1. Fasse den Inhalt kurz zusammen oder gib ihn wieder, aber entferne Marketing-Müll, Links, Footer, Disclaimer.
                2. Wenn es nur Werbung ist, sag "Werbung von [Absender]: [Kurze Info]".
                3. Keine Markdown-Formatierung (kein Fett, keine Listen, keine Sternchen).
                4. Format: "E-Mail von [Absender], empfangen [Zeitpunkt]. Betreff: [Betreff]. [Bereinigter Inhalt]"
                5. Sei prägnant und natürlich gesprochen.
                """
                
                try:
                    response = model.generate_content(prompt)
                    speakable_text = response.text.strip()
                except Exception as e:
                    # Fallback if LLM fails
                    body_clean = body.replace('*', '').replace('#', '').replace('`', '')[:200]
                    speakable_text = f"E-Mail von {sender_clean}, empfangen {date_str}. Betreff: {subject}. {body_clean}"

                formatted_messages.append(speakable_text)
            
            # Join with a pause-like separator for TTS
            full_response = "Hier sind deine E-Mails.\n\n" + "\n\nNächste E-Mail.\n\n".join(formatted_messages)
            
            return {
                "status": "success",
                "message": full_response,
                "data": messages
            }
        else:
            return {"status": "success", "message": "Keine E-Mails gefunden."}
