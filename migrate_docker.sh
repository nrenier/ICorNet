
#!/bin/bash

# ICorNet Database Migration Script
# This script runs the database migration against the PostgreSQL container

echo "Starting ICorNet database migration..."

# Set environment variables for the migration
export DATABASE_URL="postgresql://user:password@localhost:25432/analytics_db"

# Run the migration script
python migrate_db.py

echo "Migration completed!"
