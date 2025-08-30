# Multi-stage build for production optimization
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/services/subsidy-service/package*.json ./backend/services/subsidy-service/
COPY backend/shared/*/package*.json ./backend/shared/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY backend/services/subsidy-service/src ./backend/services/subsidy-service/src
COPY backend/shared ./backend/shared
COPY tsconfig.json ./

# Build the application
RUN npm run build --workspace=backend/services/subsidy-service

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S daorsagro && \
    adduser -S daorsagro -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=daorsagro:daorsagro /app/backend/services/subsidy-service/dist ./dist
COPY --from=builder --chown=daorsagro:daorsagro /app/node_modules ./node_modules
COPY --from=builder --chown=daorsagro:daorsagro /app/backend/services/subsidy-service/package*.json ./

# Create logs directory
RUN mkdir -p logs && chown -R daorsagro:daorsagro logs

# Switch to non-root user
USER daorsagro

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["node", "dist/index.js"]