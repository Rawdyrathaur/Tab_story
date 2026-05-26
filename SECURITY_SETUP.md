# 🔐 Enterprise Security Setup Guide

This document explains the production-grade security infrastructure for Tab Story Chrome Extension.

**Table of Contents**
- [Overview](#overview)
- [Folder Structure](#folder-structure)
- [Environment Configuration](#environment-configuration)
- [Git Security](#git-security)
- [Pre-commit Hooks](#pre-commit-hooks)
- [GitHub Security](#github-security)
- [Secret Management](#secret-management)
- [Compliance](#compliance)
- [Troubleshooting](#troubleshooting)

## Overview

This security setup implements **defense-in-depth** with multiple layers:

1. **Local Development** - Pre-commit hooks prevent accidental commits
2. **Push Time** - Pre-push hooks validate before reaching remote
3. **CI/CD Pipeline** - Automated scanning on every push
4. **GitHub Protection** - Branch protection and secret scanning
5. **Build Verification** - Post-build secret detection

## Folder Structure

```
Tab_story/
├── src/                          # Source code (safe zone)
├── config/
│   ├── env.config.js            # Environment loader
│   ├── csp.json                 # Content Security Policy
│   ├── manifest.dev.json        # Development manifest
│   └── manifest.prod.json       # Production manifest
├── env/
│   ├── .env.example             # Template (SAFE - commit this)
│   ├── .env.development         # Dev config
│   ├── .env.staging             # Staging config
│   └── .env.production          # Prod config
├── scripts/
│   ├── hooks/
│   │   ├── pre-commit.sh        # Pre-commit security checks
│   │   └── pre-push.sh          # Pre-push validation
│   ├── detect-secrets.sh        # Secret scanner
│   ├── validate-env.sh          # Environment validator
│   └── clean-history.sh         # History cleanup tool
├── .github/workflows/
│   ├── security-scan.yml        # Security scanning
│   └── build-deploy.yml         # Build & deployment
├── .gitignore                   # Enhanced secret patterns
├── .env.example                 # Root env template
├── eslint.config.js            # Security linting rules
├── husky.config.js             # Git hooks config
└── lint-staged.config.js       # Staged file processing
```

## Environment Configuration

### What SHOULD be committed:
- ✅ `.env.example` - Template with placeholders
- ✅ `.env.development` - Dev-only configuration
- ✅ `.env.staging` - Staging configuration
- ✅ `config/csp.json` - CSP policies
- ✅ `config/manifest.*.json` - Manifest files

### What SHOULD NEVER be committed:
- ❌ `.env` - Local secrets
- ❌ `.env.local` - Personal configuration
- ❌ `.env.production` - Production secrets
- ❌ API keys, tokens, passwords
- ❌ SSH private keys
- ❌ Database credentials

### Environment Variable Naming

Use prefixes to control what reaches the browser:

```javascript
// ✅ SAFE - Sent to frontend (visible in browser)
VITE_API_BASE_URL=https://api.example.com
VITE_FEATURE_ANALYTICS=true

// ❌ UNSAFE - Backend only, never sent to frontend
DATABASE_PASSWORD=secret
PRIVATE_KEY=...
```

**Rule**: Only `VITE_*` prefixed variables are exposed to the browser in Vite builds.

## Git Security

### Pre-commit Hook

Runs BEFORE a commit is created:

```bash
# Detects secrets
# Validates environment files
# Prevents .env commits
# Runs ESLint
```

**What it blocks:**
- `.env` files
- Password assignments
- API keys
- Private key headers
- Known secret formats

### Pre-push Hook

Runs BEFORE pushing to remote:

```bash
# Scans all commits for secrets
# Checks for large files
# Verifies no .env files
# Runs security audit
```

**What it prevents:**
- Pushing commits with hardcoded secrets
- Pushing large binaries
- Accidentally pushing to main

## GitHub Security

### Enable in Repository Settings

```
Settings > Code Security & Analysis
├── Dependabot alerts ✓
├── Dependabot security updates ✓
├── Secret scanning ✓
├── Push protection ✓
└── Private vulnerability reporting ✓
```

### Branch Protection Rules

For `main` branch:

```
Settings > Branches > Branch Protection Rules
├── Require status checks to pass before merging ✓
├── Require branches to be up-to-date ✓
├── Require code reviews ✓
├── Require signed commits (optional)
├── Require secret scanning and push protection to pass ✓
└── Require all conversations to be resolved ✓
```

### GitHub Actions

Security scanning runs on every push:

1. **security-scan.yml** (15 min)
   - Secret detection
   - Environment validation
   - Manifest verification
   - Permission audit

2. **build-deploy.yml** (5 min)
   - Full build
   - Test execution
   - Post-build verification
   - Release creation

## Secret Management

### Adding a Secret

**Development:**
```bash
# Create local config (git-ignored)
cp .env.example .env.local

# Edit with your values
nano .env.local

# Validate
npm run env:validate
```

**Production (CI/CD):**
```bash
# Add to GitHub Secrets
Settings > Secrets and Variables > Actions
├── VITE_API_KEY=xxxxx
├── VITE_AUTH_TOKEN=xxxxx
└── DATABASE_PASSWORD=xxxxx
```

### Rotating a Compromised Key

**Step 1: Immediate Action**
```bash
# Revoke the key in your provider (AWS, GitHub, etc.)
# Update GitHub Secrets if applicable
```

**Step 2: Clean Local History**
```bash
# DRY RUN (no changes)
npm run history:clean:dry -- "old_api_key_pattern"

# EXECUTE (rewrites history)
npm run history:clean -- "old_api_key_pattern"
```

**Step 3: Notify Team**
```bash
# Everyone must re-clone after history rewrite
git clone <repo>

# DO NOT:
git pull (will conflict)
git fetch (will get old history)
```

**Step 4: Create New Key**
```bash
# Update GitHub Secrets
# Update .env.example (if safe to do so)
# Deploy new version
```

## Pre-commit Hooks Setup

### Installation

```bash
# Install husky and dependencies
npm install

# Prepare git hooks
npm run prepare

# Make scripts executable
chmod +x scripts/hooks/*.sh
chmod +x scripts/*.sh
```

### Manual Hook Activation

```bash
# Create .husky directory
mkdir -p .husky

# Copy hooks
cp scripts/hooks/pre-commit.sh .husky/pre-commit
cp scripts/hooks/pre-push.sh .husky/pre-push

# Make executable
chmod +x .husky/pre-commit
chmod +x .husky/pre-push
```

### Bypass Hooks (Emergency Only)

```bash
# ⚠️ DANGEROUS - Only use if absolutely necessary
git commit --no-verify
git push --no-verify

# NEVER use these in normal workflow!
```

## Compliance & Auditing

### Daily Checks

```bash
# Environment validation
npm run env:validate

# Security scan
npm run security:scan

# Code linting
npm run lint

# Dependency audit
npm run security:check
```

### Pre-release Checklist

Before releasing a new version:

- [ ] Run `npm run security:scan`
- [ ] Run `npm run env:validate`
- [ ] Run `npm run lint`
- [ ] Review all commits: `git log --oneline origin/main..HEAD`
- [ ] Check for secrets: `git diff origin/main..HEAD | grep -i "password\|secret\|token\|key"`
- [ ] Run full test suite: `npm test`
- [ ] Build: `npm run build`
- [ ] Create git tag: `git tag -s v1.0.0 -m "Release v1.0.0"`
- [ ] Push: `git push && git push --tags`

## Manifest V3 Security

### Content Security Policy

Development (relaxed for debugging):
```json
"extension_pages": "script-src 'self' 'wasm-unsafe-eval'; ..."
```

Production (strict):
```json
"extension_pages": "script-src 'self'; object-src 'self'; ..."
```

### Key Rules

- ✅ `'self'` - Same-origin resources
- ✅ `'wasm-unsafe-eval'` - WebAssembly (dev only)
- ❌ `'unsafe-inline'` - Never for scripts
- ❌ `'unsafe-eval'` - Never for production

### Permissions Minimization

Only request what you need:

```json
"permissions": [
  "tabs",
  "storage",
  "activeTab",
  "tabGroups",
  "contextMenus",
  "sidePanel",
  "notifications",
  "identity"
]
```

## Troubleshooting

### "Pre-commit hook failed"

**Issue**: Commit blocked by security check

**Solution**:
```bash
# Check what was detected
git diff --cached

# Remove sensitive files
git reset <file>

# Add to .gitignore
echo "*.env" >> .gitignore

# Try commit again
git commit -m "message"
```

### "Pre-push hook failed"

**Issue**: Push blocked by security check

**Solution**:
```bash
# See all commits to be pushed
git log origin/main..HEAD

# Check for secrets
npm run security:scan

# Fix issues and amend
git commit --amend

# Try push again
git push
```

### ".env.local not found"

**Issue**: Environment validation warning

**Solution**:
```bash
# Copy from example
cp .env.example .env.local

# Edit with your values
nano .env.local

# Validate
npm run env:validate
```

### "History rewrite completed" - Team Issues

**Issue**: After running `clean-history.sh --execute`

**Solution for Team**:
```bash
# Don't use git pull or git fetch!
# Full fresh clone required

# Remove old repo
rm -rf Tab_story

# Fresh clone
git clone https://github.com/Rawdyrathaur/Tab_story

# Now pull latest
cd Tab_story
git pull
```

## Best Practices

### ✅ DO

- ✅ Commit `.env.example` with placeholders
- ✅ Use `.env.local` for local development
- ✅ Run `npm run env:validate` daily
- ✅ Review commits before pushing
- ✅ Use feature branches
- ✅ Require code reviews
- ✅ Rotate keys quarterly
- ✅ Use GitHub Secrets for CI/CD
- ✅ Enable branch protection
- ✅ Sign commits (`git commit -S`)

### ❌ DON'T

- ❌ Commit `.env` files
- ❌ Commit API keys or passwords
- ❌ Use `--no-verify` for commits/pushes
- ❌ Reuse old credentials
- ❌ Share credentials via Slack
- ❌ Hardcode secrets in code
- ❌ Use `eval()` or `Function()` constructor
- ❌ Commit to main directly
- ❌ Use `innerHTML` without sanitization
- ❌ Ignore security warnings

## Support & Security Issues

### Report a Security Vulnerability

**DO NOT** open a public issue!

Instead, use GitHub's private security advisory:
- https://github.com/Rawdyrathaur/Tab_story/security/advisories/new

**Or email**: [security contact from SECURITY.md]

### Get Help

- 📖 See SECURITY.md for vulnerability reporting
- 📖 See ENV_GUIDE.md for environment setup
- 📖 See SECRETS_ROTATION.md for key rotation

## Additional Resources

- [OWASP Chrome Extension Security](https://owasp.org/www-project-browser-extension-security/)
- [Manifest V3 Security Guide](https://developer.chrome.com/docs/extensions/mv3/security/)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [Husky Git Hooks](https://typicode.github.io/husky/)
- [ESLint Security Rules](https://github.com/eslint-community/eslint-plugin-security)

---

**Last Updated**: 2026-05-26
**Version**: 1.0.1
**Status**: ✅ Production Ready
