import os
import base64
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from email.message import EmailMessage
from dotenv import load_dotenv

# Gmail / Google API imports
import google.auth
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


load_dotenv()
GMAIL_API_KEY = os.getenv("GMAIL_API")
POLLY_TTS_API_KEY = os.getenv("POLLY_TTS_API")
TRANSCRIBE_SST_API_KEY = os.getenv("TRANSCRIBE_SST_API")
LLM_API_KEY = os.getenv("LLM_API")
# NOTE: For Gmail API, we assume OAuth credentials (client_secret.json) + token storage + authorization done separately.


app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}

# Beispiel-API für deine App


@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI backend"}


# ---- Models ----

class IntentInput(BaseModel):
    data: dict


class ReadEmailInput(BaseModel):
    user_id: str  # typically "me"
    message_id: str


class ReadEmailHistoryInput(BaseModel):
    user_id: str
    query: str = None  # optional search query to filter messages by e.g. from:/to:/subject


class WriteEmailInput(BaseModel):
    user_id: str  # typically "me"
    addressee: str
    subject: str
    content_hint: str  # rough content, will send to LLM for tone/style


class SendEmailInput(BaseModel):
    user_id: str
    draft_id: str


# ---- Helpers ----


async def call_llm(payload: dict) -> str:
    # call your LLM API (with LLM_API_KEY) to generate a string (e-mail body) based on payload
    # e.g. use httpx to POST to LLM endpoint. For now, stub:
    return "Generated email body based on content_hint and history..."


def get_gmail_service() -> any:
    # This assumes that valid credentials are available (e.g. from token.json or environment),
    # for simplicity using default credentials / OAuth flow:
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/gmail.modify",
                                           "https://www.googleapis.com/auth/gmail.compose",
                                           "https://www.googleapis.com/auth/gmail.send"])
    service = build("gmail", "v1", credentials=creds)
    return service


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


# ---- Endpoints ----


@app.post("/find_user_intent")
async def find_user_intent(input_data: IntentInput):
    try:
        out = await call_llm(input_data.data)
        return out
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/read_email")
async def read_email(data: ReadEmailInput):
    try:
        msg = await gmail_get_message(data.user, data.message_id)
        return msg
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/read_email_history")
async def read_email_history(data: ReadEmailHistoryInput):
    try:
        hist = await gmail_list_history(data.person)
        return hist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/write_email")
async def write_email(data: WriteEmailInput):
    try:
        history = await gmail_list_history(data.addressee)
        context = {"history": history, "content_hint": data.content_hint}
        llm_email = await call_llm(context)

        draft = await gmail_save_draft(llm_email)
        return {"email_body": llm_email, "draft_id": draft["draft_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send_email")
async def send_email(data: SendEmailInput):
    try:
        ok = await gmail_send_message(data.email_id)
        return {"success": ok}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Endpoints ----

@app.post("/find_user_intent")
async def find_user_intent(input_data: IntentInput):
    # Example LLM call
    try:
        resp = await call_llm(input_data.data)
        return {"intent": resp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/read_email")
async def read_email(data: ReadEmailInput):
    service = get_gmail_service()
    try:
        msg = service.users().messages().get(userId=data.user_id,
                                             id=data.message_id, format="full").execute()
        return msg
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"Gmail API error: {e}")


@app.post("/read_email_history")
async def read_email_history(data: ReadEmailHistoryInput):
    service = get_gmail_service()
    try:
        # list messages, optionally with query
        params = {"userId": data.user_id}
        if data.query:
            params["q"] = data.query
        results = service.users().messages().list(**params).execute()
        messages = results.get("messages", [])
        full_msgs = []
        for m in messages:
            full = service.users().messages().get(userId=data.user_id,
                                                  id=m["id"], format="full").execute()
            full_msgs.append(full)
        return full_msgs
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"Gmail API error: {e}")


@app.post("/write_email")
async def write_email(data: WriteEmailInput):
    service = get_gmail_service()
    try:
        # fetch history with this addressee
        history = service.users().messages().list(userId=data.user_id,
                                                  q=f"to:{data.addressee} OR from:{data.addressee}").execute().get("messages", [])
        hist_full = []
        for m in history:
            hist_full.append(service.users().messages().get(
                userId=data.user_id, id=m["id"], format="full").execute())

        email_body = await call_llm({
            "history": hist_full,
            "content_hint": data.content_hint
        })

        message = EmailMessage()
        message.set_content(email_body)
        message["To"] = data.addressee
        # From header may be automatically filled by Gmail or you can set it
        # message["From"] = "your_email@example.com"
        message["Subject"] = data.subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        draft = service.users().drafts().create(
            userId=data.user_id,
            body={"message": {"raw": raw}}
        ).execute()

        return {"draft_id": draft["id"], "email_body": email_body}
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"Gmail API error: {e}")


@app.post("/send_email")
async def send_email(data: SendEmailInput):
    service = get_gmail_service()
    try:
        sent = service.users().drafts().send(userId=data.user_id,
                                             body={"id": data.draft_id}).execute()
        return {"success": True, "sent_message": sent}
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"Gmail API error: {e}")
