import os
import shutil
import tempfile
import time
import subprocess
from fastapi import APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
import google.generativeai as genai
from imageio_ffmpeg import get_ffmpeg_exe

load_dotenv()

router = APIRouter()

@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
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

        # Convert WebM to MP3 if necessary
        upload_path = tmp_path
        if file_ext == 'webm':
            converted_path = tmp_path.replace('.webm', '.mp3')
            ffmpeg_exe = get_ffmpeg_exe()
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
