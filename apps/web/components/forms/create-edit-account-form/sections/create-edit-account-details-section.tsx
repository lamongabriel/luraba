"use client";

import { useWatch } from "react-hook-form";

import { FormItem } from "@/components/forms/form-item";
import { Typography } from "@/components/ui/typography";
import { ACCOUNT_SUBTYPE_OPTIONS } from "@/lib/accounts";

import type { CreateEditAccountSectionProps } from "./create-edit-account-section.types";
import { CryptoFormSection } from "./crypto-form-section";
import { LoanFormSection } from "./loan-form-section";
import { PropertyFormSection } from "./property-form-section";
import { VehicleFormSection } from "./vehicle-form-section";

export function CreateEditAccountDetailsSection({ disabled, form }: CreateEditAccountSectionProps) {
  const type = useWatch({ control: form.control, name: "type" });

  return (
    <section className="space-y-3">
      <Typography variant="eyebrow">Account details</Typography>
      <div className="space-y-4">
        <FormItem
          type="select"
          control={form.control}
          name="subtype"
          label="Subtype"
          options={ACCOUNT_SUBTYPE_OPTIONS[type]}
          disabled={disabled}
        />

        {type === "crypto" ? <CryptoFormSection form={form} disabled={disabled} /> : null}
        {type === "property" ? <PropertyFormSection form={form} disabled={disabled} /> : null}
        {type === "vehicle" ? <VehicleFormSection form={form} disabled={disabled} /> : null}
        {type === "loan" ? <LoanFormSection form={form} disabled={disabled} /> : null}
      </div>
    </section>
  );
}
