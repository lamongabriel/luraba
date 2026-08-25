import {
  CURATED_COLOR_PRESETS,
  CURATED_ICONS,
  DEFAULT_CURATED_COLOR,
  DEFAULT_CURATED_ICON_NAME,
  resolveCuratedIcon,
} from "@/lib/icons"

export type { CuratedIconData as TagIconData } from "@/lib/icons"

/** Curated palette of tag icons (shared icon palette, tag naming). */
export const TAG_ICONS = CURATED_ICONS

/** Curated color presets for tags (shared color palette). */
export const TAG_COLOR_PRESETS = CURATED_COLOR_PRESETS

/** Default color applied to new tags. */
export const DEFAULT_TAG_COLOR = DEFAULT_CURATED_COLOR

/** Fallback icon used when a tag has no icon or an unknown one. */
export const DEFAULT_TAG_ICON = DEFAULT_CURATED_ICON_NAME

/**
 * Resolves a persisted icon name to renderable icon data.
 * Returns `null` when the name is empty or unknown (caller applies a fallback).
 */
export const resolveTagIcon = resolveCuratedIcon
