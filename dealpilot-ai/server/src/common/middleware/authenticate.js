import { verifyAccessToken } from '../utils/token.js';
import { AuthenticationError } from '../errors/index.js';
import config from '../../config/index.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = verifyAccessToken(token, config.accessTokenSecret);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err instanceof AuthenticationError) {
      next(err);
    } else if (err.name === 'TokenExpiredError') {
      next(new AuthenticationError('Token expired'));
    } else {
      next(new AuthenticationError('Invalid token'));
    }
  }
}

export default authenticate;
