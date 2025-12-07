from pydantic import BaseModel
from typing import Optional

class TokenPayload(BaseModel):
    token: str
    refresh_token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
