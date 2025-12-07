import os
import shutil
import tempfile
import time
import subprocess
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai
from google.cloud import texttospeech
from imageio_ffmpeg import get_ffmpeg_exe

load_dotenv()

router = APIRouter()

# Initialize Google Cloud TTS Client
# Ensure GOOGLE_APPLICATION_CREDENTIALS is set in your environment or .env
try:
    tts_client = texttospeech.TextToSpeechClient()
except Exception as e:
    print(f"Warning: Could not initialize Google TTS Client: {e}")
    tts_client = None

class SpeakRequest(BaseModel):
    text: str

@router.post("/speak")
async def speak_text(request: SpeakRequest):
    """
    Generate speech from text using Google Cloud Text-to-Speech (Neural2 Voice).
    """
    if not tts_client:
        raise HTTPException(status_code=500, detail="Google TTS Client not initialized. Check credentials.")

    try:
        # Configure the request
        synthesis_input = texttospeech.SynthesisInput(text=request.text)
        
        # Select the language and voice (German Neural2 Female)
        voice = texttospeech.VoiceSelectionParams(
            language_code="de-DE",
            name="de-DE-Neural2-F",
        )
        
        # Select the type of audio file you want returned
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        # Perform the text-to-speech request
        response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        # Save to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            tmp.write(response.audio_content)
            output_file = tmp.name

        return FileResponse(output_file, media_type="audio/mpeg", filename="speech.mp3")

    except Exception as e:
        print(f"Google TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    print(f"Received file: {file.filename}, content_type: {file.content_type}")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    genai.configure(api_key=api_key)
    
    tmp_path = None
    converted_path = None

    try:
        # Create a temporary file to save the uploaded audio
        file_ext = file.filename.split('.')[-1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        # Convert WebM/M4A to MP3 if necessary
        upload_path = tmp_path
        if file_ext in ['webm', 'm4a']:
            converted_path = tmp_path.rsplit('.', 1)[0] + '.mp3'
            ffmpeg_exe = get_ffmpeg_exe()
            print(f"Converting {file_ext} to mp3...")
            subprocess.run([
                ffmpeg_exe, '-i', tmp_path, '-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k', converted_path
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            upload_path = converted_path

        try:
            # Upload the file to Gemini
            myfile = genai.upload_file(upload_path)
            
            # Wait for the file to be active
            while myfile.state.name == "PROCESSING":
                time.sleep(1)
                myfile = genai.get_file(myfile.name)

            if myfile.state.name != "ACTIVE":
                raise Exception(f"File upload failed with state: {myfile.state.name}")
            
            # Initialize the model
            model = genai.GenerativeModel("gemini-2.0-flash")
            
            # Generate content (transcription)
            result = model.generate_content(["Transcribe this audio file exactly as spoken.", myfile])
            
            return {"text": result.text}
            
        finally:
            # Clean up temporary files
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
            if converted_path and os.path.exists(converted_path):
                os.remove(converted_path)

    except Exception as e:
        print(f"Gemini Transcribe Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        print(f"Gemini Transcribe Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
