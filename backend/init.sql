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
