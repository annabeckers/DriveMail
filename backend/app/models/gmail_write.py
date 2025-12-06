from pydantic import BaseModel


class DraftEmailInput(BaseModel):
    user_id: str  # typically "me"
    addressee: str
    subject: str
    content_hint: str  # rough content, will send to LLM for tone/style


class SendEmailInput(BaseModel):
    user_id: str
    draft_id: str
