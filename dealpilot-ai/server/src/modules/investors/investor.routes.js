import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { getInvestorsSchema, getInvestorByIdSchema } from './investor.validation.js';
import * as investorController from './investor.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(getInvestorsSchema), investorController.getInvestors);
router.get('/:id', validate(getInvestorByIdSchema), investorController.getInvestorById);

export default router;
