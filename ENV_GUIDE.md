# 🔑 Environment Variables Guide

Complete guide for managing environment variables in Tab Story.

## Quick Start

```bash
# 1. Copy template
cp .env.example .env.local

# 2. Edit with your values
nano .env.local

# 3. Validate
npm run env:validate

# 4. Done! Start development
npm run dev
```

## Environment Files

### `.env.example` ✅ COMMIT THIS

Template with all possible variables and descriptions. No real values.

```bash
git add .env.example
git commit -m "Update environment template"
git push
```

### `.env.local` ❌ NEVER COMMIT

Your personal development configuration. Automatically git-ignored.

```bash
# Created locally only
cp .env.example .env.local
nano .env.local
# Make your changes
# Never commit!
```

### `.env.development` ✅ COMMIT

Default values for development environment. No secrets.

```bash
NODE_ENV=development
VITE_ENABLE_DEBUG=true
VITE_LOG_LEVEL=debug
```

### `.env.staging` ✅ COMMIT

Configuration for staging/testing environment. No secrets.

```bash
NODE_ENV=staging
VITE_ENABLE_DEBUG=true
VITE_CSP_MODE=strict
```

### `.env.production` ❌ NEVER COMMIT

Production configuration with minimal permissions. Only in CI/CD via GitHub Secrets.

```bash
NODE_ENV=production
VITE_ENABLE_DEBUG=false
VITE_CSP_MODE=strict
```

## Variable Categories

### 📍 Location-based

```bash
# Development (localhost)
VITE_DEV_SERVER_HTTPS=false
VITE_DEV_TOOLS_PORT=3000

# Production (deployed)
VITE_PROD_ENDPOINT=https://www.google.com/
VITE_PROD_SENTRY_DSN=
```

### 🔑 API Keys & Secrets

**❌ NEVER hardcode these:**
```bash
# DON'T DO THIS:
VITE_API_KEY=sk_live_xxxxxxxxxxxxx      # Wrong! Will leak to browser
API_SECRET=my_secret_key                 # Wrong! Visible in git
```

**✅ Store in GitHub Secrets instead:**
```yaml
# .github/workflows/build-deploy.yml
env:
  API_KEY: ${{ secrets.API_KEY }}
  API_SECRET: ${{ secrets.API_SECRET }}
```

**✅ OR use runtime environment variables:**
```bash
# In CI/CD environment
export API_KEY=sk_live_xxxxxxxxxxxxx
npm run build
```

### 🎨 Feature Flags

```bash
# Enable/disable features
VITE_FEATURE_ANALYTICS=true
VITE_FEATURE_AUTO_BACKUP=true
VITE_FEATURE_TIMELINE=true
VITE_FEATURE_DARK_MODE=true
VITE_FEATURE_SMART_CLUSTERING=true
```

### 🔒 Security Configuration

```bash
# Content Security Policy mode
VITE_CSP_MODE=strict                     # Production
VITE_CSP_MODE=relaxed                    # Development

# Debug information exposure
VITE_ENABLE_DEBUG=false                  # Production
VITE_ENABLE_DEBUG=true                   # Development

# Source map generation
VITE_ENABLE_SOURCE_MAPS=false            # Production (no leak!)
VITE_ENABLE_SOURCE_MAPS=true             # Development

# Logging level
VITE_LOG_LEVEL=warn                      # Production
VITE_LOG_LEVEL=debug                     # Development
```

### 📊 Performance & Monitoring

```bash
# Performance monitoring
VITE_PERFORMANCE_MONITORING=false        # Production
VITE_PERFORMANCE_MONITORING=true         # Development

# Memory limits
VITE_MEMORY_LIMIT_MB=256

# Timeout settings
VITE_API_TIMEOUT=5000
```

### 🔧 Build Configuration

```bash
# Minification
VITE_MINIFY=true                         # Production
VITE_MINIFY=false                        # Development

# Build target
VITE_BUILD_TARGET=es2020
```

### 📱 Notification & Storage

```bash
# Notification settings
VITE_NOTIFICATION_SOUND=enabled
VITE_NOTIFICATION_BADGE=enabled

# Storage configuration
VITE_STORAGE_TYPE=local
VITE_STORAGE_QUOTA_MB=100
```

## Loading Behavior

Environment variables are loaded in this order (last wins):

```
1. .env.example (defaults)
2. .env.{NODE_ENV} (environment-specific)
3. .env.local (local overrides)
4. System environment variables (highest priority)
```

### Example Loading

```bash
# If NODE_ENV=development:
# 1. Load from .env.example
# 2. Override with .env.development
# 3. Override with .env.local
# 4. Override with process.env

NODE_ENV=development npm run dev
```

## Accessing Variables in Code

### ✅ Correct: Use VITE_ prefix (frontend)

```javascript
// Only VITE_ prefixed variables reach the browser
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true';
const logLevel = import.meta.env.VITE_LOG_LEVEL || 'info';
```

### ✅ Correct: Use process.env (backend/build)

```javascript
// In build scripts, config files (not sent to browser)
const nodeEnv = process.env.NODE_ENV;
const apiSecret = process.env.API_SECRET; // ❌ Never expose this!
```

### ❌ Wrong: Don't use unfiltered env

```javascript
// This sends ALL variables to the browser - SECURITY RISK!
const config = {
  ...process.env,  // DON'T DO THIS!
};
```

## Type Safety

Explicitly convert environment variables:

```javascript
// String (default)
const logLevel = import.meta.env.VITE_LOG_LEVEL; // 'debug'

// Boolean
const isDebug = import.meta.env.VITE_ENABLE_DEBUG === 'true';
const hasAnalytics = import.meta.env.VITE_ENABLE_ANALYTICS !== 'false';

// Number
const timeout = parseInt(import.meta.env.VITE_API_TIMEOUT, 10);
const memoryLimit = parseInt(import.meta.env.VITE_MEMORY_LIMIT_MB, 10);

// JSON
const config = JSON.parse(import.meta.env.VITE_CONFIG || '{}');
```

## Validation

### Check environment at startup

```javascript
// src/config/validateEnv.js
export function validateEnvironment() {
  const required = [
    'VITE_EXTENSION_NAME',
    'NODE_ENV',
  ];

  for (const key of required) {
    if (!import.meta.env[key]) {
      throw new Error(`❌ Missing required: ${key}`);
    }
  }

  // Validate format
  if (!['development', 'staging', 'production'].includes(import.meta.env.NODE_ENV)) {
    throw new Error(`❌ Invalid NODE_ENV: ${import.meta.env.NODE_ENV}`);
  }

  console.log('✓ Environment validation passed');
}

// In main.js
validateEnvironment();
```

### CLI validation

```bash
# Validate before running
npm run env:validate

# Strict mode (fails on warnings)
npm run env:validate:strict
```

## Secrets Management

### Do NOT put secrets in .env files

```bash
# ❌ WRONG
API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
AUTH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxx
DATABASE_PASSWORD=my_super_secret
```

### Use GitHub Secrets instead

```yaml
# .github/workflows/build-deploy.yml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      API_KEY: ${{ secrets.API_KEY }}
      AUTH_TOKEN: ${{ secrets.AUTH_TOKEN }}
```

### Or use system environment

```bash
# Export before running
export API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
export AUTH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxx

npm run build
```

## Common Issues

### "❌ MISSING: VITE_API_BASE_URL"

**Problem**: Variable not found

**Solution**:
```bash
# Check if .env.local exists
ls -la .env.local

# If not, create it
cp .env.example .env.local

# Check the variable
grep VITE_API_BASE_URL .env.local

# If empty, add value
echo "VITE_API_BASE_URL=https://api.example.com" >> .env.local
```

### "⚠️ Secret-like variable found"

**Problem**: Variable name suggests it contains secrets

**Solution**:
```bash
# Don't store in .env files
# Use GitHub Secrets instead

# Remove from .env.local
grep -v "API_KEY\|SECRET\|PASSWORD" .env.local > .env.local.tmp
mv .env.local.tmp .env.local

# Add to GitHub Secrets
# Settings > Secrets and Variables > Actions
```

### "Error: import.meta.env is undefined"

**Problem**: Using in Node.js environment

**Solution**:
```javascript
// This only works in browser/Vite build
// In Node.js files, use process.env instead

// ❌ WRONG (Node.js file)
const url = import.meta.env.VITE_API_URL;

// ✅ RIGHT (Node.js file)
const url = process.env.VITE_API_URL;
```

### Different values in dev vs build

**Problem**: Works in dev, breaks in production

**Solution**:
```bash
# Check both environments
NODE_ENV=development npm run env:validate
NODE_ENV=production npm run env:validate

# Ensure .env.production has all needed values
diff .env.development .env.production
```

## Migration from Old Setup

### If upgrading from no-env system:

```bash
# 1. Create template
cp .env.example .env.local

# 2. Add your current values
# Edit .env.local with any existing configuration

# 3. Update code to use import.meta.env
# Replace hardcoded values with env variables

# 4. Test thoroughly
npm run dev
npm run build
npm run env:validate

# 5. Commit template only
git add .env.example
git commit -m "Add environment configuration template"

# 6. .env.local is already in .gitignore
# Verify: grep .env .gitignore
```

## Reference

### All Available Variables

See `.env.example` for complete list with descriptions.

Quick reference:
- `NODE_ENV` - Environment type
- `VITE_*` - Frontend variables (safe)
- `VITE_EXTENSION_*` - Extension metadata
- `VITE_ENABLE_*` - Feature toggles
- `VITE_CSP_*` - Security policies
- `VITE_LOG_*` - Logging configuration
- `VITE_API_*` - API configuration
- `VITE_FEATURE_*` - Feature flags
- `VITE_STORAGE_*` - Storage configuration
- `VITE_NOTIFICATION_*` - Notification settings
- `VITE_PERFORMANCE_*` - Performance monitoring

## Security Checklist

- [ ] Created `.env.local` from `.env.example`
- [ ] Never committed `.env.local`
- [ ] Never committed API keys or tokens
- [ ] Using VITE_ prefix for frontend variables
- [ ] Validated with `npm run env:validate`
- [ ] GitHub Secrets configured for CI/CD
- [ ] `.gitignore` includes `*.env` and `.env.local`
- [ ] Team members have setup guide
- [ ] Environment documented in README.md

## Need Help?

- 📖 See `SECURITY_SETUP.md` for security practices
- 📖 See `SECRETS_ROTATION.md` for key rotation
- 📖 See `.env.example` for all available variables
- 📖 Run `npm run env:validate` to check setup

---

**Last Updated**: 2026-05-26
**Version**: 1.0.1
