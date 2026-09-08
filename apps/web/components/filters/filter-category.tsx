"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { Category, CategoryType } from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import type { Column } from "@tanstack/react-table";
import { FilterFaceted } from "@/components/filters/filter-faceted";
import { DEFAULT_CATEGORY_ICON, resolveCategoryIcon } from "@/lib/categories";
import { useCategoriesQuery } from "@/queries/categories/use-categories-query";
import type { Option } from "@/types/data-table";

/**
 * Builds a small svg icon component tinted with the category color, matching the
 * `Option.icon` contract expected by FilterFaceted. Color lives only on the icon.
 */
function createCategoryOptionIcon(category: Category) {
  const icon = resolveCategoryIcon(category.icon) ?? resolveCategoryIcon(DEFAULT_CATEGORY_ICON);

  return function CategoryOptionIcon({
    strokeWidth: _strokeWidth,
    style,
    ...props
  }: React.ComponentProps<"svg">) {
    if (!icon) {
      return null;
    }

    return (
      <HugeiconsIcon
        icon={icon}
        strokeWidth={2}
        {...props}
        style={{ color: category.color ?? undefined, ...style }}
      />
    );
  };
}

function buildCategoryOptions(categories: Category[]): Option[] {
  return categories.map((category) => ({
    label: category.name,
    value: category.id,
    icon: createCategoryOptionIcon(category),
  }));
}

type FilterCategoryProps<TData, TValue> =
  | {
      column: Column<TData, TValue>;
      title?: string;
      multiple?: boolean;
      /** Restrict the fetched categories to a single type. */
      type?: CategoryType;
    }
  | {
      value?: string | string[];
      onValueChange?: (value: string | string[] | undefined) => void;
      title?: string;
      multiple?: boolean;
      type?: CategoryType;
    };

/**
 * Faceted filter for categories. Fetches categories and renders each option with
 * its resolved icon tinted by the category color. Reusable in tables (via
 * `column`) or as a controlled filter (via `value`/`onValueChange`).
 */
export function FilterCategory<TData, TValue>(props: FilterCategoryProps<TData, TValue>) {
  const { type } = props;
  const categoriesQuery = useCategoriesQuery(
    type ? { types: [type], perPage: MAX_PER_PAGE } : { perPage: MAX_PER_PAGE },
  );
  const options = buildCategoryOptions(categoriesQuery.data?.data ?? []);
  const title = props.title ?? "Category";
  const multiple = props.multiple ?? true;

  if ("column" in props) {
    return (
      <FilterFaceted column={props.column} title={title} options={options} multiple={multiple} />
    );
  }

  return (
    <FilterFaceted
      value={props.value}
      onValueChange={props.onValueChange}
      title={title}
      options={options}
      multiple={multiple}
    />
  );
}
