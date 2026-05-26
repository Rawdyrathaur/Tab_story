#!/bin/bash

##############################################################################
# DETECT SECRETS SCRIPT
# Comprehensive secret detection using multiple methods
#
# This script can be run independently to scan the codebase for secrets
# Usage: ./scripts/detect-secrets.sh [--fix]
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

SECRETS_FOUND=0
FIX_MODE="${1:-}"

##############################################################################
# Secret Patterns Database
##############################################################################
SECRET_PATTERNS=(
  "AKIA[0-9A-Z]\{16\}"                                # AWS API Key
  "aws_secret_access_key\s*=\s*['\"]?[a-zA-Z0-9/+=]\{40\}['\"]?"  # AWS Secret
  "ghp_[A-Za-z0-9_]{36,255}"                          # GitHub Token
  "gho_[A-Za-z0-9_]{36,255}"                          # GitHub OAuth
  "ghu_[A-Za-z0-9_]{36,255}"                          # GitHub App
  "api[_-]?key\s*[:=]\s*['\"]?[a-zA-Z0-9_-]{20,}['\"]?"  # Generic API Key
  "password\s*[:=]\s*['\"][^'\"]{8,}['\"]"            # Password Assignment
  "-----BEGIN.*PRIVATE KEY-----"                      # Private Key Header
)

##############################################################################
# FUNCTION: Print colored message
##############################################################################
print_message() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

##############################################################################
# FUNCTION: Scan a single file
##############################################################################
scan_file() {
  local file=$1
  local file_secrets=0
  
  # Skip binary files
  if file "$file" | grep -q "binary"; then
    return 0
  fi
  
  # Skip large files (>10MB)
  if [ $(stat -f%z "$file" 2>/dev/null || echo 0) -gt 10485760 ]; then
    return 0
  fi
  
  for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -qE "$pattern" "$file" 2>/dev/null; then
      if [ $file_secrets -eq 0 ]; then
        print_message "$RED" "❌ $file"
        ((file_secrets++))
      fi
      
      # Show the line (masked)
      echo "   Found potential secret pattern"
      grep -n -E "$pattern" "$file" 2>/dev/null | sed 's/:.*/: [REDACTED]/' | sed 's/^/     /' || true
      ((SECRETS_FOUND++))
    fi
  done
  
  return 0
}

##############################################################################
# FUNCTION: Scan directory
##############################################################################
scan_directory() {
  local dir=$1
  
  print_message "$BLUE" "🔍 Scanning directory: $dir"
  
  # Exclude common directories
  local exclude_dirs="-path ./node_modules -prune -o -path ./.git -prune -o -path ./coverage -prune -o -path ./dist -prune -o"
  
  while IFS= read -r -d '' file; do
    scan_file "$file"
  done < <(find "$dir" $exclude_dirs -type f -print0)
}

##############################################################################
# FUNCTION: Check git history
##############################################################################
check_git_history() {
  print_message "$BLUE" "📜 Checking git history for secrets..."
  
  # Scan all commits (limit to last 50 for speed)
  local commit_count=0
  while IFS= read -r commit; do
    ((commit_count++))
    
    # Get the diff for this commit
    git show "$commit" 2>/dev/null | while IFS= read -r line; do
      for pattern in "${SECRET_PATTERNS[@]}"; do
        if echo "$line" | grep -qE "$pattern"; then
          print_message "$RED" "❌ Secret found in commit: $commit"
          ((SECRETS_FOUND++))
          break
        fi
      done
    done
  done < <(git rev-list --all 2>/dev/null | head -50 || true)
  
  if [ $commit_count -gt 0 ]; then
    echo "   Checked $commit_count recent commits"
  fi
}

##############################################################################
# FUNCTION: Check environment files
##############################################################################
check_env_files() {
  print_message "$BLUE" "📋 Checking environment files..."
  
  local env_files=$(find "$ROOT_DIR" -name ".env*" -o -name "*.env" 2>/dev/null | grep -v ".env.example" || true)
  
  if [ -z "$env_files" ]; then
    print_message "$GREEN" "✓ No .env files found (good!)"
    return
  fi
  
  for file in $env_files; do
    print_message "$RED" "⚠️  Found uncommitted .env file: $file"
    if [ "$FIX_MODE" = "--fix" ]; then
      print_message "$YELLOW" "   Removing from git tracking..."
      git rm --cached "$file" 2>/dev/null || true
    fi
  done
}

##############################################################################
# FUNCTION: Check for credentials in code comments
##############################################################################
check_code_comments() {
  print_message "$BLUE" "💬 Checking code comments for credentials..."
  
  local suspicious_comments=$(grep -r "TODO.*password\|FIXME.*key\|XXX.*secret" "$ROOT_DIR/src" "$ROOT_DIR/scripts" 2>/dev/null || true)
  
  if [ -n "$suspicious_comments" ]; then
    print_message "$YELLOW" "⚠️  Found suspicious comments:"
    echo "$suspicious_comments"
  fi
}

##############################################################################
# MAIN EXECUTION
##############################################################################

echo ""
print_message "$BLUE" "════════════════════════════════════════════════════════"
print_message "$BLUE" "  SECRET DETECTION SCANNER"
print_message "$BLUE" "════════════════════════════════════════════════════════"
echo ""

# Run all checks
scan_directory "$ROOT_DIR"
check_env_files
check_code_comments

if command -v git &> /dev/null; then
  check_git_history
fi

echo ""
print_message "$BLUE" "════════════════════════════════════════════════════════"
echo ""

if [ $SECRETS_FOUND -eq 0 ]; then
  print_message "$GREEN" "✅ No secrets detected!"
else
  print_message "$RED" "❌ Found $SECRETS_FOUND potential secrets"
  print_message "$YELLOW" "⚠️  MANUAL VERIFICATION REQUIRED"
  echo ""
  echo "Next steps:"
  echo "  1. Review findings above"
  echo "  2. If false positives, update SECRET_PATTERNS"
  echo "  3. If real secrets, see SECRETS_ROTATION.md"
  echo ""
  exit 1
fi

echo ""
