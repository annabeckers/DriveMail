from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from pydantic import BaseModel
from ..database import get_session
from ..models import User, OAuthCredential
import os

router = APIRouter()

class AuthPayload(BaseModel):
    code: str
    redirect_uri: str
    code_verifier: str | None = None

@router.post("/google")
def google_auth(payload: AuthPayload, session: Session = Depends(get_session)):
    try:
        client_id = os.environ.get("GOOGLE_CLIENT_ID") or '479833791667-fua2rjtjbjv5qrdthe5sdlqaslr613hc.apps.googleusercontent.com'
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
        
        if not client_secret:
            raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_SECRET not set in backend environment")

        # 1. Exchange Code for Token using specific redirect_uri
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=[
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.compose',
                'openid',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ],
            redirect_uri=payload.redirect_uri
        )
        
        flow.fetch_token(code=payload.code, code_verifier=payload.code_verifier)
        creds = flow.credentials

        # 2. Verify Token & Get User Info from Google
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        
        email = profile.get('emailAddress')
        if not email:
            raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

        # 3. Check if User exists in DB, else create
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            user = User(email=email, name=email.split('@')[0]) # Simple name extraction
            session.add(user)
            session.commit()
            session.refresh(user)
        
        # 4. Save/Update Credentials
        oauth_cred = session.exec(select(OAuthCredential).where(OAuthCredential.user_id == user.id)).first()
        if not oauth_cred:
            oauth_cred = OAuthCredential(
                user_id=user.id,
                access_token=creds.token,
                refresh_token=creds.refresh_token,
                token_uri=creds.token_uri,
                client_id=creds.client_id,
                client_secret=creds.client_secret,
                scopes=creds.scopes
            )
            session.add(oauth_cred)
        else:
            oauth_cred.access_token = creds.token
            if creds.refresh_token:
                oauth_cred.refresh_token = creds.refresh_token
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
