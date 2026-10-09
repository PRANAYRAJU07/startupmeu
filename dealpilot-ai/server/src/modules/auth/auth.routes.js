import { Router } from 'express';
import { authLimiter } from '../../common/middleware/rateLimiter.js';
import { validate } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validation.js';
import * as authController from './auth.controller.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);

// Email verification — token in query string
router.get('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
// Also accept POST /verify-email with token in body for test spec compatibility
router.post('/verify-email', (req, res, next) => {
  // Move body token to query so the service path is the same
  if (req.body?.token && !req.query?.token) {
    req.query = { ...req.query, token: req.body.token };
  }
  next();
}, validate(verifyEmailSchema), authController.verifyEmail);

// Password reset
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Authenticated routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.get('/me', authenticate, authController.me);

export default router;
