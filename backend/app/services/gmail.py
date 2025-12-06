import os
import base64
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class GmailService:
    def __init__(self, user_credentials):
        """
        Initialize Gmail Service with user credentials.
        user_credentials: Dictionary or Object containing token, refresh_token, etc.
        """
        self.creds = Credentials(
            token=user_credentials.access_token,
            refresh_token=user_credentials.refresh_token,
            token_uri=user_credentials.token_uri,
            client_id=user_credentials.client_id,
            client_secret=user_credentials.client_secret,
            scopes=user_credentials.scopes.split(',') if user_credentials.scopes else []
        )
        self.service = build('gmail', 'v1', credentials=self.creds)

    def create_draft(self, recipient: str, subject: str, body: str):
        """Create a draft email."""
        try:
            message = MIMEText(body)
            message['to'] = recipient
            message['subject'] = subject
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            draft_body = {'message': {'raw': raw}}
            draft = self.service.users().drafts().create(userId='me', body=draft_body).execute()
            return draft
        except HttpError as error:
            print(f'An error occurred: {error}')
            return None

    def send_email(self, draft_id: str):
        """Send a draft email."""
        try:
            # If we had the raw message we could send directly, but if we have a draft ID:
            # The drafts.send method takes a draft object with an ID
            result = self.service.users().drafts().send(userId='me', body={'id': draft_id}).execute()
            return result
        except HttpError as error:
            print(f'An error occurred: {error}')
            return None

    def list_messages(self, limit: int = 5, sender: str = None, recipient: str = None, include_body: bool = False):
        """List recent messages."""
        try:
            query = ""
            if sender:
                query += f"from:{sender} "
            if recipient:
                query += f"to:{recipient} "
            
            results = self.service.users().messages().list(userId='me', maxResults=limit, q=query.strip()).execute()
            messages = results.get('messages', [])
            
            final_messages = []
            for msg in messages:
                full_msg = self.service.users().messages().get(userId='me', id=msg['id']).execute()
                snippet = full_msg.get('snippet')
                headers = full_msg.get('payload', {}).get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                sender_val = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
                to_val = next((h['value'] for h in headers if h['name'] == 'To'), 'Unknown')
                date_val = next((h['value'] for h in headers if h['name'] == 'Date'), '')
                
                body = None
                if include_body:
                    body = self._get_body(full_msg.get('payload', {}))

                final_messages.append({
                    'id': msg['id'],
                    'snippet': snippet,
                    'subject': subject,
                    'sender': sender_val,
                    'to': to_val,
                    'date': date_val,
                    'body': body
                })
            return final_messages
        except HttpError as error:
            print(f'An error occurred: {error}')
            return []

    def _get_body(self, payload):
        """Extract body from message payload."""
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data')
                    if data:
                        return base64.urlsafe_b64decode(data).decode()
        elif 'body' in payload:
            data = payload['body'].get('data')
            if data:
                return base64.urlsafe_b64decode(data).decode()
        return ""