import * as dealService from './deal.service.js';

export async function getDeals(req, res) {
  const deals = await dealService.getDeals(req.user.id);
  res.status(200).json({ data: deals });
}

export async function getDealById(req, res) {
  const deal = await dealService.getDealById(req.user.id, req.params.id);
  res.status(200).json({ data: deal });
}

export async function createDeal(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const deal = await dealService.createDeal(req.user.id, req.body, ctx);
  res.status(201).json({ data: deal });
}

export async function updateDeal(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const deal = await dealService.updateDeal(req.user.id, req.params.id, req.body, ctx);
  res.status(200).json({ data: deal });
}

export async function deleteDeal(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  await dealService.deleteDeal(req.user.id, req.params.id, ctx);
  res.status(204).end();
}

export async function addActivity(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const deal = await dealService.addContactActivity(req.user.id, req.params.id, req.body, ctx);
  res.status(201).json({ data: deal });
}
