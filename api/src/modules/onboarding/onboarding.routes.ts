import { Router } from 'express';
import * as onboardingController from './onboarding.controller';

const router = Router();

router.get('/options', onboardingController.getOptions);

export default router;
