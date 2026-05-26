/**
 * Environment Configuration Loader
 * Safely loads environment variables with defaults and validation
 * 
 * SECURITY: 
 * - Never expose secrets in frontend code
 * - All VITE_ prefixed vars are safe (sent to browser)
 * - Never use sensitive data without prefix check
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

/**
 * Load environment variables from .env files
 * Priority: .env.local > .env.{NODE_ENV} > .env.example
 */
function loadEnvFiles() {
  const env = process.env.NODE_ENV || 'development';
  const files = [
    '.env.example',
    `.env.${env}`,
    '.env.local',
  ];

  const envVars = {};

  for (const file of files) {
    const filePath = path.join(rootDir, 'env', file);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const [key, ...rest] = trimmed.split('=');
        const value = rest.join('=').trim();

        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        
        envVars[key] = cleanValue;
      }
    }
  }

  return envVars;
}

/**
 * Validate environment variables
 */
function validateEnv(envVars) {
  const errors = [];

  // Check for secrets in env vars (should use separate mechanism)
  const secretPatterns = [
    /(?:password|secret|token|key|credential)/i,
    /(?:api[_-]?key|auth|apikey)/i,
  ];

  for (const [key, value] of Object.entries(envVars)) {
    if (!key.startsWith('VITE_') && !key.startsWith('NODE_')) {
      // Non-standard vars should be prefixed
      if (!process.env.CI) {
        console.warn(`⚠️  Non-standard env var: ${key}`);
      }
    }

    // Never log or process actual secret values
    if (secretPatterns.some(p => p.test(key))) {
      if (value && value.length > 0 && !value.startsWith('$')) {
        errors.push(`❌ Secret-like variable found in committed file: ${key}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('Environment validation errors:');
    errors.forEach(err => console.error(err));
    throw new Error('Environment validation failed');
  }
}

/**
 * Get sanitized environment for frontend
 * Only VITE_ prefixed variables are sent to the browser
 */
function getFrontendEnv(envVars) {
  const frontendEnv = {};

  for (const [key, value] of Object.entries(envVars)) {
    if (key.startsWith('VITE_')) {
      frontendEnv[key] = value;
    }
  }

  return frontendEnv;
}

/**
 * Log environment info (safe for CI/CD logs)
 */
function logEnvironmentInfo(envVars) {
  const env = process.env.NODE_ENV || 'development';
  console.log(`✓ Environment: ${env}`);
  console.log(`✓ Extension: ${envVars.VITE_EXTENSION_NAME}`);
  console.log(`✓ CSP Mode: ${envVars.VITE_CSP_MODE || 'strict'}`);
  console.log(`✓ Debug Mode: ${envVars.VITE_ENABLE_DEBUG === 'true' ? 'ON' : 'OFF'}`);
  console.log(`✓ Source Maps: ${envVars.VITE_ENABLE_SOURCE_MAPS === 'true' ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Export environment configuration
 */
export const envConfig = (() => {
  const envVars = loadEnvFiles();
  
  try {
    validateEnv(envVars);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  logEnvironmentInfo(envVars);

  return {
    all: envVars,
    frontend: getFrontendEnv(envVars),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: (process.env.NODE_ENV || 'development') === 'development',
    isStaging: process.env.NODE_ENV === 'staging',
    isProd: process.env.NODE_ENV === 'production',
  };
})();

export default envConfig;
