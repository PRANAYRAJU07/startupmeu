import { AuthenticationError, ForbiddenError } from '../errors/index.js';

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AuthenticationError('Not authenticated'));
    if (!roles.includes(req.user.role)) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}
