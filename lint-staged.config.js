/**
 * lint-staged Configuration
 *
 * Only the active V2 extension app is linted here.
 * Root ESLint is not used for tab-story TSX files because the app has its own config.
 */

export default {
  "tab-story/**/*.{js,jsx,ts,tsx}": () => "cd tab-story && npm run lint -- --fix"
};
