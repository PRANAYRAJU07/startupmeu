import Deal from '../pipeline/deal.model.js';
import { PIPELINE_STAGES } from '../../common/constants/index.js';
import { Parser } from 'json2csv';

export async function getFunnelAnalytics(userId) {
  const deals = await Deal.find({ userId, isActive: true }).lean();

  const funnel = {};
  for (const stage of PIPELINE_STAGES) {
    funnel[stage] = { count: 0, value: 0 };
  }

  let totalCommitted = 0;

  for (const deal of deals) {
    if (funnel[deal.stage]) {
      funnel[deal.stage].count += 1;
      const amount = deal.committedAmount || 0;
      funnel[deal.stage].value += amount;
      
      if (deal.stage === 'committed' || deal.stage === 'closed-won') {
        totalCommitted += amount;
      }
    }
  }

  const stageCountRatios = {
    contactedToMeetingRatio: calculateConversion(funnel['contacted']?.count, funnel['meeting-scheduled']?.count),
    meetingToDiligenceRatio: calculateConversion(funnel['meeting-scheduled']?.count, funnel['due-diligence']?.count),
    diligenceToCommittedRatio: calculateConversion(funnel['due-diligence']?.count, funnel['committed']?.count),
  };

  return {
    funnel,
    summary: {
      totalDeals: deals.length,
      totalCommitted,
    },
    stageCountRatios, // Note: These are ratios of current counts, not true historical conversion rates
  };
}

function calculateConversion(fromCount, toCount) {
  if (!fromCount) return 0;
  return Math.round((toCount / fromCount) * 100);
}

function preventFormulaInjection(val) {
  if (typeof val !== 'string') return val;
  // Prefix dangerous characters with a single quote to prevent spreadsheet execution
  if (/^[\s\=\+\-\@\t\r]/.test(val)) {
    return `'${val}`;
  }
  return val;
}

export async function exportDealsCsv(userId) {
  const deals = await Deal.find({ userId }).populate('investorId', 'name organization').lean();
  
  const flattened = deals.map(d => ({
    id: d._id.toString(),
    investorName: preventFormulaInjection(d.investorId ? (d.investorId.organization || d.investorId.name) : d.investorName),
    stage: preventFormulaInjection(d.stage),
    committedAmount: d.committedAmount || 0,
    commitCurrency: preventFormulaInjection(d.commitCurrency || 'USD'),
    nextAction: preventFormulaInjection(d.nextAction || ''),
    followUpDate: d.followUpDate ? new Date(d.followUpDate).toISOString().split('T')[0] : '',
    createdAt: new Date(d.createdAt).toISOString().split('T')[0],
  }));

  const parser = new Parser({
    fields: ['id', 'investorName', 'stage', 'committedAmount', 'commitCurrency', 'nextAction', 'followUpDate', 'createdAt'],
  });
  
  return parser.parse(flattened);
}
