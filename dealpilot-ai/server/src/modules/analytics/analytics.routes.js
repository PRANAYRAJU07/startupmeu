import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.js';
import * as analyticsController from './analytics.controller.js';

const router = Router();

router.use(authenticate);

router.get('/funnel', analyticsController.getFunnel);
router.get('/export', analyticsController.exportDeals);

export default router;
