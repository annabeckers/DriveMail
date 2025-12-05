from fastapi import FastAPI

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

# Beispiel-API für deine App
@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI backend"}
