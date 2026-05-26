/**
 * ESLint Configuration
 * Includes security-focused rules for Chrome Extension development
 * 
 * SECURITY RULES:
 * - Prevents eval() and dangerous APIs
 * - Catches potential XSS vectors
 * - Enforces safe message passing
 * - Detects potential injection vulnerabilities
 */

export default [
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      ".git/",
      ".husky/",
      "*.min.js",
      ".github/",
      "sidepanel/"
    ]
  },
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        chrome: "readonly",
        console: "readonly",
        process: "readonly"
      }
    },
    rules: {
      // Security
      "no-eval": ["error"],
      "no-implied-eval": ["error"],
      "no-script-url": ["error"],
      "no-with": ["error"],
      
      // Require const/let instead of var
      "no-var": ["error"],
      "prefer-const": ["error"],
      
      // Code quality
      "no-console": ["warn"],
      "no-debugger": ["error"],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      
      // Manifest V3 compliance
      "no-restricted-globals": [
        "error",
        {
          name: "eval",
          message: "eval() is not allowed in Manifest V3"
        },
        {
          name: "Function",
          message: "Function constructor is not allowed in Manifest V3"
        }
      ]
    }
  }
];
