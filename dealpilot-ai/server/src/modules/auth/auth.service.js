import User from '../users/user.model.js';
import RefreshSession from './refreshSession.model.js';
import EmailToken from './emailToken.model.js';
import AuditLog from './auditLog.model.js';
import { hashPassword, comparePassword, hashToken, generateSecureToken } from '../../common/utils/hash.js';
import { generateAccessToken, generateRefreshToken } from '../../common/utils/token.js';
import config from '../../config/index.js';
import { sendEmail } from '../../integrations/email/emailProvider.js';
import { verificationEmail, passwordResetEmail } from '../../integrations/email/templates.js';
import logger from '../../common/utils/logger.js';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/index.js';

/**
 * Parse a duration string (e.g. '7d', '15m', '1h', '30d') into milliseconds.
 * Falls back to 7 days if unrecognised.
 * @param {string} ttl
 * @returns {number}
 */
export function parseDuration(ttl) {
  if (!ttl || typeof ttl !== 'string') return 7 * 24 * 60 * 60 * 1000;
  const match = ttl.match(/^(\d+)(d|h|m|s)$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's': return value * 1000;
    default:  return 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Write an audit log entry. Never throws — failures are only logged.
 */
async function writeAudit(fields) {
  try {
    await AuditLog.create(fields);
  } catch (err) {
    logger.warn('AuditLog write failed', { error: err.message });
  }
}

// ─── register ────────────────────────────────────────────────────────────────

/**
 * Register a new user.
 * @param {{ firstName: string, lastName: string, email: string, password: string }} body
 * @param {{ ipAddress?: string, userAgent?: string, requestId?: string }} ctx
 * @returns {Promise<object>} safeUser
 */
export async function register({ firstName, lastName, email, password }, ctx = {}) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for duplicate email
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    // Generic message — don't confirm the email exists
    throw new ConflictError('Registration failed');
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    passwordHash,
    role: 'founder',
  });

  // Generate email verification token
  const rawToken = generateSecureToken(32); // 64 hex chars
  const tokenHash = hashToken(rawToken);

  await EmailToken.create({
    userId: user._id,
    tokenHash,
    type: 'email_verification',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Build verification URL and send email — fire and forget
  const verificationUrl = `${config.appBaseUrl}/verify-email?token=${rawToken}`;
  sendEmail({
    to: normalizedEmail,
    ...verificationEmail(firstName, verificationUrl),
  }).catch((err) => logger.warn('Verification email send failed', { error: err.message, userId: user._id }));

  await writeAudit({
    userId: user._id,
    action: 'user_registered',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    metadata: { email: normalizedEmail },
    severity: 'low',
  });

  return user.toSafeObject();
}

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user and issue tokens.
 * @param {{ email: string, password: string }} credentials
 * @param {{ ipAddress?: string, userAgent?: string, requestId?: string }} ctx
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export async function login({ email, password }, ctx = {}) {
  const normalizedEmail = email.toLowerCase().trim();

  // Always use +passwordHash select override
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user || user.deletedAt !== null) {
    throw new AuthenticationError('Invalid credentials');
  }

  if (!user.isActive) {
    throw new AuthenticationError('Invalid credentials');
  }

  if (!user.isEmailVerified) {
    throw new AuthenticationError('Please verify your email before logging in');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(
    { sub: user._id.toString(), email: user.email, role: user.role },
    config.accessTokenSecret,
    config.accessTokenTtl,
  );
  const rawRefresh = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefresh);

  const expiresAt = new Date(Date.now() + parseDuration(config.refreshTokenTtl));

  await RefreshSession.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    expiresAt,
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });

  // Fire and forget lastLoginAt update
  User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() }).catch((err) =>
    logger.warn('lastLoginAt update failed', { error: err.message }),
  );

  await writeAudit({
    userId: user._id,
    action: 'user_login',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    severity: 'low',
  });

  return { user: user.toSafeObject(), accessToken, refreshToken: rawRefresh };
}

// ─── refreshTokens ────────────────────────────────────────────────────────────

/**
 * Rotate a refresh token and issue a new access token.
 * @param {string} rawRefreshToken
 * @param {{ ipAddress?: string, userAgent?: string, requestId?: string }} ctx
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export async function refreshTokens(rawRefreshToken, ctx = {}) {
  const tokenHash = hashToken(rawRefreshToken);

  const session = await RefreshSession.findOne({ tokenHash }).select('+tokenHash');
  if (!session) {
    throw new AuthenticationError('Invalid session');
  }

  // Token reuse detection: if already revoked, revoke all sessions for this user
  if (session.revokedAt) {
    await RefreshSession.updateMany(
      { userId: session.userId, revokedAt: null },
      { revokedAt: new Date(), revokeReason: 'admin' },
    );
    await writeAudit({
      userId: session.userId,
      action: 'refresh_token_reuse_detected',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      severity: 'high',
    });
    throw new AuthenticationError('Session expired or revoked');
  }

  if (session.expiresAt <= new Date()) {
    throw new AuthenticationError('Session expired or revoked');
  }

  // Revoke old session (rotation)
  session.revokedAt = new Date();
  session.revokeReason = 'rotation';
  await session.save();

  // Find user
  const user = await User.findById(session.userId);
  if (!user || !user.isActive || user.deletedAt) {
    throw new AuthenticationError('Invalid session');
  }

  // Issue new tokens
  const newAccessToken = generateAccessToken(
    { sub: user._id.toString(), email: user.email, role: user.role },
    config.accessTokenSecret,
    config.accessTokenTtl,
  );
  const newRawRefresh = generateRefreshToken();
  const newRefreshHash = hashToken(newRawRefresh);
  const expiresAt = new Date(Date.now() + parseDuration(config.refreshTokenTtl));

  await RefreshSession.create({
    userId: user._id,
    tokenHash: newRefreshHash,
    expiresAt,
    userAgent: ctx.userAgent,
    ipAddress: ctx.ipAddress,
  });

  await writeAudit({
    userId: user._id,
    action: 'token_refreshed',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    severity: 'low',
  });

  return { accessToken: newAccessToken, refreshToken: newRawRefresh };
}

// ─── logout ───────────────────────────────────────────────────────────────────

/**
 * Revoke the provided refresh session (or all sessions if no token given).
 * Idempotent — never throws if session not found.
 * @param {string} userId
 * @param {string|undefined} rawRefreshToken
 * @param {{ ipAddress?: string, userAgent?: string, requestId?: string }} ctx
 */
export async function logout(userId, rawRefreshToken, ctx = {}) {
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await RefreshSession.findOne({ tokenHash, userId });
    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      session.revokeReason = 'logout';
      await session.save();
    }
    await writeAudit({
      userId,
      action: 'user_logout',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      severity: 'low',
    });
  } else {
    // Full logout — revoke all active sessions
    await RefreshSession.updateMany(
      { userId, revokedAt: null },
      { revokedAt: new Date(), revokeReason: 'logout' },
    );
    await writeAudit({
      userId,
      action: 'user_logout_all',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      severity: 'low',
    });
  }
}

// ─── verifyEmail ──────────────────────────────────────────────────────────────

/**
 * Mark an email as verified using a raw token.
 * @param {string} rawToken
 * @param {{ requestId?: string }} ctx
 */
export async function verifyEmail(rawToken, ctx = {}) {
  const tokenHash = hashToken(rawToken);

  const emailToken = await EmailToken.findOne({
    type: 'email_verification',
  }).select('+tokenHash').where('tokenHash').equals(tokenHash);

  if (!emailToken || emailToken.usedAt) {
    throw new AuthenticationError('Invalid or expired verification token');
  }
  if (emailToken.expiresAt <= new Date()) {
    throw new AuthenticationError('Verification token has expired');
  }

  emailToken.usedAt = new Date();
  await emailToken.save();

  await User.findByIdAndUpdate(emailToken.userId, { isEmailVerified: true });

  await writeAudit({
    userId: emailToken.userId,
    action: 'email_verified',
    requestId: ctx.requestId,
    severity: 'low',
  });
}

// ─── forgotPassword ───────────────────────────────────────────────────────────

/**
 * Initiate a password reset (always returns success to prevent enumeration).
 * @param {string} email
 * @param {{ ipAddress?: string, requestId?: string }} ctx
 * @returns {Promise<{ success: true }>}
 */
export async function forgotPassword(email, ctx = {}) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (user && user.isActive && user.isEmailVerified && !user.deletedAt) {
    // Invalidate existing password reset tokens
    await EmailToken.updateMany(
      { userId: user._id, type: 'password_reset', usedAt: null },
      { usedAt: new Date() },
    );

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    await EmailToken.create({
      userId: user._id,
      tokenHash,
      type: 'password_reset',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const resetUrl = `${config.appBaseUrl}/reset-password?token=${rawToken}`;
    sendEmail({
      to: normalizedEmail,
      ...passwordResetEmail(user.firstName, resetUrl),
    }).catch((err) => logger.warn('Password reset email send failed', { error: err.message }));

    await writeAudit({
      userId: user._id,
      action: 'password_reset_requested',
      ipAddress: ctx.ipAddress,
      requestId: ctx.requestId,
      severity: 'medium',
    });
  }

  return { success: true };
}

// ─── resetPassword ────────────────────────────────────────────────────────────

/**
 * Complete a password reset using a raw token and new password.
 * @param {string} rawToken
 * @param {string} newPassword
 * @param {{ ipAddress?: string, requestId?: string }} ctx
 */
export async function resetPassword(rawToken, newPassword, ctx = {}) {
  const tokenHash = hashToken(rawToken);

  const emailToken = await EmailToken.findOne({
    type: 'password_reset',
  }).select('+tokenHash').where('tokenHash').equals(tokenHash);

  if (!emailToken || emailToken.usedAt) {
    throw new AuthenticationError('Invalid or expired reset token');
  }
  if (emailToken.expiresAt <= new Date()) {
    throw new AuthenticationError('Reset token has expired');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await User.findByIdAndUpdate(emailToken.userId, { passwordHash: newPasswordHash });

  emailToken.usedAt = new Date();
  await emailToken.save();

  // Revoke all active sessions
  await RefreshSession.updateMany(
    { userId: emailToken.userId, revokedAt: null },
    { revokedAt: new Date(), revokeReason: 'password_change' },
  );

  await writeAudit({
    userId: emailToken.userId,
    action: 'password_reset_completed',
    ipAddress: ctx.ipAddress,
    requestId: ctx.requestId,
    severity: 'high',
  });
}

// ─── changePassword ───────────────────────────────────────────────────────────

/**
 * Change the authenticated user's password.
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 * @param {{ ipAddress?: string, requestId?: string }} ctx
 */
export async function changePassword(userId, currentPassword, newPassword, ctx = {}) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new NotFoundError('User not found');

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Current password is incorrect');
  }

  const newPasswordHash = await hashPassword(newPassword);
  user.passwordHash = newPasswordHash;
  await user.save();

  // Revoke all sessions after password change
  await RefreshSession.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date(), revokeReason: 'password_change' },
  );

  await writeAudit({
    userId,
    action: 'password_changed',
    ipAddress: ctx.ipAddress,
    requestId: ctx.requestId,
    severity: 'high',
  });
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────

/**
 * Get the current user's safe profile.
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user || user.deletedAt) {
    throw new NotFoundError('User not found');
  }
  return user.toSafeObject();
}
