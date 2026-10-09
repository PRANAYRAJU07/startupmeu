import * as investorService from './investor.service.js';

export async function getInvestors(req, res) {
  const result = await investorService.getInvestors(req.query);
  res.status(200).json(result);
}

export async function getInvestorById(req, res) {
  const investor = await investorService.getInvestorById(req.params.id);
  res.status(200).json({ data: investor });
}

export async function saveInvestor(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const saved = await investorService.saveInvestor(
    req.user.id,
    req.body.investorId,
    req.body.notes,
    ctx
  );
  res.status(201).json({ data: saved });
}

export async function getSavedInvestors(req, res) {
  const saved = await investorService.getSavedInvestors(req.user.id);
  res.status(200).json({ data: saved });
}

export async function removeSavedInvestor(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  await investorService.removeSavedInvestor(req.user.id, req.params.id, ctx);
  res.status(204).end();
}
