import { getEndpointRouterPath, onboardingEndpoints } from "@luraba/contracts";
import { Router } from "express";
import * as onboardingController from "./onboarding.controller";

const router = Router();

router.get(getEndpointRouterPath(onboardingEndpoints.getOptions), onboardingController.getOptions);

export default router;
