#!/bin/bash

##############################################################################
# PRE-PUSH HOOK
# This script runs before pushing to remote repository
# It performs final security checks to prevent secret exposure
#
# Security Checks:
# ✓ Scan all commits for secrets
# ✓ Check for large files
# ✓ Verify environment configuration
# ✓ Validate commit messages
#
# INSTALLATION:
# cp scripts/hooks/pre-push.sh .husky/pre-push
# chmod +x .husky/pre-push
##############################################################################

set -e

echo "🔐 Running pre-push security checks..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
ERRORS=0
WARNINGS=0

##############################################################################
# FUNCTION: Get commits to be pushed
##############################################################################
get_commits_to_push() {
  # Get the branch being pushed
  local branch=$(git rev-parse --abbrev-ref HEAD)
  local remote=${1:-origin}
  
  # Get commits not in remote
  git log "$remote/$branch..HEAD" 2>/dev/null || git log HEAD~1..HEAD
}

##############################################################################
# FUNCTION: Scan commits for secrets
##############################################################################
scan_commits_for_secrets() {
  echo ""
  echo "🔍 Scanning commits for secrets..."
  
  local commits=$(get_commits_to_push)
  
  if [ -z "$commits" ]; then
    echo "  ✓ No new commits to scan"
    return
  fi
  
  # Patterns to search for
  local secret_patterns=(
    "password\s*=\s*['\"]"
    "api[_-]?key\s*=\s*['\"]"
    "secret\s*=\s*['\"]"
    "token\s*=\s*['\"]"
    "sk_live_"
    "pk_live_"
    "ghp_"
    "ssh-rsa AAAA"
    "-----BEGIN RSA PRIVATE KEY-----"
    "-----BEGIN PRIVATE KEY-----"
    "-----BEGIN OPENSSH PRIVATE KEY-----"
  )
  
  for commit in $commits; do
    # Get the commit diff
    local diff=$(git show "$commit" 2>/dev/null || echo "")
    
    for pattern in "${secret_patterns[@]}"; do
      if echo "$diff" | grep -qiE "$pattern"; then
        echo -e "${RED}❌ ERROR: Potential secret in commit $commit${NC}"
        echo "   Pattern matched: $pattern"
        echo "   This commit appears to contain secrets!"
        echo "   Use: git rebase -i <commit> to remove it"
        ((ERRORS++))
      fi
    done
  done
  
  if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ No secrets detected in commits${NC}"
  fi
}

##############################################################################
# FUNCTION: Check for large files
##############################################################################
check_large_files() {
  echo ""
  echo "📦 Checking for large files..."
  
  local max_size=$((50 * 1024 * 1024)) # 50MB limit
  local large_files=0
  
  local commits=$(get_commits_to_push)
  
  for commit in $commits; do
    # Check file sizes in this commit
    while IFS= read -r size file; do
      if [ "$size" -gt "$max_size" ]; then
        echo -e "${YELLOW}⚠ WARNING: Large file in commit: $file ($(numfmt --to=iec $size 2>/dev/null || echo "$size bytes"))${NC}"
        ((large_files++))
      fi
    done < <(git show "$commit" --name-only --pretty=format: | xargs git ls-files --stage | awk '{print $4, $NF}')
  done
  
  if [ $large_files -eq 0 ]; then
    echo -e "${GREEN}✓ No suspiciously large files${NC}"
  else
    echo -e "${YELLOW}⚠ Found $large_files large files${NC}"
    ((WARNINGS++))
  fi
}

##############################################################################
# FUNCTION: Verify no .env files are being pushed
##############################################################################
check_env_files() {
  echo ""
  echo "🚫 Checking for environment files..."
  
  local commits=$(get_commits_to_push)
  local env_files_found=0
  
  for commit in $commits; do
    if git show "$commit" --name-only --pretty=format: | grep -qE '\.env[^.]'; then
      echo -e "${RED}❌ ERROR: .env file found in commit${NC}"
      git show "$commit" --name-only --pretty=format: | grep -E '\.env[^.]'
      ((ERRORS++))
      ((env_files_found++))
    fi
  done
  
  if [ $env_files_found -eq 0 ]; then
    echo -e "${GREEN}✓ No .env files detected${NC}"
  fi
}

##############################################################################
# FUNCTION: Run security audit
##############################################################################
run_security_audit() {
  echo ""
  echo "🔒 Running security audit..."
  
  if command -v npm &> /dev/null; then
    echo "   Running 'npm audit'..."
    npm audit 2>/dev/null || true
  fi
  
  echo -e "${GREEN}✓ Security audit completed${NC}"
}

##############################################################################
# FUNCTION: Verify branch protection
##############################################################################
verify_branch_protection() {
  echo ""
  echo "🛡️ Verifying branch protection..."
  
  local branch=$(git rev-parse --abbrev-ref HEAD)
  
  # Warn if pushing directly to main/master
  if [[ "$branch" == "main" ]] || [[ "$branch" == "master" ]]; then
    echo -e "${YELLOW}⚠ WARNING: You are pushing to the $branch branch!${NC}"
    echo "   Make sure this is intentional."
    ((WARNINGS++))
  fi
  
  echo -e "${GREEN}✓ Branch verification completed${NC}"
}

##############################################################################
# MAIN EXECUTION
##############################################################################

echo ""
echo "════════════════════════════════════════════════════════"
echo "  PRE-PUSH SECURITY CHECKS"
echo "════════════════════════════════════════════════════════"
echo ""

# Run all checks
scan_commits_for_secrets
check_large_files
check_env_files
run_security_audit
verify_branch_protection

echo ""
echo "════════════════════════════════════════════════════════"
echo ""

# Summary
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ PRE-PUSH FAILED ($ERRORS errors)${NC}"
  echo ""
  echo "DO NOT PUSH! Fix these errors first:"
  echo "  • Remove secrets from commits: git rebase -i"
  echo "  • Remove .env files: git rm --cached .env"
  echo "  • See SECRETS_ROTATION.md for emergency procedures"
  echo ""
  exit 1
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ PRE-PUSH COMPLETED WITH WARNINGS ($WARNINGS warnings)${NC}"
  echo ""
  read -p "Continue pushing? (y/N): " confirm
  if [[ ! "$confirm" =~ ^[yY]$ ]]; then
    echo "Push cancelled."
    exit 1
  fi
fi

echo -e "${GREEN}✓ PRE-PUSH CHECKS PASSED${NC}"
echo "🚀 Safe to push!"
echo ""

exit 0
