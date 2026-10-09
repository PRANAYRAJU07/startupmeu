import * as copilotService from './copilot.service.js';

export async function analyzePitch(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const analysis = await copilotService.analyzePitch(req.user.id, req.body, ctx);
  res.status(201).json({ data: analysis });
}

export async function getAnalyses(req, res) {
  const analyses = await copilotService.getAnalyses(req.user.id);
  res.status(200).json({ data: analyses });
}

export async function getAnalysisById(req, res) {
  const analysis = await copilotService.getAnalysisById(req.user.id, req.params.id);
  res.status(200).json({ data: analysis });
}

export async function updateAnalysis(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const analysis = await copilotService.updateAnalysis(req.user.id, req.params.id, req.body, ctx);
  res.status(200).json({ data: analysis });
}

export async function deleteAnalysis(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  await copilotService.deleteAnalysis(req.user.id, req.params.id, ctx);
  res.status(204).end();
}

export async function generateOutreachDraft(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const draft = await copilotService.generateOutreachDraft(req.user.id, req.body, ctx);
  res.status(201).json({ data: draft });
}
