# Use Node.js 18 Alpine as base image
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm ci --only=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production dependencies stage
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run setup-db || echo "Database setup will be handled by init container"

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create non-root user and switch to it
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]
