-- Migration: 002_add_description_field
-- Description: Add description field to todos table

-- Add description column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'todos' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE todos ADD COLUMN description TEXT;
    END IF;
END $$;

-- Update existing todos with sample descriptions if they don't have any
UPDATE todos 
SET description = CASE 
    WHEN title = 'Learn DevOps' THEN 'Study containerization, orchestration, and CI/CD pipelines'
    WHEN title = 'Build microservices' THEN 'Create scalable microservice architecture with proper API design'
    ELSE 'No description provided'
END
WHERE description IS NULL;