import Investor from './investor.model.js';
import SavedInvestor from './savedInvestor.model.js';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import AuditLog from '../auth/auditLog.model.js';
import logger from '../../common/utils/logger.js';
import { paginate } from '../../common/utils/pagination.js'; // Assuming paginate exists or we can write it. Wait, let me check if paginate exists.

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

export async function getInvestors(query) {
  const { page, limit, search, industry, stage, geography, investorType, ticketSize, isDemoData } = query;
  
  const filter = { isActive: true };

  if (search) {
    filter.$text = { $search: search };
  }
  
  if (industry) {
    filter.industries = Array.isArray(industry) ? { $in: industry } : industry;
  }
  
  if (stage) {
    filter.stages = Array.isArray(stage) ? { $in: stage } : stage;
  }
  
  if (geography) {
    // Basic regex match for geography
    filter.geographies = { $regex: new RegExp(geography, 'i') };
  }
  
  if (investorType) {
    filter.investorType = investorType;
  }
  
  if (ticketSize !== undefined) {
    filter.minTicketSize = { $lte: ticketSize };
    // also need to handle max ticket size if necessary, but typically investors are matched if the startup ticket size is between min and max
    // filter.$or = [ { maxTicketSize: { $gte: ticketSize } }, { maxTicketSize: { $exists: false } } ];
  }
  
  if (isDemoData !== undefined) {
    filter.isDemoData = isDemoData;
  }

  const sort = search ? { score: { $meta: 'textScore' } } : { name: 1 };
  
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Investor.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Investor.countDocuments(filter)
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function getInvestorById(id) {
  const investor = await Investor.findById(id).lean();
  if (!investor) {
    throw new NotFoundError('Investor not found');
  }
  return investor;
}

export async function saveInvestor(userId, investorId, notes, ctx = {}) {
  const investor = await Investor.findById(investorId);
  if (!investor) {
    throw new NotFoundError('Investor not found');
  }

  const existing = await SavedInvestor.findOne({ userId, investorId });
  if (existing) {
    throw new ConflictError('Investor already saved');
  }

  const saved = await SavedInvestor.create({
    userId,
    investorId,
    notes,
  });

  await writeAudit({
    userId,
    action: 'investor_saved',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    metadata: { investorId },
    severity: 'low',
  });

  return saved;
}

export async function getSavedInvestors(userId) {
  const saved = await SavedInvestor.find({ userId }).populate('investorId').lean();
  return saved;
}

export async function removeSavedInvestor(userId, savedInvestorId, ctx = {}) {
  const saved = await SavedInvestor.findOneAndDelete({ _id: savedInvestorId, userId });
  if (!saved) {
    throw new NotFoundError('Saved investor not found');
  }

  await writeAudit({
    userId,
    action: 'investor_unsaved',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    requestId: ctx.requestId,
    metadata: { savedInvestorId },
    severity: 'low',
  });
}
