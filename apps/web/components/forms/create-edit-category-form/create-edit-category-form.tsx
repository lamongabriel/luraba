"use client";

import type { Category, CategoryType } from "@luraba/contracts";
import { FormItem } from "@/components/forms/form-item";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Typography } from "@/components/ui/typography";
import { CATEGORY_COLOR_PRESETS, CATEGORY_ICONS, CATEGORY_TYPE_OPTIONS } from "@/lib/categories";

import { useCreateEditCategoryForm } from "./use-create-edit-category-form";

export function CreateEditCategoryForm({
  category,
  onCancel,
  onSuccess,
}: {
  category?: Category;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { form, onSubmit, isEdit, isPending, errorMessage } = useCreateEditCategoryForm({
    category,
    onSuccess,
  });

  const type = form.watch("type") as CategoryType;
  const color = form.watch("color");
  const icon = form.watch("icon");
  const name = form.watch("name");

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-input/10 p-3">
        <Icon name={icon} color={color} variant="chip" size="md" />
        <div className="min-w-0">
          <Typography variant="small-strong" className="truncate">
            {name.trim() || "New category"}
          </Typography>
          <Typography variant="small-muted" className="text-[0.72rem]">
            {type === "income" ? "Income" : "Expense"}
          </Typography>
        </div>
      </div>

      <FormItem
        control={form.control}
        name="name"
        label="Name"
        placeholder="Groceries"
        disabled={isPending}
      />

      <FormItem
        type="select"
        control={form.control}
        name="type"
        label="Type"
        placeholder="Select a type"
        disabled={isPending || isEdit}
        options={CATEGORY_TYPE_OPTIONS}
        description={isEdit ? "Type cannot be changed after creation." : undefined}
      />

      {/* Re-render the parent select against the current type so options stay valid. */}
      <FormItem
        type="category"
        key={type}
        control={form.control}
        name="parentId"
        label="Parent category"
        placeholder="No parent"
        categoryType={type}
        excludeId={category?.id}
        allowClear
        disabled={isPending}
        description="Optionally nest this category under a parent of the same type."
      />

      <FormItem
        type="colorSwatches"
        control={form.control}
        name="color"
        label="Color"
        presets={CATEGORY_COLOR_PRESETS}
        disabled={isPending}
      />

      <FormItem
        type="icon"
        control={form.control}
        name="icon"
        label="Icon"
        icons={CATEGORY_ICONS}
        tintColor={color}
        disabled={isPending}
      />

      {errorMessage ? <Typography variant="small-destructive">{errorMessage}</Typography> : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isPending}
          loadingText={isEdit ? "Saving..." : "Creating..."}
        >
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
