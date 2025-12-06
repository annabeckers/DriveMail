from fastapi import APIRouter
from services.gmail import gmail_save_draft, gmail_send_message

router = APIRouter(prefix="/email")


@router.post("/draft_email")
async def draft_email(data: DraftEmailInput):
    try:
        history = await gmail_list_history(data.addressee)
        context = {"history": history, "content_hint": data.content_hint}
        llm_email = await call_llm(context)

        draft = await gmail_save_draft(llm_email)
        return {"email_body": llm_email, "draft_id": draft["draft_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send_email")
async def send_email(data: SendEmailInput):
    try:
        ok = await gmail_send_message(data.email_id)
        return {"success": ok}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
