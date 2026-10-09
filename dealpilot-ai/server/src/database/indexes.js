import logger from '../common/utils/logger.js';
import User from '../modules/users/user.model.js';
import RefreshSession from '../modules/auth/refreshSession.model.js';
import EmailToken from '../modules/auth/emailToken.model.js';
import AuditLog from '../modules/auth/auditLog.model.js';
import Startup from '../modules/startups/startup.model.js';
import Investor from '../modules/investors/investor.model.js';
import SavedInvestor from '../modules/investors/savedInvestor.model.js';
import Match from '../modules/matching/match.model.js';
import Deal from '../modules/pipeline/deal.model.js';
import Activity from '../modules/activities/activity.model.js';
import PitchAnalysis from '../modules/copilot/pitchAnalysis.model.js';

const MODELS = [
  { name: 'User', model: User },
  { name: 'RefreshSession', model: RefreshSession },
  { name: 'EmailToken', model: EmailToken },
  { name: 'AuditLog', model: AuditLog },
  { name: 'Startup', model: Startup },
  { name: 'Investor', model: Investor },
  { name: 'SavedInvestor', model: SavedInvestor },
  { name: 'Match', model: Match },
  { name: 'Deal', model: Deal },
  { name: 'Activity', model: Activity },
  { name: 'PitchAnalysis', model: PitchAnalysis },
];

export async function ensureIndexes() {
  for (const { name, model } of MODELS) {
    try {
      await model.createIndexes();
      logger.info(`Indexes ensured for ${name}`);
    } catch (err) {
      logger.error(`Failed to create indexes for ${name}`, { error: err.message });
    }
  }
  logger.info('All indexes ensured');
}
