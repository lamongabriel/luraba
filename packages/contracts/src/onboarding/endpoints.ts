import { defineEndpoint } from "../api.js";
import { onboardingOptionsResponseSchema } from "./resource.js";

export const onboardingEndpoints = {
  getOptions: defineEndpoint({
    method: "get",
    path: "/onboarding/options",
    response: onboardingOptionsResponseSchema,
    status: 200,
  }),
} as const;
