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
