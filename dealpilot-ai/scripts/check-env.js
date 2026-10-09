#!/usr/bin/env node
/**
 * check-env.js
 * Validates that all required environment variables are set and non-empty.
 * Usage: node scripts/check-env.js
 * Exit code 0 = all vars present; exit code 1 = missing vars listed.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'CLIENT_URL',
  'MONGODB_URI',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'ACCESS_TOKEN_TTL',
  'REFRESH_TOKEN_TTL',
  'AI_PROVIDER',
  'AI_MODEL',
  'AI_API_KEY',
  'EMAIL_PROVIDER',
  'EMAIL_FROM',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'APP_BASE_URL',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX',
  'COOKIE_DOMAIN',
  'CORS_ORIGINS',
];

function loadEnvFile(envPath) {
  try {
    const content = readFileSync(envPath, 'utf8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      vars[key] = value;
    }
    return vars;
  } catch {
    return null;
  }
}

const envPath = resolve(__dirname, '../server/.env');
const fileVars = loadEnvFile(envPath);
const allVars = { ...process.env, ...(fileVars || {}) };

console.log('Checking environment variables...');
console.log(`Source: ${fileVars ? envPath : 'process.env only (no .env file found)'}\n`);

const missing = REQUIRED_VARS.filter((key) => {
  const val = allVars[key];
  return !val || val.trim() === '';
});

if (missing.length === 0) {
  console.log('✅ All required environment variables are set.');
  process.exit(0);
} else {
  console.error('❌ Missing or empty environment variables:');
  for (const key of missing) {
    console.error(`   - ${key}`);
  }
  console.error(`\n${missing.length} variable(s) missing. Copy server/.env.example to server/.env and fill in the values.`);
  process.exit(1);
}
