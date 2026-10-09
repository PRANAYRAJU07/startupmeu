import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import {
  analyzePitchSchema,
  updateAnalysisSchema,
  outreachDraftSchema,
  deleteAnalysisSchema
} from './copilot.validation.js';
import * as copilotController from './copilot.controller.js';

const router = Router();

router.use(authenticate);

router.post('/analyze', validate(analyzePitchSchema), copilotController.analyzePitch);
router.get('/analyses', copilotController.getAnalyses);
router.get('/analyses/:id', copilotController.getAnalysisById);
router.patch('/analyses/:id', validate(updateAnalysisSchema), copilotController.updateAnalysis);
router.delete('/analyses/:id', validate(deleteAnalysisSchema), copilotController.deleteAnalysis);
router.post('/outreach-draft', validate(outreachDraftSchema), copilotController.generateOutreachDraft);

export default router;
