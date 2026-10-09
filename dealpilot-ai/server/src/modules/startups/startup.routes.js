import { Router } from 'express';
import { validate } from '../../common/middleware/validate.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { createStartupSchema, updateStartupSchema } from './startup.validation.js';
import * as startupController from './startup.controller.js';

const router = Router();

// All startup routes require authentication
router.use(authenticate);

// We follow the specification:
// GET /api/v1/startups/me
// PUT /api/v1/startups/me (treated as create/update in this implementation, though it says PUT. I'll route POST and PUT)
// DELETE /api/v1/startups/me

router.get('/me', startupController.getMyStartup);
router.post('/me', validate(createStartupSchema), startupController.createMyStartup);
router.put('/me', validate(updateStartupSchema), startupController.updateMyStartup);
router.delete('/me', startupController.deleteMyStartup);

export default router;
