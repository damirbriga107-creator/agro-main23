# Multi-stage build optimized for Docker Build Cloud
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for better caching
COPY package*.json ./
COPY frontend-app/package*.json ./frontend-app/

# Install dependencies with npm ci for faster, reliable builds
RUN npm ci --only=production --workspace=frontend-app

# Development dependencies for building
FROM base AS dev-deps
WORKDIR /app

COPY package*.json ./
COPY frontend-app/package*.json ./frontend-app/

# Install all dependencies including dev dependencies
RUN npm ci --workspace=frontend-app

# Build stage
FROM dev-deps AS builder
WORKDIR /app

# Copy source code
COPY frontend-app ./frontend-app
COPY tsconfig.json ./

# Build arguments for environment-specific builds
ARG NODE_ENV=production
ARG VITE_API_URL=http://localhost:3000
ARG VITE_APP_NAME=DaorsAgro
ARG VITE_APP_VERSION=1.0.0

ENV NODE_ENV=$NODE_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Build the application
RUN npm run build --workspace=frontend-app

# Production stage with nginx
FROM nginx:alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S daorsagro && \
    adduser -S daorsagro -u 1001

# Copy built application
COPY --from=builder --chown=daorsagro:daorsagro /app/frontend-app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend-app/nginx.conf /etc/nginx/nginx.conf

# Create nginx cache and log directories
RUN mkdir -p /var/cache/nginx /var/log/nginx && \
    chown -R daorsagro:daorsagro /var/cache/nginx /var/log/nginx /usr/share/nginx/html

# Switch to non-root user
USER daorsagro

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Development stage for local development
FROM dev-deps AS development
WORKDIR /app

# Copy source code
COPY frontend-app ./frontend-app

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--workspace=frontend-app"]