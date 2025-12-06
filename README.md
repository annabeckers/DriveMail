# DriveMail - a Mail Client that talks to you

## Entwicklungsumgebung einrichten

### Voraussetzungen

* [Python](https://www.python.org/) (3.8 oder neuer)
* [Node.js](https://nodejs.org/) (LTS Version empfohlen)
* [Git](https://git-scm.com/)
* **Google Cloud Account** (für Gmail API & OAuth)
* **AWS Account** (für Bedrock AI Modelle)
* **PostgreSQL** (Datenbank)

### 1. Google Cloud Konfiguration


1. Gehe zur [Google Cloud Console](https://console.cloud.google.com/).
2. Erstelle ein neues Projekt.
3. Aktiviere die **Gmail API**.
4. Gehe zu "APIs & Dienste" > "Anmeldedaten" > "Anmeldedaten erstellen" > **OAuth-Client-ID**.
5. Wähle "Webanwendung".
6. Füge unter "Autorisierte JavaScript-Quellen" und "Autorisierte Weiterleitungs-URIs" `https://auth.expo.io` hinzu (für Expo Go).
7. Kopiere die **Client-ID**.
8. Gehe zum "OAuth-Zustimmungsbildschirm" und füge deine E-Mail als "Test User" hinzu.

### 2. AWS Konfiguration

1. Gehe zur [AWS Console](https://console.aws.amazon.com/).
2. Gehe zu **IAM** und erstelle einen Benutzer.
3. Gib dem Benutzer Zugriff auf **Amazon Bedrock** (z.B. `AmazonBedrockFullAccess`).
4. Erstelle einen **Access Key** und **Secret Access Key** für diesen Benutzer.
5. Stelle sicher, dass du in der AWS Region (z.B. `us-east-1`) Zugriff auf die Modelle hast (unter Bedrock > Model access).

### 3. Backend Setup (FastAPI)

1. Navigiere in den `backend` Ordner:

   ```bash
   cd backend
   ```

2. Erstelle eine `.env` Datei im `backend` Ordner mit folgendem Inhalt:

   ```env
   AWS_ACCESS_KEY_ID=dein_aws_access_key
   AWS_SECRET_ACCESS_KEY=dein_aws_secret_key
   AWS_REGION=us-east-1
   DATABASE_URL=postgresql://user:password@localhost/drivemail
   ```

3. Erstelle eine virtuelle Umgebung (optional, aber empfohlen):

   ```bash
   python -m venv venv
   ```

4. Aktiviere die virtuelle Umgebung:

   * Windows (PowerShell):

     ```powershell
     .\venv\Scripts\Activate.ps1
     ```

   * macOS/Linux:

     ```bash
     source venv/bin/activate
     ```

5. Installiere die Abhängigkeiten:

   ```bash
   pip install -r requirements.txt
   ```

6. Starte den Backend-Server:

   ```bash
   uvicorn app.main:app --reload
   ```

   Der Server läuft nun unter `http://127.0.0.1:8000`.

### 4. Frontend Setup (Expo / React Native)

1. Navigiere in den `frontend` Ordner:

   ```bash
   cd frontend
   ```

2. Öffne `app/index.tsx` und trage deine **Google Client ID** ein:

   ```typescript
   webClientId: 'DEINE_GOOGLE_WEB_CLIENT_ID',
   ```

3. Installiere die Abhängigkeiten:

   ```bash
   npm install
   ```

4. Starte die App:

   ```bash
   npm start
   ```

   Dies startet den Metro Bundler. Du kannst nun:
   * `w` drücken, um im Webbrowser zu starten (empfohlen für Auth-Test).
   * Den QR-Code mit der **Expo Go** App scannen (erfordert korrekte Redirect-URI Konfiguration).
