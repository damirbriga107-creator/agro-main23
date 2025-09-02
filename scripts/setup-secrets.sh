#!/bin/bash

# setup-secrets.sh - Initialize Docker secrets for production deployment
# This script creates the necessary secret files for Docker Swarm deployment

set -e

SECRETS_DIR="./secrets"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up Docker secrets for DaorsAgro...${NC}"

# Create secrets directory
if [ ! -d "$PROJECT_ROOT/$SECRETS_DIR" ]; then
    echo -e "${YELLOW}Creating secrets directory...${NC}"
    mkdir -p "$PROJECT_ROOT/$SECRETS_DIR"
fi

cd "$PROJECT_ROOT"

# Function to generate random password
generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to create secret file
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local secret_file="$SECRETS_DIR/${secret_name}.txt"
    
    if [ -f "$secret_file" ]; then
        echo -e "${YELLOW}Secret file $secret_file already exists, skipping...${NC}"
        return
    fi
    
    echo -n "$secret_value" > "$secret_file"
    chmod 600 "$secret_file"
    echo -e "${GREEN}✓ Created $secret_file${NC}"
}

# Generate and create secrets
echo -e "${YELLOW}Generating secrets...${NC}"

# Database passwords
DB_PASSWORD=${DB_PASSWORD:-$(generate_password 24)}
create_secret "db_password" "$DB_PASSWORD"

MONGODB_ROOT_PASSWORD=${MONGODB_ROOT_PASSWORD:-$(generate_password 24)}
create_secret "mongodb_root_password" "$MONGODB_ROOT_PASSWORD"

REDIS_PASSWORD=${REDIS_PASSWORD:-$(generate_password 24)}
create_secret "redis_password" "$REDIS_PASSWORD"

# JWT secrets
JWT_SECRET=${JWT_SECRET:-$(generate_password 64)}
create_secret "jwt_secret" "$JWT_SECRET"

JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET:-$(generate_password 64)}
create_secret "jwt_refresh_secret" "$JWT_REFRESH_SECRET"

# API keys (if needed)
API_KEY=${API_KEY:-$(generate_password 32)}
create_secret "api_key" "$API_KEY"

# Create .env.secrets file for development
SECRETS_ENV_FILE="$PROJECT_ROOT/.env.secrets"
if [ ! -f "$SECRETS_ENV_FILE" ]; then
    echo -e "${YELLOW}Creating .env.secrets for development use...${NC}"
    cat > "$SECRETS_ENV_FILE" << EOF
# Generated secrets for development use
# DO NOT commit this file to version control
# For production, use Docker secrets instead

POSTGRES_PASSWORD=$DB_PASSWORD
MONGODB_ROOT_PASSWORD=$MONGODB_ROOT_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
API_KEY=$API_KEY

# Alternative: Use file-based secrets in development
# Uncomment the following lines to use file-based secrets
# POSTGRES_PASSWORD_FILE=./secrets/db_password.txt
# MONGODB_PASSWORD_FILE=./secrets/mongodb_root_password.txt
# REDIS_PASSWORD_FILE=./secrets/redis_password.txt
# JWT_SECRET_FILE=./secrets/jwt_secret.txt
# JWT_REFRESH_SECRET_FILE=./secrets/jwt_refresh_secret.txt
EOF
    echo -e "${GREEN}✓ Created $SECRETS_ENV_FILE${NC}"
fi

# Create gitignore entry for secrets
GITIGNORE_FILE="$PROJECT_ROOT/.gitignore"
if ! grep -q "secrets/" "$GITIGNORE_FILE" 2>/dev/null; then
    echo -e "${YELLOW}Adding secrets/ to .gitignore...${NC}"
    echo "" >> "$GITIGNORE_FILE"
    echo "# Docker secrets" >> "$GITIGNORE_FILE"
    echo "secrets/" >> "$GITIGNORE_FILE"
    echo ".env.secrets" >> "$GITIGNORE_FILE"
    echo -e "${GREEN}✓ Updated .gitignore${NC}"
fi

# Set proper permissions
echo -e "${YELLOW}Setting proper permissions...${NC}"
chmod 700 "$SECRETS_DIR"
find "$SECRETS_DIR" -name "*.txt" -exec chmod 600 {} \;

echo ""
echo -e "${GREEN}✅ Secrets setup completed!${NC}"
echo ""
echo -e "${YELLOW}📝 Important notes:${NC}"
echo "1. Secret files are stored in: $SECRETS_DIR/"
echo "2. Development environment variables are in: .env.secrets"
echo "3. Never commit secret files to version control"
echo "4. For production deployment, use Docker Swarm secrets or Kubernetes secrets"
echo "5. Rotate secrets regularly in production"
echo ""
echo -e "${GREEN}🐳 To deploy with Docker Compose:${NC}"
echo "   docker-compose -f docker-compose.enhanced.yml up -d"
echo ""
echo -e "${GREEN}🚀 For Docker Swarm deployment:${NC}"
echo "   ./scripts/deploy-swarm.sh"
echo ""

# Show secret files created (without showing content)
echo -e "${YELLOW}Secret files created:${NC}"
ls -la "$SECRETS_DIR/"

echo ""
echo -e "${RED}⚠️  Security reminder:${NC}"
echo "   Keep your secret files secure and rotate them regularly!"