import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate.js';
import * as matchingController from './matching.controller.js';

const router = Router();

router.use(authenticate);

router.post('/compute', matchingController.computeMatches);
router.get('/', matchingController.getMatches);
router.get('/:id', matchingController.getMatchById);

export default router;
