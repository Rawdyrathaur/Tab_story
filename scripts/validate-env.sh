#!/bin/bash

##############################################################################
# VALIDATE ENVIRONMENT SCRIPT
# Validates that all required environment variables are set correctly
#
# Usage: ./scripts/validate-env.sh [--strict]
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
STRICT_MODE="${1:-}"

ERRORS=0
WARNINGS=0

##############################################################################
# FUNCTION: Load environment from .env files
##############################################################################
load_env() {
  local env_file=$1
  
  if [ -f "$env_file" ]; then
    # Safely source file, skipping comments and handling errors
    while IFS='=' read -r key value; do
      # Skip comments and empty lines
      [[ "$key" =~ ^#.*$ ]] && continue
      [[ -z "$key" ]] && continue
      
      # Remove surrounding quotes if present
      value="${value%\"}"
      value="${value#\"}"
      
      # Export the variable
      export "$key=$value" 2>/dev/null || true
    done < "$env_file"
  fi
}

##############################################################################
# FUNCTION: Check if variable exists
##############################################################################
check_var_exists() {
  local var_name=$1
  local default_value=$2
  
  if [ -z "${!var_name}" ]; then
    if [ -z "$default_value" ]; then
      echo -e "${RED}❌ MISSING: $var_name${NC}"
      ((ERRORS++))
      return 1
    else
      echo -e "${YELLOW}⚠️  OPTIONAL: $var_name (using default: $default_value)${NC}"
      ((WARNINGS++))
      return 0
    fi
  fi
  
  echo -e "${GREEN}✓ $var_name${NC}"
  return 0
}

##############################################################################
# FUNCTION: Validate variable format
##############################################################################
validate_var_format() {
  local var_name=$1
  local pattern=$2
  local description=$3
  
  local var_value="${!var_name}"
  
  if [ -z "$var_value" ]; then
    return 0
  fi
  
  if ! echo "$var_value" | grep -qE "$pattern"; then
    echo -e "${RED}❌ INVALID: $var_name - $description${NC}"
    echo "   Got: $var_value"
    ((ERRORS++))
    return 1
  fi
  
  echo -e "${GREEN}✓ $var_name format valid${NC}"
  return 0
}

##############################################################################
# FUNCTION: Check for secrets in env
##############################################################################
check_no_secrets() {
  echo ""
  echo -e "${BLUE}🔐 Checking for secrets in environment...${NC}"
  
  local secret_vars=(
    "API_KEY"
    "API_SECRET"
    "PRIVATE_KEY"
    "ACCESS_TOKEN"
    "AUTH_TOKEN"
    "PASSWORD"
    "SECRET"
  )
  
  for var in "${secret_vars[@]}"; do
    # Check all variables matching pattern
    for env_var in $(compgen -e | grep -i "$var" || true); do
      local value="${!env_var}"
      if [ -n "$value" ] && [[ "$value" != *"example"* ]] && [[ "$value" != *"placeholder"* ]]; then
        echo -e "${YELLOW}⚠️  WARNING: Secret-like variable found: $env_var${NC}"
        echo "   Use .env.local for secrets, not .env files"
        ((WARNINGS++))
      fi
    done
  done
}

##############################################################################
# MAIN EXECUTION
##############################################################################

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════"
echo "  ENVIRONMENT VALIDATION"
echo "════════════════════════════════════════════════════════${NC}"
echo ""

# Load environment files
echo "Loading environment from files..."
load_env "$ROOT_DIR/.env.example"
load_env "$ROOT_DIR/.env.local"

NODE_ENV="${NODE_ENV:-development}"
echo "Environment: $NODE_ENV"
echo ""

# Check required variables
echo -e "${BLUE}📋 Checking required variables...${NC}"
check_var_exists "VITE_EXTENSION_NAME"
check_var_exists "NODE_ENV"

echo ""
echo -e "${BLUE}🔍 Checking optional variables...${NC}"
check_var_exists "VITE_API_BASE_URL" "https://api.example.com"
check_var_exists "VITE_LOG_LEVEL" "info"
check_var_exists "VITE_CSP_MODE" "strict"
check_var_exists "VITE_ENABLE_DEBUG" "false"

# Validate formats
echo ""
echo -e "${BLUE}✔️  Validating variable formats...${NC}"
validate_var_format "NODE_ENV" "^(development|staging|production)$" "Must be development, staging, or production"
validate_var_format "VITE_LOG_LEVEL" "^(error|warn|info|debug|trace)$" "Must be error, warn, info, debug, or trace"
validate_var_format "VITE_CSP_MODE" "^(strict|relaxed)$" "Must be strict or relaxed"

# Check for secrets
check_no_secrets

# Check file permissions
echo ""
echo -e "${BLUE}🔒 Checking file permissions...${NC}"

if [ -f "$ROOT_DIR/.env.local" ]; then
  local perms=$(stat -f %OLp "$ROOT_DIR/.env.local" 2>/dev/null || stat -c %a "$ROOT_DIR/.env.local" 2>/dev/null || echo "unknown")
  if [[ "$perms" != *"600"* ]] && [[ "$perms" != "unknown" ]]; then
    echo -e "${YELLOW}⚠️  WARNING: .env.local has permissive permissions: $perms${NC}"
    echo "   Recommend: chmod 600 .env.local"
    ((WARNINGS++))
  fi
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Summary
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ VALIDATION FAILED ($ERRORS errors, $WARNINGS warnings)${NC}"
  exit 1
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  VALIDATION PASSED WITH WARNINGS ($WARNINGS warnings)${NC}"
  if [ "$STRICT_MODE" = "--strict" ]; then
    exit 1
  fi
else
  echo -e "${GREEN}✅ VALIDATION PASSED${NC}"
fi

echo ""
