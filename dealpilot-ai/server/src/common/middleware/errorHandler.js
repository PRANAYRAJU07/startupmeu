import logger from '../utils/logger.js';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
  InternalError,
} from '../errors/index.js';
import config from '../../config/index.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  // Mongoose ValidationError
  if (err.name === 'ValidationError' && err.errors) {
    const fieldErrors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ValidationError('Validation failed', fieldErrors);
  }
  // Mongoose CastError (invalid ObjectId)
  else if (err.name === 'CastError') {
    error = new NotFoundError('Resource not found');
  }
  // Mongoose duplicate key
  else if (err.code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
    error = new ConflictError(`Duplicate value for field: ${field}`);
  }
  // JWT errors
  else if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  } else if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }
  // Non-operational / unknown errors
  else if (!(error instanceof AppError) || !error.isOperational) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, requestId: req.id });
    error = new InternalError();
  }

  if (error.isOperational) {
    logger.warn('Operational error', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      requestId: req.id,
    });
  } else {
    logger.error('Non-operational error', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      requestId: req.id,
    });
  }

  const responseBody = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: config.nodeEnv === 'production' && !error.isOperational
        ? 'An unexpected error occurred'
        : error.message,
      requestId: req.id,
    },
  };

  if (error.fieldErrors && error.fieldErrors.length > 0) {
    responseBody.error.fieldErrors = error.fieldErrors;
  }

  res.status(error.statusCode || 500).json(responseBody);
}
