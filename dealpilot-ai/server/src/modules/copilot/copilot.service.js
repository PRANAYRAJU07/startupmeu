import CopilotAnalysis from './copilotAnalysis.model.js';
import Startup from '../startups/startup.model.js';
import Investor from '../investors/investor.model.js';
import Match from '../matching/match.model.js';
import AuditLog from '../auth/auditLog.model.js';
import { NotFoundError } from '../../common/errors/index.js';
import { aiProvider } from '../../integrations/ai/aiProvider.js';
import config from '../../config/index.js';
import logger from '../../common/utils/logger.js';

export async function analyzePitch(userId, { startupId, pitchText, goals }, ctx = {}) {
  let startupText = '';
  if (startupId) {
    const startup = await Startup.findOne({ _id: startupId, userId }).lean();
    if (startup) {
      startupText = `Name: ${startup.name}\nIndustry: ${startup.industry}\nStage: ${startup.stage}\nDescription: ${startup.description || ''}`;
    }
  }

  // Use the AI provider
  const analysisResult = await aiProvider.analyzePitch(startupText, pitchText, goals);

  // Save to DB
  const analysis = await CopilotAnalysis.create({
    userId,
    startupId,
    inputSnapshot: {
      startupText,
      pitchText,
      goals,
    },
    output: analysisResult,
    providerMetadata: {
      provider: config.aiProvider,
      model: 'default',
    },
    isMock: config.aiProvider === 'mock',
    status: 'draft',
  });

  try {
    await AuditLog.create({
      userId,
      action: 'pitch_analysis_created',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      metadata: { analysisId: analysis._id },
      severity: 'low',
    });
  } catch (err) {
    logger.warn('AuditLog failed', err);
  }

  return analysis;
}

export async function getAnalyses(userId) {
  return await CopilotAnalysis.find({ userId }).sort({ createdAt: -1 }).lean();
}

export async function getAnalysisById(userId, analysisId) {
  const analysis = await CopilotAnalysis.findOne({ _id: analysisId, userId }).lean();
  if (!analysis) throw new NotFoundError('Analysis not found');
  return analysis;
}

export async function updateAnalysis(userId, analysisId, updates, ctx = {}) {
  const analysis = await CopilotAnalysis.findOneAndUpdate(
    { _id: analysisId, userId },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!analysis) throw new NotFoundError('Analysis not found');
  return analysis;
}

export async function deleteAnalysis(userId, analysisId, ctx = {}) {
  const analysis = await CopilotAnalysis.findOneAndDelete({ _id: analysisId, userId });
  if (!analysis) throw new NotFoundError('Analysis not found');
}

export async function generateOutreachDraft(userId, { startupId, investorId }, ctx = {}) {
  const investor = await Investor.findById(investorId).lean();
  if (!investor) throw new NotFoundError('Investor not found');

  let startupFacts = '';
  if (startupId) {
    const startup = await Startup.findOne({ _id: startupId, userId }).lean();
    if (startup) {
      startupFacts = `Name: ${startup.name}\nIndustry: ${startup.industry}\nStage: ${startup.stage}\nDescription: ${startup.description || ''}`;
    }
  }

  // Try to find an existing match explanation
  const match = await Match.findOne({ userId, investorId }).lean();
  const matchExplanation = match ? `Match Score: ${match.totalScore}. Explanations: ${match.explanations.map(e => e.explanation).join(' ')}` : 'No prior match calculation.';

  const draft = await aiProvider.generateOutreachDraft(startupFacts, investor.thesis || '', matchExplanation);

  try {
    await AuditLog.create({
      userId,
      action: 'pitch_draft_saved',
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      requestId: ctx.requestId,
      metadata: { investorId },
      severity: 'low',
    });
  } catch (err) {
    logger.warn('AuditLog failed', err);
  }

  return draft;
}
