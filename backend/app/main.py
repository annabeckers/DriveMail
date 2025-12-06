import os
import json
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from dotenv import load_dotenv
from sqlmodel import Session, select
from .database import create_db_and_tables, get_session
from .models import User, OAuthCredential

load_dotenv()

app = FastAPI()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TokenPayload(BaseModel):
    token: str

class AIRequest(BaseModel):
    prompt: str

@app.get("/health")
def health():
    return {"status": "ok", "service": "DriveMail Backend"}

@app.post("/auth/google")
def google_auth(payload: TokenPayload, session: Session = Depends(get_session)):
    try:
        # 1. Verify Token & Get User Info from Google
        creds = Credentials(token=payload.token)
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        
        email = profile.get('emailAddress')
        if not email:
            raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

        # 2. Check if User exists in DB, else create
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            user = User(email=email, name=email.split('@')[0]) # Simple name extraction
            session.add(user)
            session.commit()
            session.refresh(user)
        
        # 3. Save/Update Credentials
        # Note: In this implicit flow, we only get an access_token, no refresh_token.
        # For offline access, we need the 'code' flow.
        # We save what we have for now.
        
        oauth_cred = session.exec(select(OAuthCredential).where(OAuthCredential.user_id == user.id)).first()
        if not oauth_cred:
            oauth_cred = OAuthCredential(
                user_id=user.id,
                access_token=payload.token
            )
            session.add(oauth_cred)
        else:
            oauth_cred.access_token = payload.token
            session.add(oauth_cred)
            
        session.commit()

        return {
            "status": "success", 
            "email": email, 
            "messagesTotal": profile.get('messagesTotal'),
            "user_id": user.id
        }
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/ai/generate")
def generate_text(request: AIRequest):
    # AWS Bedrock Integration
    # Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION in env
    try:
        bedrock = boto3.client(
            service_name='bedrock-runtime', 
            region_name=os.getenv("AWS_REGION", "eu-west-2")
        )
        
        # Using Amazon Titan Text G1 - Express as an example
        body = json.dumps({
            "inputText": request.prompt,
            "textGenerationConfig": {
                "maxTokenCount": 512,
                "stopSequences": [],
                "temperature": 0,
                "topP": 1
            }
        })
        
        modelId = 'amazon.titan-text-express-v1'
        accept = 'application/json'
        contentType = 'application/json'
        
        response = bedrock.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
        response_body = json.loads(response.get('body').read())
        
        return {"result": response_body.get('results')[0].get('outputText')}
        
    except Exception as e:
        print(f"Bedrock Error: {e}")
        raise HTTPException(status_code=500, detail=f"Bedrock Error: {str(e)}")

