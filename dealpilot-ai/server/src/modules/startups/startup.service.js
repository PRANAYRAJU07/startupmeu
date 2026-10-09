import Startup from './startup.model.js';
import { NotFoundError } from '../../common/errors/index.js';
import AuditLog from '../auth/auditLog.model.js';
import logger from '../../common/utils/logger.js';

/**
 * Write an audit log entry.
 */
async function writeAudit(fields) {
  try {
    await AuditLog.create(fields);
  } catch (err) {
    logger.warn('AuditLog write failed', { error: err.message });
  }
}

/**
 * Get a startup profile by user ID.
 * @param {string} userId
 * @returns {Promise<object>}
 */
export async function getStartupByUserId(userId) {
  const startup = await Startup.findOne({ userId });
  if (!startup) {
    throw new NotFoundError('Startup profile not found');
  }
  return startup.toObject();
}

/**
 * Create a startup profile for the user.
 * @param {string} userId
 * @param {object} startupData
 * @param {object} ctx
 * @returns {Promise<object>}
 */
export async function createStartup(userId, startupData, ctx = {}) {
  const existing = await Startup.findOne({ userId });
  if (existing) {
    return updateStartup(userId, startupData, ctx);
  }

  const startup = await Startup.create({
    userId,
    ...startupData,
  });

  await writeAudit({
    userId,
    action: 'startup_created',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    severity: 'low',
  });

  return startup.toObject();
}

/**
 * Update a startup profile for the user.
 * @param {string} userId
 * @param {object} startupData
 * @param {object} ctx
 * @returns {Promise<object>}
 */
export async function updateStartup(userId, startupData, ctx = {}) {
  const startup = await Startup.findOneAndUpdate(
    { userId },
    { $set: startupData },
    { new: true, runValidators: true }
  );

  if (!startup) {
    throw new NotFoundError('Startup profile not found');
  }

  await writeAudit({
    userId,
    action: 'startup_updated',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    severity: 'low',
  });

  return startup.toObject();
}

/**
 * Delete a startup profile for the user.
 * @param {string} userId
 * @param {object} ctx
 * @returns {Promise<void>}
 */
export async function deleteStartup(userId, ctx = {}) {
  const startup = await Startup.findOneAndDelete({ userId });

  if (!startup) {
    throw new NotFoundError('Startup profile not found');
  }

  await writeAudit({
    userId,
    action: 'startup_deleted',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    severity: 'medium',
  });
}
