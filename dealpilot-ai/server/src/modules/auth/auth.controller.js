import * as authService from './auth.service.js';
import { parseDuration } from './auth.service.js';
import { success, created } from '../../common/utils/response.js';
import { AuthenticationError } from '../../common/errors/index.js';
import config from '../../config/index.js';

/**
 * Set the refresh token as an httpOnly cookie.
 */
function setRefreshCookie(res, token) {
  const ttlMs = parseDuration(config.refreshTokenTtl);
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: ttlMs,
    path: '/api/v1/auth',
    ...(config.cookieDomain && config.nodeEnv === 'production'
      ? { domain: config.cookieDomain }
      : {}),
  });
}

/**
 * Clear the refresh token cookie.
 */
function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}

/**
 * Extract request context metadata.
 */
function getCtx(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: req.id,
  };
}

// POST /register
export async function register(req, res) {
  const user = await authService.register(req.body, getCtx(req));
  return created(res, { user, message: 'Registration successful. Please verify your email.' });
}

// POST /login
export async function login(req, res) {
  const result = await authService.login(req.body, getCtx(req));
  setRefreshCookie(res, result.refreshToken);
  return success(res, { accessToken: result.accessToken, user: result.user });
}

// POST /logout
export async function logout(req, res) {
  const rawToken = req.cookies?.refreshToken;
  await authService.logout(req.user.id, rawToken, getCtx(req));
  clearRefreshCookie(res);
  return success(res, { message: 'Logged out successfully' });
}

// POST /refresh
export async function refresh(req, res) {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    throw new AuthenticationError('No refresh token');
  }
  const result = await authService.refreshTokens(rawToken, getCtx(req));
  setRefreshCookie(res, result.refreshToken);
  return success(res, { accessToken: result.accessToken });
}

// GET /verify-email?token=...
export async function verifyEmail(req, res) {
  await authService.verifyEmail(req.query.token, getCtx(req));
  return success(res, { message: 'Email verified successfully' });
}

// POST /forgot-password
export async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email, getCtx(req));
  return success(res, {
    message: 'If that email address is registered, you will receive a password reset email.',
  });
}

// POST /reset-password
export async function resetPassword(req, res) {
  await authService.resetPassword(req.body.token, req.body.password, getCtx(req));
  return success(res, { message: 'Password reset successfully' });
}

// POST /change-password (requires authenticate)
export async function changePassword(req, res) {
  await authService.changePassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword,
    getCtx(req),
  );
  return success(res, { message: 'Password changed successfully' });
}

// GET /me (requires authenticate)
export async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  return success(res, { user });
}
