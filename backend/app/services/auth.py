from sqlmodel import Session, select
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from fastapi import HTTPException
from app.models import User, OAuthCredential

class AuthService:
    def __init__(self, session: Session):
        self.session = session

    def authenticate_google_user(self, token: str, refresh_token: str = None, client_id: str = None, client_secret: str = None) -> dict:
        try:
            # 1. Verify Token & Get User Info from Google
            creds = Credentials(token=token)
            service = build('gmail', 'v1', credentials=creds)
            profile = service.users().getProfile(userId='me').execute()
            
            email = profile.get('emailAddress')
            if not email:
                raise HTTPException(status_code=400, detail="Could not retrieve email from Google")

            # 2. Check if User exists in DB, else create
            user = self.session.exec(select(User).where(User.email == email)).first()
            if not user:
                user = User(email=email, name=email.split('@')[0])
                self.session.add(user)
                self.session.commit()
                self.session.refresh(user)
            
            # 3. Save/Update Credentials
            oauth_cred = self.session.exec(select(OAuthCredential).where(OAuthCredential.user_id == user.id)).first()
            if not oauth_cred:
                oauth_cred = OAuthCredential(
                    user_id=user.id,
                    access_token=token,
                    refresh_token=refresh_token,
                    client_id=client_id,
                    client_secret=client_secret
                )
                self.session.add(oauth_cred)
            else:
                oauth_cred.access_token = token
                if refresh_token: oauth_cred.refresh_token = refresh_token
                if client_id: oauth_cred.client_id = client_id
                if client_secret: oauth_cred.client_secret = client_secret
                self.session.add(oauth_cred)
                
            self.session.commit()

            return {
                "status": "success", 
                "email": email, 
                "messagesTotal": profile.get('messagesTotal'),
                "user_id": user.id
            }
        except Exception as e:
            print(f"Auth Error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
