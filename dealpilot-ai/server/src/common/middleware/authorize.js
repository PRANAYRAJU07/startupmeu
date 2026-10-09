import { AuthenticationError, ForbiddenError } from '../errors/index.js';

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) throw new AuthenticationError('Not authenticated');
    if (!roles.includes(req.user.role)) throw new ForbiddenError('Insufficient permissions');
    next();
  };
}
