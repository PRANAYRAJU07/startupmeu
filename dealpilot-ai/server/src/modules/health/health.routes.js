import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler.js';
import { getLive, getReady } from './health.controller.js';

const router = Router();

router.get('/live', asyncHandler(getLive));
router.get('/ready', asyncHandler(getReady));

export default router;
