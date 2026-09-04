import { defineEndpoint } from "../api.js";
import { locationOptionsResponseSchema } from "./resource.js";

export const referenceDataEndpoints = {
  getLocations: defineEndpoint({
    method: "get",
    path: "/reference-data/locations",
    response: locationOptionsResponseSchema,
    status: 200,
  }),
} as const;
