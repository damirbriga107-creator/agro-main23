# Multi-stage build optimized for Docker Build Cloud
# This Dockerfile demonstrates best practices for fast builds and efficient caching

# Base stage with common dependencies
FROM node:20-alpine AS base

# Install system dependencies that rarely change
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Create non-root user early for security
RUN addgroup -g 1001 -S daorsagro && \
    adduser -S daorsagro -u 1001

# Dependencies stage - optimized for caching
FROM base AS deps

# Copy package files first for better layer caching
COPY package*.json ./
COPY backend/services/auth-service/package*.json ./backend/services/auth-service/
COPY backend/shared/*/package*.json ./backend/shared/

# Install production dependencies only
RUN npm ci --only=production --workspace=backend/services/auth-service && \
    npm cache clean --force

# Development dependencies stage
FROM base AS dev-deps

# Copy package files
COPY package*.json ./
COPY backend/services/auth-service/package*.json ./backend/services/auth-service/
COPY backend/shared/*/package*.json ./backend/shared/

# Install all dependencies including dev dependencies
RUN npm ci --workspace=backend/services/auth-service && \
    npm cache clean --force

# Build stage
FROM dev-deps AS builder

# Build arguments for environment-specific builds
ARG NODE_ENV=production
ARG BUILD_TYPE=production

ENV NODE_ENV=$NODE_ENV
ENV BUILD_TYPE=$BUILD_TYPE

# Copy shared dependencies first (changes less frequently)
COPY backend/shared ./backend/shared
COPY tsconfig.json ./

# Copy service source code
COPY backend/services/auth-service/src ./backend/services/auth-service/src
COPY backend/services/auth-service/tsconfig.json ./backend/services/auth-service/
COPY backend/services/auth-service/prisma ./backend/services/auth-service/prisma

# Generate Prisma client
RUN npx prisma generate --schema=backend/services/auth-service/prisma/schema.prisma

# Build the application
RUN npm run build --workspace=backend/services/auth-service

# Production stage
FROM base AS production

# Copy production dependencies from deps stage
COPY --from=deps --chown=daorsagro:daorsagro /app/node_modules ./node_modules
COPY --from=deps --chown=daorsagro:daorsagro /app/backend/services/auth-service/node_modules ./backend/services/auth-service/node_modules

# Copy built application from builder stage
COPY --from=builder --chown=daorsagro:daorsagro /app/backend/services/auth-service/dist ./backend/services/auth-service/dist
COPY --from=builder --chown=daorsagro:daorsagro /app/backend/shared ./backend/shared

# Copy package.json for runtime
COPY --from=builder --chown=daorsagro:daorsagro /app/backend/services/auth-service/package*.json ./backend/services/auth-service/

# Copy Prisma schema and generated client
COPY --from=builder --chown=daorsagro:daorsagro /app/backend/services/auth-service/prisma ./backend/services/auth-service/prisma

# Copy email templates
COPY --from=builder --chown=daorsagro:daorsagro /app/backend/services/auth-service/src/templates ./backend/services/auth-service/templates

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R daorsagro:daorsagro logs uploads

# Switch to non-root user
USER daorsagro

# Set working directory to service
WORKDIR /app/backend/services/auth-service

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application with dumb-init for proper signal handling
CMD ["dumb-init", "node", "dist/index.js"]

# Development stage for local development
FROM dev-deps AS development

# Copy source code for development
COPY backend/shared ./backend/shared
COPY backend/services/auth-service ./backend/services/auth-service
COPY tsconfig.json ./

# Generate Prisma client for development
RUN npx prisma generate --schema=backend/services/auth-service/prisma/schema.prisma

# Set working directory
WORKDIR /app/backend/services/auth-service

# Switch to non-root user
USER daorsagro

# Expose port
EXPOSE 3001

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Test stage for running tests
FROM dev-deps AS test

# Copy all source code
COPY backend/shared ./backend/shared
COPY backend/services/auth-service ./backend/services/auth-service
COPY tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate --schema=backend/services/auth-service/prisma/schema.prisma

# Set working directory
WORKDIR /app/backend/services/auth-service

# Run tests
CMD ["npm", "test"]