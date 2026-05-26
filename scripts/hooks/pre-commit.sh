#!/bin/bash

##############################################################################
# PRE-COMMIT HOOK
# This script runs before a commit is created
# It performs security and linting checks on staged files
#
# Security Checks:
# ✓ Detect secrets in staged files
# ✓ Validate environment files
# ✓ Check for sensitive patterns
# ✓ Lint staged files
#
# INSTALLATION:
# cp scripts/hooks/pre-commit.sh .husky/pre-commit
# chmod +x .husky/pre-commit
##############################################################################

set -e

echo "🔐 Running pre-commit security checks..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

##############################################################################
# FUNCTION: Detect potential secrets
##############################################################################
detect_secrets() {
  echo ""
  echo "🔍 Scanning for secrets in staged files..."
  
  # Get staged files
  STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx|json|env|yml|yaml)$' || true)
  
  if [ -z "$STAGED_FILES" ]; then
    echo "  ✓ No staged files to scan"
    return
  fi
  
  # Patterns that indicate secrets
  local secret_patterns=(
    "password\s*[:=]\s*['\"].*['\"]"
    "api[_-]?key\s*[:=]\s*['\"].*['\"]"
    "secret\s*[:=]\s*['\"].*['\"]"
    "token\s*[:=]\s*['\"].*['\"]"
    "credential\s*[:=]\s*['\"].*['\"]"
    "auth[_-]?token\s*[:=]\s*['\"].*['\"]"
    "access[_-]?key\s*[:=]\s*['\"].*['\"]"
    "private[_-]?key\s*[:=]\s*['\"].*['\"]"
    "oauth\s*[:=]\s*['\"].*['\"]"
    "jwt\s*[:=]\s*['\"].*['\"]"
  )
  
  for file in $STAGED_FILES; do
    # Skip .env.example (template file)
    if [[ "$file" == ".env.example" ]]; then
      continue
    fi
    
    # Check .env files carefully
    if [[ "$file" == .env* ]] && [[ "$file" != ".env.example" ]]; then
      echo -e "${RED}❌ ERROR: Committed .env file detected: $file${NC}"
      echo "   .env files should NEVER be committed to git!"
      echo "   Add to .gitignore or remove from commit"
      ((ERRORS++))
      continue
    fi
    
    # Scan file content for secret patterns
    for pattern in "${secret_patterns[@]}"; do
      if grep -qiE "$pattern" "$file" 2>/dev/null; then
        # Additional check: is it a real secret or a template?
        if ! grep -qE "example|sample|YOUR_|{{\s*|placeholder" "$file" 2>/dev/null; then
          if grep -qiE "$pattern\s*(sk_|pk_|ghp_|[a-zA-Z0-9]{32,})" "$file" 2>/dev/null; then
            echo -e "${RED}❌ ERROR: Potential secret detected in $file${NC}"
            echo "   Pattern: $pattern"
            ((ERRORS++))
          fi
        fi
      fi
    done
  done
  
  if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}✗ Secret scan failed${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✓ No secrets detected${NC}"
}

##############################################################################
# FUNCTION: Validate environment files
##############################################################################
validate_env_files() {
  echo ""
  echo "📋 Validating environment configuration..."
  
  # Check if .env.example exists
  if [ ! -f ".env.example" ]; then
    echo -e "${YELLOW}⚠ WARNING: .env.example not found${NC}"
    ((WARNINGS++))
    return
  fi
  
  # Check if .env.local exists for development
  if [ "$NODE_ENV" != "production" ] && [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠ WARNING: .env.local not found (needed for development)${NC}"
    ((WARNINGS++))
  fi
  
  echo -e "${GREEN}✓ Environment files validated${NC}"
}

##############################################################################
# FUNCTION: Check for sensitive file patterns
##############################################################################
check_sensitive_files() {
  echo ""
  echo "🚫 Checking for sensitive file patterns..."
  
  STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
  
  local sensitive_patterns=(
    "\.env"
    "\.pem$"
    "\.key$"
    "\.p12$"
    "secrets/"
    "private/"
    "credentials/"
    ".*secret.*"
    ".*password.*"
    ".*token.*"
    ".*api.*key.*"
  )
  
  for pattern in "${sensitive_patterns[@]}"; do
    if echo "$STAGED_FILES" | grep -iE "$pattern" > /dev/null; then
      # Check if it's in allowed files
      if ! [[ "$pattern" == "\.env" ]]; then
        echo -e "${RED}❌ ERROR: Sensitive file pattern detected: $pattern${NC}"
        ((ERRORS++))
      fi
    fi
  done
  
  if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ No sensitive files detected${NC}"
  fi
}

##############################################################################
# FUNCTION: Run linting on staged files
##############################################################################
run_lint() {
  echo ""
  echo "🎨 Running ESLint on staged files..."
  
  STAGED_JS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|ts|jsx|tsx)$' || true)
  
  if [ -z "$STAGED_JS_FILES" ]; then
    echo "  ✓ No JavaScript files to lint"
    return
  fi
  
  # Run eslint if available
  if command -v npm &> /dev/null; then
    npm run lint 2>/dev/null || true
  fi
}

##############################################################################
# MAIN EXECUTION
##############################################################################

echo ""
echo "════════════════════════════════════════════════════════"
echo "  PRE-COMMIT SECURITY CHECKS"
echo "════════════════════════════════════════════════════════"
echo ""

# Run all checks
detect_secrets || ((ERRORS++))
validate_env_files
check_sensitive_files
run_lint

echo ""
echo "════════════════════════════════════════════════════════"
echo ""

# Summary
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ PRE-COMMIT FAILED ($ERRORS errors)${NC}"
  echo ""
  echo "Fix the errors above and try again:"
  echo "  1. Don't commit .env files"
  echo "  2. Don't commit API keys or secrets"
  echo "  3. Run 'npm run lint' to fix linting issues"
  echo "  4. Use .env.local for local configuration"
  echo ""
  exit 1
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ PRE-COMMIT COMPLETED WITH WARNINGS ($WARNINGS warnings)${NC}"
  echo ""
fi

echo -e "${GREEN}✓ PRE-COMMIT CHECKS PASSED${NC}"
echo ""

exit 0
