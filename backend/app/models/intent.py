from pydantic import BaseModel


class IntentInput(BaseModel):
    data: dict
