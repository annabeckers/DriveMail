
class ReadEmailInput(BaseModel):
    user_id: str  # typically "me"
    message_id: str


class ReadEmailHistoryInput(BaseModel):
    user_id: str
    query: str = None  # optional search query to filter messages by e.g. from:/to:/subject
