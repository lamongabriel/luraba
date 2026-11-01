import type { Merchant } from "@luraba/contracts";
import type { Control } from "react-hook-form";
import { FormItem } from "@/components/forms/form-item";

import type { CreateEditTransactionFormValues } from "../create-edit-transaction-form.schema";
import { OptionalMerchantField } from "./optional-merchant-field";

/** Category, merchant and tags side by side, shared by every kind that classifies spending. */
export function ClassificationFields({
  categoryType,
  control,
  merchants,
}: {
  categoryType: "expense" | "income";
  control: Control<CreateEditTransactionFormValues>;
  merchants: Merchant[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <FormItem
        type="category"
        control={control}
        name="categoryId"
        label="Category"
        categoryType={categoryType}
        placeholder="Choose a category"
      />
      <OptionalMerchantField control={control} merchants={merchants} />
      <FormItem type="tag" control={control} name="tagIds" label="Tags" placeholder="Add tags" />
    </div>
  );
}
