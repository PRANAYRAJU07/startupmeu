import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'lcov'],
    },
    hookTimeout: 60000,
    testTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      PORT: '5001',
      MONGODB_URI: 'mongodb://localhost:27017/dealpilot-test',
      ACCESS_TOKEN_SECRET: 'test_access_token_secret_at_least_32_characters',
      REFRESH_TOKEN_SECRET: 'test_refresh_token_secret_at_least_32_characters',
      CLIENT_URL: 'http://localhost:5173',
      APP_BASE_URL: 'http://localhost:5001',
      AI_PROVIDER: 'mock',
      EMAIL_PROVIDER: 'mock',
    },
  },
});
