import * as analyticsService from './analytics.service.js';

export async function getFunnel(req, res) {
  const funnelData = await analyticsService.getFunnelAnalytics(req.user.id);
  res.status(200).json({ data: funnelData });
}

export async function exportDeals(req, res) {
  const csvData = await analyticsService.exportDealsCsv(req.user.id);
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=pipeline_export.csv');
  res.status(200).send(csvData);
}
