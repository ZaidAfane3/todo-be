# Todo Microservice

A simple REST API microservice for managing todos with PostgreSQL persistence, built for DevOps technical assessment.

Code is Developed By Cursor

## Features

- CRUD operations for todos
- PostgreSQL database persistence
- RESTful API design
- Error handling
- Health check endpoint with database connectivity
- Database migrations
- Connection pooling

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API documentation |
| GET | `/health` | Health check |
| GET | `/to-do` | Get all todos |
| GET | `/to-do/:id` | Get specific todo |
| POST | `/to-do` | Create new todo |
| PUT | `/to-do/:id` | Update todo |
| DELETE | `/to-do/:id` | Delete todo |

## Request/Response Examples

### Create Todo
```bash
POST /to-do
Content-Type: application/json

{
  "title": "Learn DevOps",
  "description": "Study containerization, orchestration, and CI/CD pipelines",
  "completed": false
}
```

### Update Todo
```bash
PUT /to-do/1
Content-Type: application/json

{
  "title": "Learn DevOps - Updated",
  "description": "Master Docker, Kubernetes, and Jenkins for production deployment",
  "completed": true
}
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## Database Setup

1. **Install PostgreSQL** (if not already installed):
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql postgresql-contrib`
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create database**:
```sql
CREATE DATABASE todo_db;
CREATE USER postgres WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE todo_db TO postgres;
```

3. **Configure environment variables**:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_db
DB_USER=postgres
DB_PASSWORD=password
```

## Getting Started

1. **Install dependencies**:
```bash
npm install
```

2. **Setup database**:
```bash
npm run setup-db
# OR use the new migration system
npm run migrate
```

3. **Start the service**:
```bash
npm start
```

4. **For development with auto-reload**:
```bash
npm run dev
```

The service will run on `http://localhost:3000`

## Database Migrations

This project now includes a proper database migration system similar to Prisma:

### Migration Commands

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback

# Rollback specific migration version
npm run migrate:rollback:version 001
```

### Migration Features

- ✅ **Version tracking** - Each migration has a unique version number
- ✅ **State management** - Tracks which migrations have been executed
- ✅ **Rollback support** - Can undo migrations with rollback files
- ✅ **Checksum validation** - Ensures migration integrity
- ✅ **Transaction safety** - Migrations run in database transactions
- ✅ **Status reporting** - Shows which migrations are pending/executed

### Migration File Structure

```
migrations/
├── 000_create_migrations_table.sql          # Migration tracking table
├── 001_create_todos_table.sql               # Create todos table
├── 001_create_todos_table_rollback.sql      # Rollback for todos table
├── 002_add_description_field.sql            # Add description field
└── 002_add_description_field_rollback.sql   # Rollback for description field
```

## Docker Setup

### Using Docker Compose (Recommended)

1. **Start all services** (PostgreSQL + Todo API):
```bash
# Production setup
docker-compose up -d

# Development setup with hot reload
docker-compose -f docker-compose.dev.yml up
```

2. **Stop services**:
```bash
docker-compose down
```

3. **View logs**:
```bash
docker-compose logs -f todo-api
```

### Using Docker Commands

1. **Build the image**:
```bash
npm run docker:build
```

2. **Run with environment file**:
```bash
npm run docker:run
```

### Docker Services

- **PostgreSQL Database**: `localhost:5432`
- **Todo API**: `localhost:3000`
- **Health Check**: `http://localhost:3000/health`

## Testing the API

You can test the API using curl:

```bash
# Get all todos
curl http://localhost:3000/to-do

# Create a new todo
curl -X POST http://localhost:3000/to-do \
  -H "Content-Type: application/json" \
  -d '{"title": "Test todo", "description": "This is a test todo item", "completed": false}'

# Get a specific todo
curl http://localhost:3000/to-do/1

# Update a todo
curl -X PUT http://localhost:3000/to-do/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated todo", "description": "Updated description for the todo", "completed": true}'

# Delete a todo
curl -X DELETE http://localhost:3000/to-do/1
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: todo_db)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: password)
- `NODE_ENV`: Environment (development/production)

## Response Format

All responses follow this format:

```json
{
  "success": true|false,
  "message": "Description",
  "data": {...},
  "error": "Error message (if any)"
}
```
