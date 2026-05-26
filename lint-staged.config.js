/**
 * lint-staged Configuration
 * 
 * Runs linters and formatters on staged files before commit.
 * Only files that are staged (git add) are processed.
 */

export default {
  "*.{js,jsx,ts,tsx}": ["eslint --fix"],
};
