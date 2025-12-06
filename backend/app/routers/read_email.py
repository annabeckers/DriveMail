from fastapi import APIRouter
from models.gmail_read import ReadEmailInput
from services.gmail import gmail_get_message, gmail_list_history, get_gmail_service

router = APIRouter(prefix="/email")


@app.get("/read_emails")
# Its better to use models as input, and please use the  json
async def list_emails(user_id: str, query: str = None):
    service = get_gmail_service()
    try:
        params = {"userId": user_id}
        if query:
            params["q"] = query
        results = service.users().messages().list(**params).execute()
        messages = results.get("messages", [])
        email_summaries = []
        for m in messages:
            full = service.users().messages().get(userId=user_id,
                                                  id=m["id"], format="full").execute()
            # Extract snippet and body
            snippet = full.get("snippet", "")
            body = ""
            for part in full.get("payload", {}).get("parts", []):
                if part.get("mimeType") == "text/plain":
                    body_data = part.get("body", {}).get("data", "")
                    body = extract_email_body(body_data)
                    break
            email_summaries.append({
                "id": m["id"],
                "snippet": snippet,
                "body": body
            })
        return email_summaries
    except HttpError as e:
        raise HTTPException(status_code=400, detail=f"Gmail API error: {e}")


@router.post("/read_email_history")
async def read_email_history(data: ReadEmailHistoryInput):
    try:
        hist = await gmail_list_history(data.person)
        return hist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
