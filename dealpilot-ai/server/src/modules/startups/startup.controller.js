import * as startupService from './startup.service.js';

/**
 * Get current user's startup profile
 */
export async function getMyStartup(req, res) {
  const startup = await startupService.getStartupByUserId(req.user.id);
  res.status(200).json({ data: startup });
}

/**
 * Create or update current user's startup profile
 */
export async function createMyStartup(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const startup = await startupService.createStartup(req.user.id, req.body, ctx);
  res.status(201).json({ data: startup });
}

/**
 * Update current user's startup profile
 */
export async function updateMyStartup(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  const startup = await startupService.updateStartup(req.user.id, req.body, ctx);
  res.status(200).json({ data: startup });
}

/**
 * Delete current user's startup profile
 */
export async function deleteMyStartup(req, res) {
  const ctx = {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    requestId: req.id,
  };
  
  await startupService.deleteStartup(req.user.id, ctx);
  res.status(204).end();
}
