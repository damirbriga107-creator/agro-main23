# DaorsAgro Netlify Deployment Guide

This guide provides comprehensive instructions for deploying the DaorsAgro web application to Netlify.

## 📋 Prerequisites

Before deploying to Netlify, ensure you have:

- [x] A Netlify account (free tier available at [netlify.com](https://netlify.com))
- [x] Access to the DaorsAgro repository
- [x] Backend API endpoints configured and accessible
- [x] Environment variables configured for production

## 🚀 Quick Deployment

### Option 1: Deploy from Git Repository

1. **Connect Repository to Netlify**
   - Log in to your Netlify dashboard
   - Click "New site from Git"
   - Choose your Git provider (GitHub, GitLab, or Bitbucket)
   - Select the DaorsAgro repository

2. **Configure Build Settings**
   - **Base directory**: `frontend/packages/web-app`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Production branch**: `main` (or your preferred branch)

3. **Deploy**
   - Click "Deploy site"
   - Netlify will automatically build and deploy your application

### Option 2: Manual Deployment

1. **Build Locally**
   ```bash
   cd frontend/packages/web-app
   npm install
   npm run build
   ```

2. **Deploy via Netlify CLI**
   ```bash
   # Install Netlify CLI globally
   npm install -g netlify-cli
   
   # Login to Netlify
   netlify login
   
   # Deploy to production
   netlify deploy --prod --dir=dist
   ```

## ⚙️ Configuration Files

The following configuration files have been created for optimal Netlify deployment:

### 📄 `netlify.toml`
- **Location**: `frontend/packages/web-app/netlify.toml`
- **Purpose**: Main Netlify configuration file
- **Features**:
  - Build settings and commands
  - Security headers
  - Performance optimizations
  - SPA routing support
  - Environment-specific configurations

### 📄 `_redirects`
- **Location**: `frontend/packages/web-app/public/_redirects`
- **Purpose**: Client-side routing support
- **Features**:
  - React Router compatibility
  - API proxy configuration
  - Static asset handling

### 📄 `.env.netlify`
- **Location**: `frontend/packages/web-app/.env.netlify`
- **Purpose**: Environment variables template
- **Usage**: Reference for setting up Netlify environment variables

## 🔧 Environment Variables Setup

Configure these environment variables in your Netlify dashboard:

### Required Variables

```bash
# API Configuration
VITE_API_BASE_URL=https://api.daorsagro.com
VITE_API_GATEWAY_URL=https://api.daorsagro.com

# Service Endpoints
VITE_AUTH_SERVICE_URL=https://api.daorsagro.com/auth
VITE_FINANCIAL_SERVICE_URL=https://api.daorsagro.com/financial
VITE_SUBSIDY_SERVICE_URL=https://api.daorsagro.com/subsidy
VITE_INSURANCE_SERVICE_URL=https://api.daorsagro.com/insurance
VITE_ANALYTICS_SERVICE_URL=https://api.daorsagro.com/analytics
VITE_DOCUMENT_SERVICE_URL=https://api.daorsagro.com/documents

# Application Configuration
VITE_APP_NAME=DaorsAgro
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production

# Feature Flags
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_REAL_TIME=true

# Build Configuration
NODE_VERSION=20
NPM_VERSION=9
NODE_ENV=production
```

### Setting Environment Variables

1. **Via Netlify Dashboard**:
   - Go to Site settings → Environment variables
   - Add each variable with its corresponding value

2. **Via Netlify CLI**:
   ```bash
   netlify env:set VITE_API_BASE_URL "https://api.daorsagro.com"
   netlify env:set VITE_APP_ENVIRONMENT "production"
   # ... continue for all variables
   ```

## 🔗 Domain Configuration

### Custom Domain Setup

1. **Add Custom Domain**:
   - Go to Site settings → Domain management
   - Click "Add custom domain"
   - Enter your domain (e.g., `app.daorsagro.com`)

2. **Configure DNS**:
   - Add a CNAME record pointing to your Netlify subdomain
   - Or use Netlify DNS for full domain management

3. **SSL Certificate**:
   - Netlify automatically provisions SSL certificates
   - Certificate renewal is handled automatically

### Subdomain Configuration

For development/staging environments:
- **Staging**: `staging.daorsagro.com`
- **Development**: `dev.daorsagro.com`

## 🔒 Security Configuration

### Headers

The `netlify.toml` file includes security headers:

- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: XSS protection
- **X-Content-Type-Options**: MIME type sniffing protection
- **Content-Security-Policy**: Restricts resource loading
- **Referrer-Policy**: Controls referrer information

### Authentication

If using Netlify Identity or external authentication:

1. **Configure Identity Provider**:
   - Go to Site settings → Identity
   - Configure external providers (Google, GitHub, etc.)

2. **Update Environment Variables**:
   ```bash
   VITE_NETLIFY_IDENTITY_URL=https://your-site.netlify.app/.netlify/identity
   ```

## 📊 Performance Optimization

### Build Optimizations

The configuration includes several performance optimizations:

- **Code Splitting**: Automatic vendor chunk splitting
- **Asset Compression**: Gzip compression enabled
- **Caching**: Optimized cache headers
- **Bundle Analysis**: Run `npm run analyze` to analyze bundle size

### Monitoring

1. **Netlify Analytics**: Enable in Site settings → Analytics
2. **Core Web Vitals**: Monitor via Lighthouse plugin
3. **Build Performance**: Track build times and optimization opportunities

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs in Netlify dashboard
   # Common solutions:
   - Verify Node.js version (should be 20+)
   - Check for missing environment variables
   - Ensure all dependencies are properly installed
   ```

2. **Routing Issues**
   ```bash
   # Ensure _redirects file is in the correct location
   # Verify SPA redirect rule: /* /index.html 200
   ```

3. **API Connection Issues**
   ```bash
   # Verify API endpoints are accessible
   # Check CORS configuration on backend
   # Validate environment variables
   ```

4. **PWA Issues**
   ```bash
   # Check service worker registration
   # Verify manifest.json is accessible
   # Test offline functionality
   ```

### Debug Commands

```bash
# Test build locally
npm run build

# Check for TypeScript errors
npm run type-check

# Lint code
npm run lint

# Test production build locally
npm run preview
```

## 🔄 Continuous Deployment

### Automatic Deployments

- **Production**: Triggered on pushes to `main` branch
- **Preview**: Created for all pull requests
- **Branch deploys**: Configured for development branches

### Build Hooks

Set up build hooks for:
- Content updates from CMS
- Scheduled rebuilds
- Manual deployment triggers

```bash
# Example build hook URL
curl -X POST -d {} https://api.netlify.com/build_hooks/YOUR_HOOK_ID
```

## 📚 Additional Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#netlify)
- [React Router Netlify Guide](https://create-react-app.dev/docs/deployment/#netlify)

## 🆘 Support

For deployment issues:

1. Check the [Netlify Community Forum](https://community.netlify.com/)
2. Review build logs in the Netlify dashboard
3. Verify configuration against this guide
4. Contact the development team for application-specific issues

---

**Last Updated**: $(date +%Y-%m-%d)
**Version**: 1.0.0