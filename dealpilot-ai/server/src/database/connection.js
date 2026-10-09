import mongoose from 'mongoose';
import logger from '../common/utils/logger.js';
import config from '../config/index.js';

mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
mongoose.connection.on('error', (err) => logger.error('MongoDB error', { error: err.message }));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

export async function connect() {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
}

export async function disconnect() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
}
