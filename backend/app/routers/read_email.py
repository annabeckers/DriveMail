from fastapi import APIRouter
from models.gmail_read import ReadEmailInput
from services.gmail import gmail_get_message, gmail_list_history

router = APIRouter(prefix="/email")


@app.post("/read_email")
async def read_email(data: ReadEmailInput):
    try:
        msg = await gmail_get_message(data.user, data.message_id)
        return msg
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/read_email_history")
async def read_email_history(data: ReadEmailHistoryInput):
    try:
        hist = await gmail_list_history(data.person)
        return hist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
