import { isValid, parseISO } from "date-fns";
import { z } from "zod";

export const TRANSACTION_FORM_KINDS = [
  "expense",
  "income",
  "transfer",
  "credit_card_purchase",
  "credit_card_payment",
] as const;

const amountSchema = z.union([
  z
    .number({ error: "Enter a valid amount." })
    .finite()
    .positive("Amount must be greater than zero."),
  z.literal(""),
]);
const optionalId = z
  .string()
  .refine((value) => value === "" || z.uuid().safeParse(value).success, "Choose a valid option.");
const dateSchema = z.string().refine((value) => isValid(parseISO(value)), "Enter a valid date.");

export const createEditTransactionFormSchema = z
  .object({
    kind: z.enum(TRANSACTION_FORM_KINDS),
    description: z
      .string()
      .trim()
      .min(1, "Enter a description.")
      .max(512, "Description must be 512 characters or fewer."),
    amount: amountSchema,
    toAmount: amountSchema,
    accountId: optionalId,
    fromAccountId: optionalId,
    toAccountId: optionalId,
    creditCardId: optionalId,
    categoryId: optionalId,
    merchantId: optionalId,
    paymentMethodCode: z.string().max(32),
    purchaseDate: dateSchema,
    postedDate: dateSchema,
    installmentCount: z
      .number({ error: "Enter a valid installment count." })
      .int("Installments must be a whole number.")
      .min(1, "Use at least one installment.")
      .max(60, "Use no more than 60 installments."),
    includeInBudget: z.boolean(),
    tagIds: z.array(z.uuid()).max(50, "Choose no more than 50 tags."),
  })
  .superRefine((values, context) => {
    const requireId = (field: keyof typeof values, message: string) => {
      if (!values[field]) {
        context.addIssue({ code: "custom", path: [field], message });
      }
    };

    if (values.amount === "") {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter an amount greater than zero.",
      });
    }

    if (values.kind === "expense" || values.kind === "income") {
      requireId("accountId", "Choose an account.");
      if (!values.paymentMethodCode) {
        context.addIssue({
          code: "custom",
          path: ["paymentMethodCode"],
          message: "Choose a payment method.",
        });
      }
    }

    if (values.kind === "transfer") {
      requireId("fromAccountId", "Choose a source account.");
      requireId("toAccountId", "Choose a destination account.");
      if (values.fromAccountId && values.fromAccountId === values.toAccountId) {
        context.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Choose a different destination account.",
        });
      }
      if (values.toAmount === "") {
        context.addIssue({
          code: "custom",
          path: ["toAmount"],
          message: "Enter or quote a destination amount.",
        });
      }
    }

    if (values.kind === "credit_card_purchase") {
      requireId("creditCardId", "Choose a credit card.");
    }

    if (values.kind === "credit_card_payment") {
      requireId("creditCardId", "Choose a credit card.");
      requireId("fromAccountId", "Choose a source account.");
    }
  });

export type CreateEditTransactionFormValues = z.infer<typeof createEditTransactionFormSchema>;
export type TransactionFormKind = CreateEditTransactionFormValues["kind"];
