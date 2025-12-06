from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from pydantic import BaseModel
from ..database import get_session
from app.models.user import User
from app.models.oauth_credentials import OAuthCredential

router = APIRouter()


class TokenPayload(BaseModel):
    token: str


@router.post("/google")
def google_auth(payload: TokenPayload, session: Session = Depends(get_session)):
    try:
        # 1. Verify Token & Get User Info from Google
        creds = Credentials(token=payload.token)
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()

        email = profile.get('emailAddress')
        if not email:
            raise HTTPException(
                status_code=400, detail="Could not retrieve email from Google")

        # 2. Check if User exists in DB, else create
        user = session.exec(select(User).where(User.email == email)).first()
        if not user:
            user = User(email=email, name=email.split(
                '@')[0])  # Simple name extraction
            session.add(user)
            session.commit()
            session.refresh(user)

        # 3. Save/Update Credentials
        oauth_cred = session.exec(select(OAuthCredential).where(
            OAuthCredential.user_id == user.id)).first()
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
