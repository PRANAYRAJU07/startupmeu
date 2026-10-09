import * as matchingService from './matching.service.js';

export async function computeMatches(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const result = await matchingService.computeMatchesForStartup(req.user.id, ctx);
  res.status(200).json({ data: result });
}

export async function getMatches(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  
  const result = await matchingService.getMatches(req.user.id, { page, limit });
  res.status(200).json(result);
}

export async function getMatchById(req, res) {
  const match = await matchingService.getMatchById(req.user.id, req.params.id);
  res.status(200).json({ data: match });
}
