"use client"

import { FormItem } from "@/components/forms/form-item"
import { MILEAGE_UNIT_OPTIONS } from "@/lib/accounts"

import type { CreateEditAccountSectionProps } from "./create-edit-account-section.types"

export function VehicleFormSection({
  disabled,
  form,
}: CreateEditAccountSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormItem
        control={form.control}
        name="make"
        label="Make"
        placeholder="Toyota"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="model"
        label="Model"
        placeholder="Corolla"
        disabled={disabled}
      />
      <FormItem
        type="int"
        control={form.control}
        name="year"
        label="Year"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="trim"
        label="Trim"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="vin"
        label="VIN"
        disabled={disabled}
      />
      <FormItem
        control={form.control}
        name="licensePlate"
        label="License plate"
        disabled={disabled}
      />
      <FormItem
        type="int"
        control={form.control}
        name="mileage"
        label="Mileage"
        disabled={disabled}
      />
      <FormItem
        type="select"
        control={form.control}
        name="mileageUnit"
        label="Mileage unit"
        placeholder="Select unit"
        disabled={disabled}
        options={MILEAGE_UNIT_OPTIONS}
      />
    </div>
  )
}
