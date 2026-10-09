import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ExternalServiceError,
} from '../../src/common/errors/index.js';

describe('AppError', () => {
  it('sets message, statusCode, code, and isOperational', () => {
    const err = new AppError('test', 400, 'TEST_CODE');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('TEST_CODE');
    expect(err.isOperational).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

describe('ValidationError', () => {
  it('has correct statusCode and code', () => {
    const err = new ValidationError('bad input', [{ field: 'email', message: 'required' }]);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err.fieldErrors).toHaveLength(1);
    expect(err.fieldErrors[0].field).toBe('email');
  });
});

describe('AuthenticationError', () => {
  it('has correct statusCode and code', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.isOperational).toBe(true);
  });
});

describe('ForbiddenError', () => {
  it('has correct statusCode and code', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
    expect(err.isOperational).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('has correct statusCode and code', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.isOperational).toBe(true);
  });
});

describe('ConflictError', () => {
  it('has correct statusCode and code', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.isOperational).toBe(true);
  });
});

describe('RateLimitError', () => {
  it('has correct statusCode and code', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.isOperational).toBe(true);
  });
});

describe('InternalError', () => {
  it('has correct statusCode, code, and isOperational false', () => {
    const err = new InternalError();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(false);
  });
});

describe('ExternalServiceError', () => {
  it('has correct statusCode and code', () => {
    const err = new ExternalServiceError('OpenAI failed', 'openai');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err.service).toBe('openai');
  });
});
