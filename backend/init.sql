-- Create User table
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    name VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Create Index on email for faster lookups
CREATE INDEX IF NOT EXISTS ix_user_email ON "user" (email);

-- Create OAuthCredential table
CREATE TABLE IF NOT EXISTS oauthcredential (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    access_token VARCHAR NOT NULL,
    refresh_token VARCHAR,
    token_uri VARCHAR,
    client_id VARCHAR,
    client_secret VARCHAR,
    scopes VARCHAR,
    expiry TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE
);

-- Create Conversation table
CREATE TABLE IF NOT EXISTS conversation (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    state VARCHAR NOT NULL,
    CONSTRAINT fk_user_conversation FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE
);

-- Create Message table
CREATE TABLE IF NOT EXISTS message (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role VARCHAR NOT NULL,
    content VARCHAR NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES conversation (id) ON DELETE CASCADE
);
