-- Rollback: 002_add_description_field
-- Description: Remove description field from todos table

-- Remove description column
ALTER TABLE todos DROP COLUMN IF EXISTS description;
