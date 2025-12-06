from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime
import json

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    conversations: List["Conversation"] = Relationship(back_populates="user")
    credentials: List["OAuthCredential"] = Relationship(back_populates="user")

class OAuthCredential(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    access_token: str
    refresh_token: Optional[str] = None
    token_uri: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    scopes: Optional[str] = None
    expiry: Optional[datetime] = None
    
    user: Optional[User] = Relationship(back_populates="credentials")

class Conversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    state: str = Field(default="{}") # JSON string storing current intent and slots
    
    user: Optional[User] = Relationship(back_populates="conversations")
    messages: List["Message"] = Relationship(back_populates="conversation")
    tasks: List["Task"] = Relationship(back_populates="conversation")

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    role: str # "user" or "assistant"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    conversation: Optional[Conversation] = Relationship(back_populates="messages")

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversation.id")
    intent: str
    slots: str # JSON string of parameters used
    status: str = Field(default="pending") # pending, completed, failed
    result: Optional[str] = None # JSON string of the result
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    conversation: Optional[Conversation] = Relationship(back_populates="tasks")
