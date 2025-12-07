# config.py
import os
from dotenv import load_dotenv

load_dotenv()

POLLY_TTS_API_KEY = os.getenv("POLLY_TTS_API")
TRANSCRIBE_SST_API_KEY = os.getenv("TRANSCRIBE_SST_API")
LLM_API_KEY = os.getenv("LLM_API")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
