import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import config from './config/index.js';
import logger from './common/utils/logger.js';
import { requestId } from './common/middleware/requestId.js';
import { apiLimiter } from './common/middleware/rateLimiter.js';
import { errorHandler } from './common/middleware/errorHandler.js';
import { NotFoundError } from './common/errors/index.js';
import healthRouter from './modules/health/health.routes.js';
import authRouter from './modules/auth/auth.routes.js';
import startupRouter from './modules/startups/startup.routes.js';
import investorRouter from './modules/investors/investor.routes.js';
import savedInvestorRouter from './modules/investors/savedInvestor.routes.js';
import matchingRouter from './modules/matching/matching.routes.js';
import copilotRouter from './modules/copilot/copilot.routes.js';
import dealRouter from './modules/pipeline/deal.routes.js';
import analyticsRouter from './modules/analytics/analytics.routes.js';

const app = express();

// Request ID — must be first so all subsequent logs include it
app.use(requestId);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Cookie parsing
app.use(cookieParser());

// HTTP request logging via morgan -> winston
const morganFormat = config.nodeEnv === 'development' ? 'dev' : 'combined';
app.use(morgan(morganFormat, { stream: { write: (msg) => logger.http(msg.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting on all API routes
app.use('/api/', apiLimiter);

// Routes
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/startups', startupRouter);
app.use('/api/v1/investors', investorRouter);
app.use('/api/v1/saved-investors', savedInvestorRouter);
app.use('/api/v1/matches', matchingRouter);
app.use('/api/v1/copilot', copilotRouter);
app.use('/api/v1/deals', dealRouter);
app.use('/api/v1/analytics', analyticsRouter);

// 404 handler
app.use((req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
});

// Global error handler — must be last
app.use(errorHandler);

export default app;
