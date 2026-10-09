import jwt from 'jsonwebtoken';
import { generateSecureToken } from './hash.js';

export function generateAccessToken(payload, secret, ttl) {
  return jwt.sign(payload, secret, { expiresIn: ttl });
}

export function generateRefreshToken() {
  return generateSecureToken();
}

export function verifyAccessToken(token, secret) {
  return jwt.verify(token, secret);
}
