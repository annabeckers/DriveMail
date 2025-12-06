from fastapi import FastAPI, HTTPException
from routers import intent, read_email, write_email
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import create_db_and_tables
from .routers import auth, speech, ai


from pydantic import BaseModel
from email.message import EmailMessage
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any

from googleapiclient.errors import HttpError
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import google.auth
import os
import base64

app = FastAPI()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intent.router)
app.include_router(read_email.router)
app.include_router(write_email.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "DriveMail Backend"}

# Beispiel-API für deine App


@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI backend"}


# ---- Endpoints ---- these should all be put into the according router files

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
