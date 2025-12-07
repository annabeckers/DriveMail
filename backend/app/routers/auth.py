from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from sqlmodel import Session
from pydantic import BaseModel
from ..database import get_session
from ..services.auth import AuthService

router = APIRouter()

from ..schemas.auth import TokenPayload

# TokenPayload moved to app/schemas/auth.py

@router.post("/google")
def google_auth(payload: TokenPayload, session: Session = Depends(get_session)):
    auth_service = AuthService(session)
    return auth_service.authenticate_google_user(
        token=payload.token,
        refresh_token=payload.refresh_token,
        client_id=payload.client_id,
        client_secret=payload.client_secret
    )
