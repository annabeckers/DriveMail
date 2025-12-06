from fastapi import APIRouter, HTTPException
from models.intent import IntentInput
from services.llm import call_llm
from services.gmail import get_gmail_service, get_recent_emails_for_user, assemble_prompt_from_actions_and_emails

router = APIRouter(prefix="/intent")


@router.post("/find_user_intent")
async def find_user_intent(data: IntentInput):
    """
    Receives an action/intent JSON payload.
    - Fetches recent emails,
    - Builds an LLM prompt,
    - Calls Bedrock Nova for summarization,
    - Returns the result.
    """
    try:
        user_id = data.data.get("user_id", "me")
        max_emails = data.data.get("max_results", 10)
        service = get_gmail_service()
        emails = await get_recent_emails_for_user(service, user_id, max_emails)
        prompt = assemble_prompt_from_actions_and_emails(data.data, emails)
        llm_payload = {"prompt": prompt}
        result = await call_llm(llm_payload)
        return {"llm_result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))