import google.auth
from googleapiclient.discovery import build


def get_gmail_service():
    creds, _ = google.auth.default(
        scopes=[
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.send",
        ]
    )
    return build("gmail", "v1", credentials=creds)

# Needs to be abstracted towards all kinds of emails and then call gmail


async def gmail_get_message(user, message_id):
    # Replace with Google API client
    return {"id": message_id, "snippet": "Email content", "payload": {}}


async def gmail_list_history(person):
    # Replace with Gmail search
    return [{"id": "123", "snippet": "Previous email"}]


async def gmail_save_draft(email_body):
    # Replace with Gmail drafts.create
    return {"draft_id": "draft_abc", "body": email_body}


async def gmail_send_message(email_id):
    # Replace with Gmail send
    return True


async def extract_email_body(raw_email: str) -> str:
    decoded_bytes = urlsafe_b64decode(raw_email)
    email_message = message_from_bytes(decoded_bytes)

    # Get the email body
    if email_message.is_multipart():
        for part in email_message.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))

            if content_type == "text/plain" and "attachment" not in content_disposition:
                # Decode bytes to string
                return part.get_payload(decode=True).decode()
    else:
        return email_message.get_payload(decode=True).decode()

    return ""  # Fallback if no body found
