import Deal from './deal.model.js';
import Investor from '../investors/investor.model.js';
import Activity from '../activities/activity.model.js';
import AuditLog from '../auth/auditLog.model.js';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import logger from '../../common/utils/logger.js';

export async function getDeals(userId) {
  return await Deal.find({ userId, isActive: true }).sort({ updatedAt: -1 }).populate('investorId', 'name logo').lean();
}

export async function getDealById(userId, dealId) {
  const deal = await Deal.findOne({ _id: dealId, userId }).populate('investorId').lean();
  if (!deal) throw new NotFoundError('Deal not found');
  return deal;
}

export async function createDeal(userId, dealData, ctx = {}) {
  // Check that investor exists
  const investor = await Investor.findById(dealData.investorId);
  if (!investor) throw new NotFoundError('Referenced investor not found');

  const existing = await Deal.findOne({ userId, investorId: dealData.investorId });
  if (existing) {
    throw new ConflictError('Deal already exists for this investor');
  }

  try {
    const deal = await Deal.create({
      userId,
      ...dealData,
    });

    try {
      await AuditLog.create({
        userId,
        action: 'deal_created',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        requestId: ctx.requestId,
        metadata: { dealId: deal._id, stage: deal.stage },
        severity: 'low',
      });
    } catch (err) {
      logger.warn('AuditLog failed', err);
    }

    return deal;
  } catch (err) {
    if (err.code === 11000) throw new ConflictError('Deal already exists for this investor');
    throw err;
  }
}

export async function updateDeal(userId, dealId, updates, ctx = {}) {
  const deal = await Deal.findOneAndUpdate(
    { _id: dealId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!deal) throw new NotFoundError('Deal not found');

  try {
    await AuditLog.create({
      userId,
      action: 'deal_updated',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      metadata: { dealId: deal._id, stage: updates.stage },
      severity: 'low',
    });
  } catch (err) {
    logger.warn('AuditLog failed', err);
  }

  return deal;
}

export async function deleteDeal(userId, dealId, ctx = {}) {
  // Soft delete or hard delete? The schema has `isActive` and `archivedAt`, so let's hard delete if we really want to, or just delete.
  const deal = await Deal.findOneAndDelete({ _id: dealId, userId });
  if (!deal) throw new NotFoundError('Deal not found');

  // Also delete associated activities
  await Activity.deleteMany({ dealId, userId });
}

export async function addContactActivity(userId, dealId, activityData, ctx = {}) {
  const deal = await Deal.findOne({ _id: dealId, userId });
  if (!deal) throw new NotFoundError('Deal not found');

  // Push to deal history
  deal.contactHistory.push(activityData);
  await deal.save();

  // Optionally create global activity log
  await Activity.create({
    userId,
    type: 'contact',
    description: `Added contact history for deal with ${deal.investorId}`,
    entityType: 'Deal',
    entityId: dealId,
    metadata: activityData,
  });

  return deal;
}
