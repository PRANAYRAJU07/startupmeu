import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const schema = Joi.object({
  PORT: Joi.number().default(5000),
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  CLIENT_URL: Joi.string().default('http://localhost:5173'),
  MONGODB_URI: Joi.string().required(),
  ACCESS_TOKEN_SECRET: Joi.string().required(),
  REFRESH_TOKEN_SECRET: Joi.string().required(),
  ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL: Joi.string().default('7d'),
  COOKIE_DOMAIN: Joi.string().default('localhost'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  AI_PROVIDER: Joi.string().default('mock'),
  AI_MODEL: Joi.string().default('gpt-4o'),
  AI_API_KEY: Joi.string().default('').allow(''),
  EMAIL_PROVIDER: Joi.string().default('mock'),
  EMAIL_FROM: Joi.string().default('noreply@dealpilot.ai'),
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().default('').allow(''),
  SMTP_PASS: Joi.string().default('').allow(''),
  APP_BASE_URL: Joi.string().default('http://localhost:5000'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX: Joi.number().default(100),
}).unknown(true);

const { error, value: validated } = schema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  console.error('Configuration validation error:', error.message);
  process.exit(1);
}

const config = Object.freeze({
  port: validated.PORT,
  nodeEnv: validated.NODE_ENV,
  clientUrl: validated.CLIENT_URL,
  mongodbUri: validated.MONGODB_URI,
  accessTokenSecret: validated.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: validated.REFRESH_TOKEN_SECRET,
  accessTokenTtl: validated.ACCESS_TOKEN_TTL,
  refreshTokenTtl: validated.REFRESH_TOKEN_TTL,
  cookieDomain: validated.COOKIE_DOMAIN,
  corsOrigins: validated.CORS_ORIGINS.split(',').map((s) => s.trim()),
  aiProvider: validated.AI_PROVIDER,
  aiModel: validated.AI_MODEL,
  aiApiKey: validated.AI_API_KEY,
  emailProvider: validated.EMAIL_PROVIDER,
  emailFrom: validated.EMAIL_FROM,
  smtpHost: validated.SMTP_HOST,
  smtpPort: validated.SMTP_PORT,
  smtpUser: validated.SMTP_USER,
  smtpPass: validated.SMTP_PASS,
  appBaseUrl: validated.APP_BASE_URL,
  rateLimitWindowMs: validated.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: validated.RATE_LIMIT_MAX,
});

export default config;
