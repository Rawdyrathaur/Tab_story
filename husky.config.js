/**
 * Husky Configuration
 * 
 * Husky enables git hooks to run security checks automatically.
 * This config initializes the .husky directory for hooks.
 * 
 * INSTALLED HOOKS:
 * - pre-commit: Runs security & linting checks before committing
 * - pre-push: Final security validation before pushing
 * 
 * Installation: npm install && npm run prepare
 */

export default {
  hooks: {
    'pre-commit': 'lint-staged',
    'pre-push': 'bash scripts/hooks/pre-push.sh'
  }
};
