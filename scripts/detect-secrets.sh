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

  # These files deliberately contain secret-detection signatures. Scanning
  # their rule lists would only report the scanner itself.
  if [ "$file" = "$SCRIPT_DIR/detect-secrets.sh" ] || [ "$file" = "$SCRIPT_DIR/hooks/pre-push.sh" ]; then
    return 0
  fi
  
  # Skip binary files
  if file "$file" | grep -q "binary"; then
    return 0
  fi
  
  # Skip large files (>10MB)
  if [ $(stat -f%z "$file" 2>/dev/null || echo 0) -gt 10485760 ]; then
    return 0
  fi
  
  for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -qE -- "$pattern" "$file" 2>/dev/null; then
      if [ $file_secrets -eq 0 ]; then
        print_message "$RED" "❌ $file"
        ((file_secrets += 1))
      fi
      
      # Show the line (masked)
      echo "   Found potential secret pattern"
      grep -n -E -- "$pattern" "$file" 2>/dev/null | sed 's/:.*/: [REDACTED]/' | sed 's/^/     /' || true
      ((SECRETS_FOUND += 1))
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
  
  # `dir` is absolute, so relative `-path ./node_modules` exclusions do not
  # match. Prune these directories by name at every depth to avoid reporting
  # dependency fixtures or generated build artefacts as application secrets.
  while IFS= read -r -d '' file; do
    scan_file "$file"
  done < <(find "$dir" \
    \( -type d \( -name node_modules -o -name .git -o -name coverage -o -name dist \) -prune \) -o \
    \( -type f -print0 \))
}

##############################################################################
# FUNCTION: Check git history
##############################################################################
check_git_history() {
  print_message "$BLUE" "📜 Checking git history for secrets..."

  # Let Git search the last 50 commit diffs directly. This avoids spawning a
  # grep process for every line in every commit and preserves patterns that
  # begin with a dash.
  local commit_count=0
  for pattern in "${SECRET_PATTERNS[@]}"; do
    while IFS= read -r commit; do
      [ -z "$commit" ] && continue
      print_message "$RED" "❌ Potential secret found in commit: $commit"
      ((SECRETS_FOUND += 1))
      ((commit_count += 1))
    done < <(git log --all -n 50 --format='%H' -G "$pattern" -- . \
      ':(exclude)scripts/detect-secrets.sh' \
      ':(exclude)scripts/hooks/pre-push.sh' 2>/dev/null || true)
  done

  if [ "$commit_count" -eq 0 ]; then
    echo "   Checked the last 50 commits"
  fi
}

##############################################################################
# FUNCTION: Check environment files
##############################################################################
check_env_files() {
  print_message "$BLUE" "📋 Checking environment files..."
  
  local env_files=$(find "$ROOT_DIR" \( -name ".env*" -o -name "*.env" \) -not -name ".env.example" -print 2>/dev/null || true)
  
  if [ -z "$env_files" ]; then
    print_message "$GREEN" "✓ No .env files found (good!)"
    return
  fi
  
  while IFS= read -r file; do
    local relative="${file#"$ROOT_DIR"/}"
    if git -C "$ROOT_DIR" ls-files --error-unmatch -- "$relative" >/dev/null 2>&1; then
      continue
    fi
    print_message "$RED" "⚠️  Found uncommitted .env file: $file"
    if [ "$FIX_MODE" = "--fix" ]; then
      print_message "$YELLOW" "   Removing from git tracking..."
      git rm --cached "$file" 2>/dev/null || true
    fi
  done <<< "$env_files"
}

##############################################################################
# FUNCTION: Check for credentials in code comments
##############################################################################
check_code_comments() {
  print_message "$BLUE" "💬 Checking code comments for credentials..."
  
  local suspicious_comments=$(grep -r --exclude='detect-secrets.sh' "TODO.*password\|FIXME.*key\|XXX.*secret" "$ROOT_DIR/tab-story/src" "$ROOT_DIR/scripts" 2>/dev/null || true)
  
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
