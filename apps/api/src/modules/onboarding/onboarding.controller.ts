import { onboardingEndpoints } from '@luraba/contracts/onboarding';
import { createHandler } from '@/shared/controllers/controller';
import * as onboardingService from './onboarding.service';

export const getOptions = createHandler({
  response: onboardingEndpoints.getOptions.response,
  handle: () => onboardingService.getOptions(),
});
