import { Router } from 'express';
import { authenticateUser } from '@/middleware/auth.middleware';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticateUser, authController.me);

export default router;
