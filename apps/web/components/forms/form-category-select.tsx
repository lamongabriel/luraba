"use client";

import type { Category, CategoryType } from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { ComboboxControl, type FormComboboxOption } from "@/components/forms/form-combobox";
import { Icon } from "@/components/ui/icon";
import { useCategoriesQuery } from "@/queries/categories/use-categories-query";

const CLEAR_VALUE = "";

export interface CategorySelectControlProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Restrict the options to a single category type. */
  type?: CategoryType;
  /** Exclude a category id (e.g. to prevent self-selection as a parent). */
  excludeId?: string;
  /** Adds a "None" option so the field can be reset to empty. */
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  triggerClassName?: string;
}

function buildOptions(
  categories: Category[],
  { type, excludeId }: { type?: CategoryType; excludeId?: string },
): FormComboboxOption[] {
  return categories
    .filter((category) => (type ? category.type === type : true))
    .filter((category) => (excludeId ? category.id !== excludeId : true))
    .map((category) => ({
      value: category.id,
      label: category.name,
      searchText: category.name,
    }));
}

/**
 * Raw category combobox control (no `Controller`, no `Field` wrapper). This
 * is only meant to be rendered by `FormItem` (`type="category"`) - it is not
 * intended to be used standalone outside of a form field context.
 */
export function CategorySelectControl({
  id,
  value,
  onChange,
  placeholder = "Select a category",
  type,
  excludeId,
  allowClear = false,
  clearLabel = "None",
  disabled,
  ariaInvalid,
  triggerClassName,
}: CategorySelectControlProps) {
  const categoriesQuery = useCategoriesQuery(
    type ? { types: [type], perPage: MAX_PER_PAGE } : { perPage: MAX_PER_PAGE },
  );
  const categories = categoriesQuery.data?.data ?? [];

  const options = buildOptions(categories, { type, excludeId });
  const resolvedOptions: FormComboboxOption[] = allowClear
    ? [{ value: CLEAR_VALUE, label: clearLabel }, ...options]
    : options;

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const renderOptionContent = (option: FormComboboxOption) => {
    if (option.value === CLEAR_VALUE) {
      return (
        <span className="flex min-w-0 items-center gap-2 text-muted-foreground">{clearLabel}</span>
      );
    }

    const category = categoryById.get(option.value);

    return (
      <span className="flex min-w-0 items-center gap-2">
        <Icon name={category?.icon} color={category?.color} variant="chip" size="sm" />
        <span className="truncate">{option.label}</span>
      </span>
    );
  };

  const isPending = categoriesQuery.isPending;

  return (
    <ComboboxControl
      id={id}
      value={value}
      options={resolvedOptions}
      onChange={onChange}
      placeholder={isPending ? "Loading categories..." : placeholder}
      searchPlaceholder="Search categories..."
      emptyMessage="No categories found."
      disabled={disabled || isPending}
      ariaInvalid={ariaInvalid}
      triggerClassName={triggerClassName}
      renderOption={(option) => renderOptionContent(option)}
      renderValue={(option) =>
        option && option.value !== CLEAR_VALUE ? renderOptionContent(option) : undefined
      }
    />
  );
}
