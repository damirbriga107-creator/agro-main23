# Use Node.js 18 LTS alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY backend/services/analytics-service/package*.json ./
COPY backend/shared/config/package*.json ../shared/config/
COPY backend/shared/types/package*.json ../shared/types/
COPY backend/shared/utils/package*.json ../shared/utils/

# Install dependencies
RUN npm ci --only=production

# Copy shared modules
COPY backend/shared/ ../shared/

# Copy source code
COPY backend/services/analytics-service/src/ ./src/
COPY backend/services/analytics-service/tsconfig.json ./

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S analytics -u 1001

# Change ownership of the app directory
RUN chown -R analytics:nodejs /app
USER analytics

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]