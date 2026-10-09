import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import {
  createDealSchema,
  updateDealSchema,
  getDealByIdSchema,
  deleteDealSchema,
  addActivitySchema
} from './deal.validation.js';
import * as dealController from './deal.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', dealController.getDeals);
router.post('/', validate(createDealSchema), dealController.createDeal);
router.get('/:id', validate(getDealByIdSchema), dealController.getDealById);
router.patch('/:id', validate(updateDealSchema), dealController.updateDeal);
router.delete('/:id', validate(deleteDealSchema), dealController.deleteDeal);
router.post('/:id/activities', validate(addActivitySchema), dealController.addActivity);

export default router;
