-- Migration: 001_create_todos_table
-- Description: Create todos table with basic structure

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on title for better search performance
CREATE INDEX IF NOT EXISTS idx_todos_title ON todos(title);

-- Create index on completed status for filtering
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);

-- Insert some sample data
INSERT INTO todos (title, description, completed) VALUES 
    ('Learn DevOps', 'Study containerization, orchestration, and CI/CD pipelines', false),
    ('Build microservices', 'Create scalable microservice architecture with proper API design', true)
ON CONFLICT DO NOTHING;