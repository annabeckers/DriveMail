# DriveMail - a Mail Client that talks to you

## Entwicklungsumgebung einrichten

### Voraussetzungen

* [Python](https://www.python.org/) (3.8 oder neuer)
* [Node.js](https://nodejs.org/) (LTS Version empfohlen)
* [Git](https://git-scm.com/)

### Backend Setup (FastAPI)

1. Navigiere in den `backend` Ordner:

   ```bash
   cd backend
   ```

2. Erstelle eine virtuelle Umgebung (optional, aber empfohlen):

   ```bash
   python -m venv .venv
   ```

3. Aktiviere die virtuelle Umgebung:

   * Windows (PowerShell):

     ```powershell
     .\venv\Scripts\Activate.ps1
     ```

   * macOS/Linux:

     ```bash
     source venv/bin/activate
     ```

4. Installiere die Abhängigkeiten:

   ```bash
   pip install -r requirements.txt
   ```

5. Starte den Backend-Server:

   ```bash
   uvicorn app.main:app --reload
   ```

   Der Server läuft nun unter `http://127.0.0.1:8000`.
   Die API-Dokumentation findest du unter `http://127.0.0.1:8000/docs`.

### Frontend Setup (Expo / React Native)

1. Navigiere in den `frontend` Ordner:

   ```bash
   cd frontend
   ```

2. Installiere die Abhängigkeiten:

   ```bash
   npm install
   ```

3. Starte die App:

   ```bash
   npm start
   ```

   Dies startet den Metro Bundler. Du kannst nun:
   * `a` drücken, um auf einem Android Emulator zu starten.
   * `i` drücken, um auf einem iOS Simulator zu starten (nur macOS).
   * `w` drücken, um im Webbrowser zu starten.
   * Den QR-Code mit der **Expo Go** App auf deinem Smartphone scannen.
