-- Migration script to update the database schema

-- Add initial tables and columns

-- Example: Create a users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Example: Create a reports table
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Update existing records to have updated_at = created_at if null
UPDATE reports SET updated_at = created_at WHERE updated_at IS NULL;

-- Update chat_messages table structure
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS session_id VARCHAR(100);

-- Create index for better performance on user_id queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);