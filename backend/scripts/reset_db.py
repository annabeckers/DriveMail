from sqlmodel import SQLModel
from app.database import engine
from app.models import User, OAuthCredential, Conversation, Message

def reset_db():
    print("Dropping all tables...")
    SQLModel.metadata.drop_all(engine)
    print("Creating all tables...")
    SQLModel.metadata.create_all(engine)
    print("Database reset complete.")

if __name__ == "__main__":
    reset_db()
