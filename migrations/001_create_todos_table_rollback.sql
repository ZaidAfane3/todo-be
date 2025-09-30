-- Rollback: 001_create_todos_table
-- Description: Remove todos table and related indexes

-- Drop indexes
DROP INDEX IF EXISTS idx_todos_completed;
DROP INDEX IF EXISTS idx_todos_title;

-- Drop todos table
DROP TABLE IF EXISTS todos;
