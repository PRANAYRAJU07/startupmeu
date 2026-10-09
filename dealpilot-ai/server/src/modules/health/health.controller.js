import mongoose from 'mongoose';
import { InternalError } from '../../common/errors/index.js';

export function getLive(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

export function getReady(req, res) {
  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    throw new InternalError('Database not ready');
  }
  res.status(200).json({
    status: 'ready',
    db: 'connected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
