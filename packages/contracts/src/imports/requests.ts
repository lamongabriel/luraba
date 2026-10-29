import { z } from "zod";
import { idParamsSchema } from "../common.js";
import { baseListQuerySchema, createListQuerySchema } from "../list.js";
import { importMappingTargetTypeSchema } from "./resource.js";

export const importIdParamsSchema = idParamsSchema;
export const importFilterSchema = z.enum([
  "all",
  "attention",
  "invalid",
  "duplicates",
  "skipped",
  "unmapped",
  "created",
  "failed",
]);
export const listImportsQuerySchema = baseListQuerySchema.pick({ page: true, perPage: true });
export const listImportRowsQuerySchema = createListQuerySchema(
  { filter: importFilterSchema.default("all") },
  ["rowIndex", "postedDate", "amount", "description"],
);
export const listImportGroupsQuerySchema = z.object({
  /** `unmapped` returns only the groups still needing a decision. */
  filter: z.enum(["all", "unmapped"]).default("all"),
});
export const updateImportBodySchema = z
  .object({
    targetAccountId: z.uuid().nullable().optional(),
    targetCreditCardId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const saveImportMappingBodySchema = z.object({
  sourceKey: z.string().min(1).max(512),
  targetType: importMappingTargetTypeSchema,
  merchantId: z.uuid().nullable().optional(),
  accountId: z.uuid().nullable().optional(),
  creditCardId: z.uuid().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  tagIds: z.array(z.uuid()).max(50).optional(),
});
export const updateImportRowsBodySchema = z
  .object({
    rowIds: z.array(z.uuid()).min(1).max(5000),
    skip: z.boolean().optional(),
    merchantId: z.uuid().nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    tagIds: z.array(z.uuid()).max(50).nullable().optional(),
    descriptionOverride: z.string().trim().min(1).max(512).nullable().optional(),
  })
  .refine(
    ({ rowIds: _rowIds, ...changes }) => Object.values(changes).some((v) => v !== undefined),
    "At least one change must be provided",
  );
export const startImportBodySchema = z.object({
  /** Skip rows that still have blocking problems instead of refusing to start. */
  skipInvalid: z.boolean().default(false),
});

export type ListImportsQuery = z.input<typeof listImportsQuerySchema>;
export type ListImportRowsQuery = z.input<typeof listImportRowsQuerySchema>;
export type ListImportGroupsQuery = z.input<typeof listImportGroupsQuerySchema>;
export type UpdateImportInput = z.input<typeof updateImportBodySchema>;
export type SaveImportMappingInput = z.input<typeof saveImportMappingBodySchema>;
export type UpdateImportRowsInput = z.input<typeof updateImportRowsBodySchema>;
export type StartImportInput = z.input<typeof startImportBodySchema>;
export type ImportFilter = z.output<typeof importFilterSchema>;
