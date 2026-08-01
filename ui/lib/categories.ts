import type { CategoryType } from "@/interfaces/category"
import {
  CURATED_COLOR_PRESETS,
  CURATED_ICONS,
  DEFAULT_CURATED_COLOR,
  DEFAULT_CURATED_ICON_NAME,
  resolveCuratedIcon,
} from "@/lib/icons"

export type { CuratedIconData as CategoryIconData } from "@/lib/icons"

/** Curated palette of category icons (shared icon palette, category naming). */
export const CATEGORY_ICONS = CURATED_ICONS

/** Curated color presets for categories (shared color palette). */
export const CATEGORY_COLOR_PRESETS = CURATED_COLOR_PRESETS

/** Default color applied to new categories. */
export const DEFAULT_CATEGORY_COLOR = DEFAULT_CURATED_COLOR

/** Fallback icon used when a category has no icon or an unknown one. */
export const DEFAULT_CATEGORY_ICON = DEFAULT_CURATED_ICON_NAME

/**
 * Resolves a persisted icon name to renderable icon data.
 * Returns `null` when the name is empty or unknown (caller applies a fallback).
 */
export const resolveCategoryIcon = resolveCuratedIcon

export const CATEGORY_TYPE_OPTIONS: ReadonlyArray<{
  value: CategoryType
  label: string
}> = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
]

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: "Income",
  expense: "Expense",
}

export function getCategoryTypeLabel(type: CategoryType): string {
  return CATEGORY_TYPE_LABELS[type]
}
