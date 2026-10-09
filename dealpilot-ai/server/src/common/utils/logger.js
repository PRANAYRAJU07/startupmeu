import winston from 'winston';
import config from '../../config/index.js';

const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'token', 'secret', 'authorization', 'cookie',
  'apiKey', 'smtpPass', 'accessTokenSecret', 'refreshTokenSecret',
  'accessToken', 'refreshToken',
]);

function redactSensitive(obj, depth = 0) {
  if (depth > 10 || typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map((v) => redactSensitive(v, depth + 1));
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitive(value, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const redactFormat = winston.format((info) => {
  const { message, level, timestamp, ...rest } = info;
  const redacted = redactSensitive(rest);
  return { message, level, timestamp, ...redacted };
});

const developmentFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  redactFormat(),
  winston.format.simple(),
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  redactFormat(),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: config.nodeEnv === 'production' ? productionFormat : developmentFormat,
  transports: [new winston.transports.Console()],
});

export default logger;
