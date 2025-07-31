
#!/usr/bin/env python3
"""
Database migration script for ICorNet
Automatically updates the database schema to include all required columns and tables.
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from models import db, User, Report, Session, ChatMessage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment variables"""
    return os.getenv('DATABASE_URL', 'postgresql://user:password@localhost:25432/analytics_db')

def run_migrations():
    """Run database migrations"""
    database_url = get_database_url()
    logger.info(f"Connecting to database...")
    
    try:
        # Create engine
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            logger.info("Connected to database successfully")
            
            # Start transaction
            trans = conn.begin()
            
            try:
                # 1. Add report_type column if it doesn't exist
                logger.info("Adding report_type column to reports table...")
                conn.execute(text("""
                    ALTER TABLE reports 
                    ADD COLUMN IF NOT EXISTS report_type VARCHAR(50) DEFAULT 'suk'
                """))
                
                # 2. Update existing records to have default report_type
                logger.info("Updating existing reports with default report_type...")
                result = conn.execute(text("""
                    UPDATE reports 
                    SET report_type = 'suk' 
                    WHERE report_type IS NULL
                """))
                logger.info(f"Updated {result.rowcount} records with default report_type")
                
                # 3. Ensure chat_messages table has proper structure
                logger.info("Updating chat_messages table structure...")
                conn.execute(text("""
                    ALTER TABLE chat_messages 
                    ADD COLUMN IF NOT EXISTS user_id VARCHAR(100)
                """))
                
                # 4. Create indexes for better performance
                logger.info("Creating database indexes...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_reports_user_id_type 
                    ON reports(user_id, report_type)
                """))
                
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_reports_created_at 
                    ON reports(created_at DESC)
                """))
                
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id 
                    ON chat_messages(user_id)
                """))
                
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp 
                    ON chat_messages(timestamp DESC)
                """))
                
                # Commit transaction
                trans.commit()
                logger.info("All migrations completed successfully!")
                
            except Exception as e:
                trans.rollback()
                logger.error(f"Migration failed, rolling back: {str(e)}")
                raise
                
    except SQLAlchemyError as e:
        logger.error(f"Database connection failed: {str(e)}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        sys.exit(1)

def verify_schema():
    """Verify that the schema is correct"""
    database_url = get_database_url()
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Check if report_type column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'reports' AND column_name = 'report_type'
            """))
            
            if result.fetchone():
                logger.info("✓ report_type column exists in reports table")
            else:
                logger.error("✗ report_type column missing from reports table")
                return False
                
            # Check indexes
            result = conn.execute(text("""
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename = 'reports' AND indexname = 'idx_reports_user_id_type'
            """))
            
            if result.fetchone():
                logger.info("✓ Performance indexes are in place")
            else:
                logger.warning("⚠ Some performance indexes may be missing")
            
            logger.info("Schema verification completed")
            return True
            
    except Exception as e:
        logger.error(f"Schema verification failed: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting ICorNet database migration...")
    
    if "--verify" in sys.argv:
        verify_schema()
    else:
        run_migrations()
        verify_schema()
    
    logger.info("Migration process completed")
