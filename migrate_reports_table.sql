
-- Migration script to add missing columns to reports table

-- Add missing columns if they don't exist
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS report_data TEXT,
ADD COLUMN IF NOT EXISTS workflow_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS file_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have updated_at = created_at if null
UPDATE reports SET updated_at = created_at WHERE updated_at IS NULL;
