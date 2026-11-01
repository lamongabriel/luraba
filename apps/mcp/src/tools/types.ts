import type { z } from "zod";
import type { LurabaClient } from "../client/luraba-client.js";
import type { Logger } from "../logger.js";
import type { References } from "../resolve/references.js";

export type ToolContext = {
  client: LurabaClient;
  /** Memoized reference data (accounts, categories, ...) for the duration of one tool call. */
  refs: References;
  logger: Logger;
};

/** What a tool returns: structured data for the agent, plus an optional one-line summary. */
export type ToolOutput = {
  summary?: string;
  data: Record<string, unknown>;
  /** True when the call did not do what was asked (invalid input, needs clarification...). */
  isError?: boolean;
};

export type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: false;
};

export type ToolDefinition<TInput extends z.ZodObject = z.ZodObject> = {
  name: string;
  title: string;
  description: string;
  input: TInput;
  annotations: ToolAnnotations;
  handler: (context: ToolContext, args: z.output<TInput>) => Promise<ToolOutput>;
};

export function defineTool<TInput extends z.ZodObject>(
  definition: ToolDefinition<TInput>,
): ToolDefinition<TInput> {
  return definition;
}

export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
export const WRITE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};
export const IDEMPOTENT_WRITE: ToolAnnotations = { ...WRITE, idempotentHint: true };
export const DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};
