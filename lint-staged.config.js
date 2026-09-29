/**
 * lint-staged Configuration
 *
 * Only the active V2 extension app is linted here.
 * Root ESLint is not used for tab-revo TSX files because the app has its own config.
 */

export default {
  'tab-revo/**/*.{js,jsx,ts,tsx}': () => 'cd tab-revo && npm run lint -- --fix',
};
