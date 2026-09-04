import { defineEndpoint } from "../api.js";
import { healthResponseSchema } from "./resource.js";

export const healthEndpoints = {
  get: defineEndpoint({
    method: "get",
    path: "/health",
    response: healthResponseSchema,
    status: 200,
    responseEnvelope: "raw",
  }),
} as const;
