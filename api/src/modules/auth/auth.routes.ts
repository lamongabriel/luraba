import { Router } from 'express';
import { requireAccess } from '@/middleware/access.middleware';
import * as authController from './auth.controller';

const router = Router();

router.get('/providers', authController.getProviders);
router.get('/me', requireAccess({ household: true }), authController.me);
router.get('/me/preferences', requireAccess({ household: true }), authController.getMyPreferences);
router.patch(
  '/me/preferences',
  requireAccess({ household: true }),
  authController.updateMyPreferences,
);

export default router;
