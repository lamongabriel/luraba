import { z } from "zod";
import { defineEndpoint } from "../api.js";
import { exporterSchema } from "./resource.js";

/** `GET /exports/:exporterId` streams a file, so like uploads it is a plain route outside the registry. */
export const exportsEndpoints = {
  list: defineEndpoint({
    method: "get",
    path: "/exports",
    response: z.array(exporterSchema),
    status: 200,
  }),
} as const;
