import { z } from "zod";

/** JSON Schema for a tool's input, as the MCP `tools/list` response expects it. */
export function toInputSchema(schema: z.ZodObject): {
  type: "object";
  properties?: Record<string, object>;
  required?: string[];
} {
  const json = z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  return { ...json, type: "object" } as {
    type: "object";
    properties?: Record<string, object>;
    required?: string[];
  };
}
