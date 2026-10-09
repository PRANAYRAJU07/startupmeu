import Match from './match.model.js';
import Startup from '../startups/startup.model.js';
import Investor from '../investors/investor.model.js';
import AuditLog from '../auth/auditLog.model.js';
import { NotFoundError } from '../../common/errors/index.js';
import { ALGORITHM_VERSION } from '../../common/constants/index.js';
import logger from '../../common/utils/logger.js';

const WEIGHTS = {
  industry: 0.30,
  stage: 0.25,
  ticketSize: 0.20,
  geography: 0.15,
  businessModel: 0.10,
};

function calculateIndustryMatch(startup, investor) {
  if (!startup.industry) return { score: 0, match: 'unknown', explanation: 'Startup industry is not provided.' };
  if (!investor.industries || investor.industries.length === 0) return { score: 0, match: 'unknown', explanation: 'Investor industries are not known.' };
  
  if (investor.industries.includes(startup.industry)) {
    return { score: 100, match: 'positive', explanation: `Investor specializes in ${startup.industry}.` };
  }
  return { score: 0, match: 'mismatch', explanation: `Investor does not specialize in ${startup.industry}.` };
}

function calculateStageMatch(startup, investor) {
  if (!startup.stage) return { score: 0, match: 'unknown', explanation: 'Startup funding stage is not provided.' };
  if (!investor.stages || investor.stages.length === 0) return { score: 0, match: 'unknown', explanation: 'Investor funding stages are not known.' };
  
  if (investor.stages.includes(startup.stage)) {
    return { score: 100, match: 'positive', explanation: `Investor invests at the ${startup.stage} stage.` };
  }
  
  // Could implement partial matching for adjacent stages, but strict mismatch is safer
  return { score: 0, match: 'mismatch', explanation: `Investor does not typically invest at the ${startup.stage} stage.` };
}

function calculateTicketSizeMatch(startup, investor) {
  if (startup.targetRaiseAmount == null) return { score: 0, match: 'unknown', explanation: 'Startup target raise amount is not provided.' };
  if (investor.minTicketSize == null && investor.maxTicketSize == null) return { score: 0, match: 'unknown', explanation: 'Investor ticket size preferences are not known.' };
  
  const min = investor.minTicketSize || 0;
  const max = investor.maxTicketSize || Infinity;
  
  // We check if the startup is raising an amount that the investor can potentially participate in.
  // Assuming investor ticket size is how much *they* write, the raise amount should be >= minTicketSize.
  // A startup raising $1M might get a $100k ticket. So targetRaiseAmount >= minTicketSize is a positive match.
  
  if (startup.targetRaiseAmount < min) {
    return { score: 0, match: 'mismatch', explanation: `Startup target raise (${startup.targetRaiseAmount}) is below investor minimum ticket size (${min}).` };
  }
  
  return { score: 100, match: 'positive', explanation: `Target raise amount aligns with investor ticket size range.` };
}

function calculateGeoMatch(startup, investor) {
  if (!startup.headquartersCountry) return { score: 0, match: 'unknown', explanation: 'Startup headquarters country is not provided.' };
  if (!investor.geographies || investor.geographies.length === 0) return { score: 0, match: 'unknown', explanation: 'Investor geographic preferences are not known.' };
  
  const hq = startup.headquartersCountry.toLowerCase();
  const investorGeos = investor.geographies.map(g => g.toLowerCase());
  
  const hqMatches = investorGeos.some(g => hq.includes(g) || g.includes(hq));
  
  if (hqMatches) {
    return { score: 100, match: 'positive', explanation: `Investor focuses on ${startup.headquartersCountry}.` };
  }
  
  // Check operating markets for partial match
  if (startup.operatingMarkets && startup.operatingMarkets.length > 0) {
    const markets = startup.operatingMarkets.map(m => m.toLowerCase());
    const marketMatches = investorGeos.some(g => markets.some(m => m.includes(g) || g.includes(m)));
    if (marketMatches) {
      return { score: 50, match: 'partial', explanation: `Investor focuses on one of the operating markets, but not the headquarters.` };
    }
  }
  
  return { score: 0, match: 'mismatch', explanation: `Investor does not typically focus on ${startup.headquartersCountry}.` };
}

function calculateBusinessModelMatch(startup, investor) {
  if (!startup.businessModel) return { score: 0, match: 'unknown', explanation: 'Startup business model is not provided.' };
  if (!investor.preferredBusinessModels || investor.preferredBusinessModels.length === 0) return { score: 0, match: 'unknown', explanation: 'Investor business model preferences are not known.' };
  
  if (investor.preferredBusinessModels.includes(startup.businessModel)) {
    return { score: 100, match: 'positive', explanation: `Investor prefers ${startup.businessModel} businesses.` };
  }
  return { score: 0, match: 'mismatch', explanation: `Investor does not typically prefer ${startup.businessModel} businesses.` };
}

export function computeMatchScore(startup, investor) {
  const criteria = [];
  const missingInfo = [];
  
  const indMatch = calculateIndustryMatch(startup, investor);
  const stgMatch = calculateStageMatch(startup, investor);
  const tktMatch = calculateTicketSizeMatch(startup, investor);
  const geoMatch = calculateGeoMatch(startup, investor);
  const bizMatch = calculateBusinessModelMatch(startup, investor);
  
  criteria.push({ criterion: 'industry', weight: WEIGHTS.industry, ...indMatch });
  criteria.push({ criterion: 'stage', weight: WEIGHTS.stage, ...stgMatch });
  criteria.push({ criterion: 'ticketSize', weight: WEIGHTS.ticketSize, ...tktMatch });
  criteria.push({ criterion: 'geography', weight: WEIGHTS.geography, ...geoMatch });
  criteria.push({ criterion: 'businessModel', weight: WEIGHTS.businessModel, ...bizMatch });
  
  let totalScore = 0;
  
  criteria.forEach(c => {
    totalScore += c.score * c.weight;
    if (c.match === 'unknown') {
      missingInfo.push(c.explanation);
    }
  });
  
  return {
    totalScore: Math.round(totalScore),
    breakdown: {
      industryScore: indMatch.score,
      stageScore: stgMatch.score,
      ticketScore: tktMatch.score,
      geoScore: geoMatch.score,
      businessModelScore: bizMatch.score,
    },
    explanations: criteria,
    missingInfo,
  };
}

export async function computeMatchesForStartup(userId, ctx = {}) {
  const startup = await Startup.findOne({ userId }).lean();
  if (!startup) {
    throw new NotFoundError('Startup profile not found');
  }

  const investors = await Investor.find({ isActive: true }).lean();
  const matchOps = [];

  for (const investor of investors) {
    const scoreResult = computeMatchScore(startup, investor);
    
    // Only save positive matches (score > 20 for example) to save DB space, or save all?
    // Let's save all, but only with scores > 0 to avoid massive useless data.
    if (scoreResult.totalScore >= 0) {
      matchOps.push({
        updateOne: {
          filter: { userId, investorId: investor._id },
          update: {
            $set: {
              startupId: startup._id,
              totalScore: scoreResult.totalScore,
              breakdown: scoreResult.breakdown,
              explanations: scoreResult.explanations,
              missingInfo: scoreResult.missingInfo,
              algorithmVersion: ALGORITHM_VERSION,
              startupSnapshot: startup,
              investorSnapshot: investor,
            }
          },
          upsert: true
        }
      });
    }
  }

  if (matchOps.length > 0) {
    await Match.bulkWrite(matchOps);
  }

  // Update lastMatchRunAt
  await Startup.updateOne({ _id: startup._id }, { lastMatchRunAt: new Date() });

  try {
    await AuditLog.create({
      userId,
      action: 'matches_computed',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      metadata: { matchesFound: matchOps.length },
      severity: 'low',
    });
  } catch (err) {
    logger.warn('Audit log failed', err);
  }

  return { success: true, count: matchOps.length };
}

export async function getMatches(userId, query) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Match.find({ userId }).sort({ totalScore: -1 }).skip(skip).limit(limit).populate('investorId', 'name organization logo').lean(),
    Match.countDocuments({ userId })
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

export async function getMatchById(userId, matchId) {
  const match = await Match.findOne({ _id: matchId, userId }).populate('investorId').lean();
  if (!match) {
    throw new NotFoundError('Match not found');
  }
  return match;
}
