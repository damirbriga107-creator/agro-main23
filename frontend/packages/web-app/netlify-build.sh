#!/bin/bash
# Netlify build script for DaorsAgro web application

set -e  # Exit on any error

echo "🚀 Starting Netlify build for DaorsAgro..."

# Check Node.js version
echo "📋 Checking Node.js version..."
node --version
npm --version

# Install dependencies
echo "📦 Installing dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci
else
    npm install
fi

# Run type checking
echo "🔍 Running TypeScript type checking..."
npm run type-check

# Run linting
echo "🔧 Running ESLint..."
npm run lint

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ -d "dist" ]; then
    echo "✅ Build completed successfully!"
    echo "📊 Build statistics:"
    du -sh dist/
    find dist/ -name "*.js" -o -name "*.css" | wc -l | xargs echo "Generated files:"
else
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Verify critical files exist
echo "🔍 Verifying build output..."
required_files=("dist/index.html" "dist/assets")
for file in "${required_files[@]}"; do
    if [ ! -e "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

echo "✅ All required files present"
echo "🎉 Netlify build completed successfully!"