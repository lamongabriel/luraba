import { createHandler } from '@/shared/controllers/controller';
import * as onboardingService from './onboarding.service';
import { GetOnboardingOptionsResponseSchema } from './onboarding.types';

export const getOptions = createHandler({
  response: GetOnboardingOptionsResponseSchema,
  handle: () => onboardingService.getOptions(),
});
