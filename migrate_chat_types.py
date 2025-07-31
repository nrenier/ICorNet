
#!/usr/bin/env python3
"""
Migration script to add chat_type column to chat_messages table
"""

import os
from sqlalchemy import create_engine, text
from config import Config

def migrate_database():
    """Add chat_type column to existing chat_messages table"""
    
    # Get database URL from config
    database_url = Config.DATABASE_URL
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        return False
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Check if column already exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='chat_messages' AND column_name='chat_type'
            """))
            
            if result.fetchone():
                print("Column 'chat_type' already exists in chat_messages table")
                return True
            
            # Add the chat_type column
            print("Adding chat_type column to chat_messages table...")
            connection.execute(text("""
                ALTER TABLE chat_messages 
                ADD COLUMN chat_type VARCHAR(20) NOT NULL DEFAULT 'SUK'
            """))
            connection.commit()
            
            print("✓ Successfully added chat_type column")
            print("✓ All existing messages default to 'SUK' type")
            
            return True
            
    except Exception as e:
        print(f"ERROR during migration: {str(e)}")
        return False

if __name__ == "__main__":
    print("Starting chat_type column migration...")
    success = migrate_database()
    
    if success:
        print("Migration completed successfully!")
    else:
        print("Migration failed!")
        exit(1)
