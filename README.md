# Todo Microservice

A Node.js microservice that exposes a REST API for managing todo items persisted in PostgreSQL. The service includes a lightweight migration runner, database health checks, and integrates with an external authentication service via session cookies.

## Features

- Express-based REST API for CRUD operations on todos
- PostgreSQL connection pooling with environment-driven configuration
- Database migration runner with status reporting and rollbacks
- Health endpoint that reports database and auth-service connectivity
- Middleware for validating authenticated sessions through a companion auth service
- Ready-to-use npm scripts for local development, database setup, and Docker packaging

## Tech Stack

- **Runtime:** Node.js 18+ (works with Node 14+, but latest LTS recommended)
- **Framework:** Express 4
- **Database:** PostgreSQL 12+
- **Auth Integration:** External HTTP auth service checked via `AUTH_SERVICE_URL`

## Project Structure

```
.
├── config/             # Database pool configuration
├── middleware/         # Authentication middleware
├── migrations/         # SQL migrations and rollback files
├── models/             # Data-access layer (Todo model)
├── scripts/            # CLI utilities (setup-db, migrate)
├── server.js           # Express application entry point
├── env.example         # Sample environment configuration
├── build-docker.sh     # Helper for building multi-arch Docker images
└── package.json        # Dependencies and npm scripts
```

## Prerequisites

1. **Node.js** – install from [nodejs.org](https://nodejs.org/) (use the latest LTS).
2. **PostgreSQL** – install locally or provision in the cloud.
3. **Auth service (optional for dev)** – endpoints such as `/is-logged-in` and `/health` are expected at `AUTH_SERVICE_URL`. For local development you can stub this service or adjust the middleware.

## Configuration

1. Copy the example environment file and adjust it for your setup:

   ```bash
   cp env.example .env
   ```

2. Update `.env` with database credentials and optional overrides:

   ```dotenv
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=todo_db
   DB_USER=postgres
   DB_PASSWORD=password
   PORT=3000
   NODE_ENV=development
   AUTH_SERVICE_URL=http://localhost:3001  # optional override
   ```

   - `AUTH_SERVICE_URL` is read by the auth middleware and health check. If omitted, `http://localhost:3001` is used.

## Database Setup

1. Create a PostgreSQL database and user (example values shown below):

   ```sql
   CREATE DATABASE todo_db;
   CREATE USER postgres WITH PASSWORD 'password';
   GRANT ALL PRIVILEGES ON DATABASE todo_db TO postgres;
   ```

2. Install Node dependencies and run the migrations:

   ```bash
   npm install
   npm run migrate         # or npm run setup-db to ensure migrations table and run migrations
   ```

   The migration runner stores execution metadata in the `migrations` table and supports rollbacks.

## Running the Service

### Local development

```bash
npm run dev   # start with nodemon and live reload
```

### Production-style start

```bash
npm start     # start once using node server.js
```

The API listens on `http://localhost:3000` (configurable via the `PORT` environment variable).

### Useful npm scripts

| Command | Description |
|---------|-------------|
| `npm run migrate` | Apply pending migrations |
| `npm run migrate:status` | Show executed vs pending migrations |
| `npm run migrate:rollback` | Roll back the last executed migration |
| `npm run migrate:rollback:version <version>` | Roll back a specific migration version |
| `npm run setup-db` | Shortcut that connects to the DB and runs migrations |
| `npm run docker:build` | Build the Docker image tagged `todo-service` |
| `npm run docker:run` | Run the built image locally using `.env` |

For multi-architecture builds, use `./build-docker.sh <tag>` to build amd64/arm64 variants and push to the configured registry.

## API Overview

> **Authentication:** All todo routes require a valid `sessionId` cookie that the auth middleware verifies against the auth service. Include `Cookie: sessionId=<token>` in requests or adjust the middleware for local testing.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API metadata and endpoint listing |
| GET | `/health` | Health status including DB and auth connectivity |
| GET | `/to-do` | Retrieve all todos (requires auth) |
| GET | `/to-do/:id` | Retrieve a single todo by ID (requires auth) |
| POST | `/to-do` | Create a new todo (requires auth) |
| PUT | `/to-do/:id` | Update an existing todo (requires auth) |
| DELETE | `/to-do/:id` | Delete a todo (requires auth) |
| GET | `/user` | Returns authenticated user information |

### Example Requests

Fetch all todos while forwarding a session cookie:

```bash
curl http://localhost:3000/to-do \
  -H "Cookie: sessionId=example-session" | jq
```

Create a todo:

```bash
curl -X POST http://localhost:3000/to-do \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=example-session" \
  -d '{
    "title": "Learn DevOps",
    "description": "Study containerization, orchestration, and CI/CD pipelines",
    "completed": false
  }'
```

### Response Format

All endpoints return JSON with the following shape:

```json
{
  "success": true,
  "message": "Optional status message",
  "data": {},
  "error": "Error details when success=false"
}
```

### Health Check

The `/health` endpoint pings the database and auth service:

```json
{
  "success": true,
  "message": "Todo service is running",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 42.123,
  "database": "connected",
  "authService": "connected"
}
```

## Troubleshooting

- **Auth service unavailable:** Requests to todo endpoints will return `401` or `503`. Set `AUTH_SERVICE_URL` to a reachable stub during development or temporarily bypass the middleware.
- **Database connection errors:** Ensure PostgreSQL is running and reachable from the service host. Double-check credentials in `.env`.
- **Migrations already applied:** The runner tracks checksums. If you modify a migration that has already run, create a new migration instead of editing the old file.

## License

MIT
