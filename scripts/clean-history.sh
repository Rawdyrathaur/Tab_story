#!/bin/bash

##############################################################################
# CLEAN GIT HISTORY SCRIPT
# Safely removes or rotates compromised keys from git history
#
# DANGER: This rewrites git history - use with caution!
# All team members will need to re-clone after running this
#
# Usage: 
#   ./scripts/clean-history.sh --dry-run "secret_pattern"
#   ./scripts/clean-history.sh --execute "secret_pattern"
##############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

MODE="${1:-}"
PATTERN="${2:-}"
BACKUP_DIR="$ROOT_DIR/git-history-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

##############################################################################
# FUNCTION: Validate inputs
##############################################################################
validate_inputs() {
  if [ -z "$MODE" ] || ([ "$MODE" != "--dry-run" ] && [ "$MODE" != "--execute" ]); then
    echo -e "${RED}❌ Invalid mode${NC}"
    echo "Usage:"
    echo "  ./scripts/clean-history.sh --dry-run \"pattern\""
    echo "  ./scripts/clean-history.sh --execute \"pattern\""
    echo ""
    echo "Examples:"
    echo "  ./scripts/clean-history.sh --dry-run \"api_key_sk_\""
    echo "  ./scripts/clean-history.sh --execute \"password=\""
    exit 1
  fi
  
  if [ -z "$PATTERN" ]; then
    echo -e "${RED}❌ Pattern required${NC}"
    exit 1
  fi
}

##############################################################################
# FUNCTION: Create backup
##############################################################################
create_backup() {
  echo ""
  echo -e "${BLUE}📦 Creating backup...${NC}"
  
  mkdir -p "$BACKUP_DIR"
  local backup_file="$BACKUP_DIR/backup_$TIMESTAMP.bundle"
  
  git bundle create "$backup_file" --all
  echo -e "${GREEN}✓ Backup created: $backup_file${NC}"
  echo "  Restore with: git clone $backup_file"
}

##############################################################################
# FUNCTION: Find commits with pattern
##############################################################################
find_matching_commits() {
  echo ""
  echo -e "${BLUE}🔍 Searching for pattern: $PATTERN${NC}"
  
  local count=0
  
  git log --all --pretty=format:"%h %s" | while read commit message; do
    if git show "$commit" | grep -q "$PATTERN" 2>/dev/null; then
      echo "  Found in: $commit - $message"
      ((count++))
    fi
  done
  
  echo "  Total matches: $count"
  
  return 0
}

##############################################################################
# FUNCTION: Dry run (show what would be removed)
##############################################################################
dry_run() {
  echo ""
  echo -e "${YELLOW}⚠️  DRY RUN MODE - No changes will be made${NC}"
  echo ""
  
  find_matching_commits
  
  echo ""
  echo -e "${BLUE}Preview of changes:${NC}"
  echo "  git log --all -p -S \"$PATTERN\" --source -S \"$PATTERN\""
  echo ""
  echo "If this looks correct, run:"
  echo "  $0 --execute \"$PATTERN\""
}

##############################################################################
# FUNCTION: Execute history rewrite
##############################################################################
execute_rewrite() {
  echo ""
  echo -e "${RED}⚠️  WARNING: This will rewrite git history!${NC}"
  echo ""
  echo "Effects:"
  echo "  • All commits are rewritten"
  echo "  • All team members must re-clone"
  echo "  • Cannot be undone (except from backup)"
  echo ""
  
  read -p "Are you absolutely sure? (type 'YES I UNDERSTAND' to continue): " confirm
  
  if [ "$confirm" != "YES I UNDERSTAND" ]; then
    echo "Cancelled."
    exit 0
  fi
  
  echo ""
  
  # Create backup first
  create_backup
  
  echo ""
  echo -e "${BLUE}🔄 Rewriting git history...${NC}"
  
  # Use git filter-repo if available (recommended)
  if command -v git-filter-repo &> /dev/null; then
    echo "Using git-filter-repo (recommended)..."
    git filter-repo --replace-text <(echo "$PATTERN==>REDACTED")
  else
    # Fallback to BFG Repo-Cleaner if available
    if command -v bfg &> /dev/null; then
      echo "Using BFG Repo-Cleaner..."
      bfg --replace-text <(echo "$PATTERN==>REDACTED")
    else
      # Fallback to git filter-branch (slower, deprecated)
      echo "Using git filter-branch (slow)..."
      git filter-branch --force --tree-filter "
        find . -type f ! -path '.git' -exec sed -i 's/$PATTERN/REDACTED/g' {} \\;
      " --prune-empty -- --all
    fi
  fi
  
  echo ""
  echo -e "${GREEN}✅ History rewritten successfully${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Review changes: git log --all --oneline"
  echo "  2. Force push: git push --force --all origin"
  echo "  3. Notify team to re-clone"
  echo "  4. Rotate the compromised keys immediately!"
}

##############################################################################
# MAIN EXECUTION
##############################################################################

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════"
echo "  GIT HISTORY CLEANER"
echo "════════════════════════════════════════════════════════${NC}"
echo ""

validate_inputs

if [ "$MODE" = "--dry-run" ]; then
  dry_run
else
  execute_rewrite
fi

echo ""
