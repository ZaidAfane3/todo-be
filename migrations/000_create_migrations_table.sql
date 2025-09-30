-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(255)
);

-- Create index on version for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_version ON migrations(version);
