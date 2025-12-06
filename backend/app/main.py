from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .database import create_db_and_tables
from .routers import auth, speech, ai

load_dotenv()

app = FastAPI()

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "DriveMail Backend"}

# Include Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(speech.router, prefix="/speech", tags=["Speech"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])