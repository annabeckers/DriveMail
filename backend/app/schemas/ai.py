from pydantic import BaseModel

class AIRequest(BaseModel):
    prompt: str

class IntentRequest(BaseModel):
    text: str
    user_id: int
