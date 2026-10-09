import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { saveInvestorSchema, deleteSavedInvestorSchema } from './investor.validation.js';
import * as investorController from './investor.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', investorController.getSavedInvestors);
router.post('/', validate(saveInvestorSchema), investorController.saveInvestor);
router.delete('/:id', validate(deleteSavedInvestorSchema), investorController.removeSavedInvestor);

export default router;
