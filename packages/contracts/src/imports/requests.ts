import { z } from "zod";
import { idParamsSchema } from "../common.js";
import { baseListQuerySchema, createListQuerySchema } from "../list.js";
import { importColumnMappingSchema } from "./columns.js";
import { importMappingTargetTypeSchema, importValueFieldSchema } from "./resource.js";

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
  /** Which values to group: merchants (the default), the file's categories or its tags. */
  field: importValueFieldSchema.default("merchant"),
});
export const importFilePreviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const saveImportColumnsBodySchema = z.object({
  mapping: importColumnMappingSchema,
  /** Remember this mapping for the account or card, so the next file with the same layout is pre-filled. */
  saveTemplate: z.boolean().default(false),
});
export const updateImportBodySchema = z
  .object({
    targetAccountId: z.uuid().nullable().optional(),
    targetCreditCardId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");
export const saveImportMappingBodySchema = z.object({
  field: importValueFieldSchema.default("merchant"),
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
    /** Set or clear "this is installment N of M". Null makes it a single purchase. */
    installment: z
      .object({ number: z.number().int().min(1).max(99), total: z.number().int().min(2).max(99) })
      .refine((value) => value.number <= value.total, "The installment can't exceed the total")
      .nullable()
      .optional(),
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
export type SaveImportColumnsInput = z.input<typeof saveImportColumnsBodySchema>;
export type ListImportGroupsQuery = z.input<typeof listImportGroupsQuerySchema>;
export type UpdateImportInput = z.input<typeof updateImportBodySchema>;
export type SaveImportMappingInput = z.input<typeof saveImportMappingBodySchema>;
export type UpdateImportRowsInput = z.input<typeof updateImportRowsBodySchema>;
export type StartImportInput = z.input<typeof startImportBodySchema>;
export type ImportFilter = z.output<typeof importFilterSchema>;
