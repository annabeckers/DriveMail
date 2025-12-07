# DriveMail Backend Architecture

## 1. Component Diagram
This diagram visualizes the code structure and dependencies between modules.

```mermaid
graph TD
    subgraph "API Layer"
        Main
        AuthRouter
        AIRouter
        SpeechRouter
    end

    subgraph "Service Layer"
        AuthService
        LLMService
        AgentService
    end

    subgraph "Agents"
        EmailWriterAgent
        EmailReaderAgent
        EmailSummarizerAgent
        SendEmailAgent
    end

    subgraph "Data Access"
        Models
        Database
    end

    Main --> AuthRouter
    Main --> AIRouter
    Main --> SpeechRouter

    AuthRouter -.-> AuthService
    AIRouter -.-> LLMService
    LLMService -.-> AgentService

    AgentService -.-> EmailWriterAgent
    AgentService -.-> EmailReaderAgent
    AgentService -.-> EmailSummarizerAgent
    AgentService -.-> SendEmailAgent

    AuthService -.-> Models
    LLMService -.-> Models
    AgentService -.-> Models
    Database -.-> Models

    AuthRouter --> Database
    AIRouter --> Database
```

## 2. Architecture Layers
This diagram shows the logical layering of the system.

```mermaid
graph TD
    subgraph "Frontend"
        FE[Rull App / Web]
    end

    subgraph "Backend"
        subgraph "API Layer"
            API[FastAPI Routers]
        end

        subgraph "Service Layer"
            AuthS[Auth Service]
            LLMS[LLM Service]
            AgentS[Agent Service]
        end

        subgraph "Domain Layer"
            Models[SQLModel Models]
        end

        subgraph "Infrastructure Layer"
            DB[(PostgreSQL/SQLite)]
            GMail[Gmail API]
            Gemini[Gemini API]
        end
    end

    FE -->|HTTP Requests| API
    
    API -->|Auth| AuthS
    API -->|Intent| LLMS
    
    AuthS -->|CRUD| Models
    LLMS -->|CRUD| Models
    AgentS -->|Read Creds| Models
    
    Models -->|Persist| DB
    
    AuthS -->|Verify Token| GMail
    LLMS -->|Generate| Gemini
    LLMS -->|Execute| AgentS
    AgentS -->|Actions| GMail
```

## 3. Sequence Diagram (Intent Processing)
This diagram illustrates the flow of a user request to process an intent (e.g., "Send an email").

```mermaid
sequenceDiagram
    actor User
    participant AIRouter
    participant LLMService
    participant Gemini as Gemini API
    participant AgentService
    participant DB as Database

    User->>AIRouter: POST /process_intent {text: "Send email..."}
    AIRouter->>LLMService: process_message(text)
    
    activate LLMService
    LLMService->>DB: Get Conversation & History
    LLMService->>Gemini: Generate(Prompt + Schema + History)
    Gemini-->>LLMService: JSON {intent: "send_email", slots: {...}, completed: true}
    
    alt If Completed
        LLMService->>AgentService: execute_intent("send_email", slots)
        activate AgentService
        AgentService->>DB: Get OAuthCredential
        AgentService->>AgentService: Instantiate EmailWriterAgent
        AgentService-->>LLMService: {status: "success", message: "Draft created"}
        deactivate AgentService
    end
    
    LLMService->>DB: Update State & Save Message
    LLMService-->>AIRouter: Response JSON
    deactivate LLMService
    
    AIRouter-->>User: 200 OK {response: "Draft created..."}
```
