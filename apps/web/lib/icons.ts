// biome-ignore-all lint: I want to manually lint this file, yeah that's it.

import {
  Airplane01Icon,
  Baby01Icon,
  BankIcon,
  BeerIcon,
  BirthdayCakeIcon,
  Bone01Icon,
  Book02Icon,
  Bus01Icon,
  Camera01Icon,
  Car01Icon,
  ChartLineData01Icon,
  Coffee01Icon,
  CreditCardIcon,
  DollarCircleIcon,
  DropletIcon,
  Dumbbell01Icon,
  Fire02Icon,
  FootballIcon,
  Fuel01Icon,
  GameController01Icon,
  GiftIcon,
  GraduationScrollIcon,
  Home01Icon,
  Hospital01Icon,
  Invoice01Icon,
  Leaf01Icon,
  MedicineBottle01Icon,
  MoneyBag02Icon,
  MusicNote01Icon,
  PaintBrush02Icon,
  PiggyBankIcon,
  Pizza01Icon,
  Invoice01Icon as Receipt,
  Restaurant01Icon,
  SecurityCheckIcon,
  Shirt01Icon,
  ShoppingBag03Icon,
  ShoppingCart01Icon,
  SmartPhone01Icon,
  Store01Icon,
  Sun01Icon,
  TagsIcon,
  Train01Icon,
  Tv01Icon,
  Wallet01Icon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";
import type { HugeiconsIcon } from "@hugeicons/react";
import { CURATED_ICON_CATALOG, DEFAULT_ICON_NAME } from "@luraba/contracts";
import type { ComponentProps } from "react";

/**
 * Shared, domain-agnostic icon + color palette used by any entity that lets
 * users pick a "name + color + icon" (categories, tags, and future entities).
 * Keep this module free of feature-specific naming; feature modules
 * (`components/categories/categories.constants.ts`,
 * `components/tags/tags.constants.ts`) re-export from here under their own
 * naming so each feature reads naturally at the call site.
 */

export type CuratedIconData = ComponentProps<typeof HugeiconsIcon>["icon"];

export interface CuratedIconOption {
  /** Persisted icon identifier (a hugeicons export name). */
  name: string;
  /** Icon data rendered via <HugeiconsIcon />. */
  icon: CuratedIconData;
  /** Extra terms to match when searching the picker. */
  keywords?: string;
}

/** Glyph per catalog name (`@luraba/contracts` `CURATED_ICON_CATALOG` owns which names exist). */
const ICON_GLYPHS: Record<string, CuratedIconData> = {
  ShoppingCart01Icon: ShoppingCart01Icon,
  ShoppingBag03Icon: ShoppingBag03Icon,
  Store01Icon: Store01Icon,
  Restaurant01Icon: Restaurant01Icon,
  Pizza01Icon: Pizza01Icon,
  Coffee01Icon: Coffee01Icon,
  BeerIcon: BeerIcon,
  BirthdayCakeIcon: BirthdayCakeIcon,
  Car01Icon: Car01Icon,
  Fuel01Icon: Fuel01Icon,
  Bus01Icon: Bus01Icon,
  Train01Icon: Train01Icon,
  Airplane01Icon: Airplane01Icon,
  Home01Icon: Home01Icon,
  Fire02Icon: Fire02Icon,
  DropletIcon: DropletIcon,
  Sun01Icon: Sun01Icon,
  Wifi01Icon: Wifi01Icon,
  SmartPhone01Icon: SmartPhone01Icon,
  Tv01Icon: Tv01Icon,
  GameController01Icon: GameController01Icon,
  MusicNote01Icon: MusicNote01Icon,
  Camera01Icon: Camera01Icon,
  PaintBrush02Icon: PaintBrush02Icon,
  FootballIcon: FootballIcon,
  Dumbbell01Icon: Dumbbell01Icon,
  Hospital01Icon: Hospital01Icon,
  MedicineBottle01Icon: MedicineBottle01Icon,
  Baby01Icon: Baby01Icon,
  Bone01Icon: Bone01Icon,
  Book02Icon: Book02Icon,
  GraduationScrollIcon: GraduationScrollIcon,
  Shirt01Icon: Shirt01Icon,
  GiftIcon: GiftIcon,
  Leaf01Icon: Leaf01Icon,
  Wallet01Icon: Wallet01Icon,
  MoneyBag02Icon: MoneyBag02Icon,
  DollarCircleIcon: DollarCircleIcon,
  BankIcon: BankIcon,
  CreditCardIcon: CreditCardIcon,
  PiggyBankIcon: PiggyBankIcon,
  ChartLineData01Icon: ChartLineData01Icon,
  Invoice01Icon: Invoice01Icon,
  Receipt: Receipt,
  SecurityCheckIcon: SecurityCheckIcon,
  TagsIcon: TagsIcon,
};

/**
 * Curated palette of icons. Each `name` is a hugeicons export name and
 * therefore matches the API icon regex `^[A-Za-z][A-Za-z0-9]*$`.
 */
export const CURATED_ICONS: readonly CuratedIconOption[] = CURATED_ICON_CATALOG.map((entry) => ({
  ...entry,
  icon: ICON_GLYPHS[entry.name] as CuratedIconData,
}));

/** O(1) lookup from persisted icon name to icon data. */
export const CURATED_ICON_MAP: Record<string, CuratedIconData> = Object.fromEntries(
  CURATED_ICONS.map((option) => [option.name, option.icon]),
);

/** Fallback icon name used when an entity has no icon or an unknown one. */
export const DEFAULT_CURATED_ICON_NAME = DEFAULT_ICON_NAME;

/**
 * Resolves a persisted icon name to renderable icon data.
 * Returns `null` when the name is empty or unknown (caller applies a fallback).
 */
export function resolveCuratedIcon(name: string | null | undefined): CuratedIconData | null {
  if (!name) {
    return null;
  }

  return CURATED_ICON_MAP[name] ?? null;
}

/** Curated color presets. All match the API hex color regex `^#[0-9A-Fa-f]{6}$`. */
export const CURATED_COLOR_PRESETS: readonly string[] = [
  "#A78BFA", // lavender
  "#F59E0B", // amber
  "#2DD4BF", // teal
  "#38BDF8", // sky
  "#FB7185", // coral
  "#84CC16", // lime
  "#C084FC", // purple
  "#F97316", // orange
  "#22C55E", // green
  "#FACC15", // yellow
  "#60A5FA", // blue
  "#94A3B8", // slate
];

/** Default color applied to newly created entities. */
export const DEFAULT_CURATED_COLOR = CURATED_COLOR_PRESETS[0];
