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
  Receipt,
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
} from "@hugeicons/core-free-icons"
import type { HugeiconsIcon } from "@hugeicons/react"
import type { ComponentProps } from "react"

/**
 * Shared, domain-agnostic icon + color palette used by any entity that lets
 * users pick a "name + color + icon" (categories, tags, and future entities).
 * Keep this module free of feature-specific naming; feature modules
 * (`components/categories/categories.constants.ts`,
 * `components/tags/tags.constants.ts`) re-export from here under their own
 * naming so each feature reads naturally at the call site.
 */

export type CuratedIconData = ComponentProps<typeof HugeiconsIcon>["icon"]

export interface CuratedIconOption {
  /** Persisted icon identifier (a hugeicons export name). */
  name: string
  /** Icon data rendered via <HugeiconsIcon />. */
  icon: CuratedIconData
  /** Extra terms to match when searching the picker. */
  keywords?: string
}

/**
 * Curated palette of icons. Each `name` is a hugeicons export name and
 * therefore matches the API icon regex `^[A-Za-z][A-Za-z0-9]*$`.
 */
export const CURATED_ICONS: readonly CuratedIconOption[] = [
  {
    name: "ShoppingCart01Icon",
    icon: ShoppingCart01Icon,
    keywords: "groceries shopping cart",
  },
  {
    name: "ShoppingBag03Icon",
    icon: ShoppingBag03Icon,
    keywords: "shopping bag retail",
  },
  { name: "Store01Icon", icon: Store01Icon, keywords: "store shop market" },
  {
    name: "Restaurant01Icon",
    icon: Restaurant01Icon,
    keywords: "restaurant dining food",
  },
  { name: "Pizza01Icon", icon: Pizza01Icon, keywords: "pizza fast food" },
  { name: "Coffee01Icon", icon: Coffee01Icon, keywords: "coffee cafe drink" },
  { name: "BeerIcon", icon: BeerIcon, keywords: "beer alcohol bar drinks" },
  {
    name: "BirthdayCakeIcon",
    icon: BirthdayCakeIcon,
    keywords: "cake birthday party",
  },
  {
    name: "Car01Icon",
    icon: Car01Icon,
    keywords: "car auto vehicle transport",
  },
  { name: "Fuel01Icon", icon: Fuel01Icon, keywords: "fuel gas petrol station" },
  { name: "Bus01Icon", icon: Bus01Icon, keywords: "bus public transport" },
  {
    name: "Train01Icon",
    icon: Train01Icon,
    keywords: "train metro rail transport",
  },
  {
    name: "Airplane01Icon",
    icon: Airplane01Icon,
    keywords: "flight travel plane trip",
  },
  {
    name: "Home01Icon",
    icon: Home01Icon,
    keywords: "home rent house mortgage",
  },
  { name: "Fire02Icon", icon: Fire02Icon, keywords: "heating gas fire energy" },
  { name: "DropletIcon", icon: DropletIcon, keywords: "water utilities bill" },
  { name: "Sun01Icon", icon: Sun01Icon, keywords: "electricity energy solar" },
  { name: "Wifi01Icon", icon: Wifi01Icon, keywords: "internet wifi network" },
  {
    name: "SmartPhone01Icon",
    icon: SmartPhone01Icon,
    keywords: "phone mobile bill",
  },
  { name: "Tv01Icon", icon: Tv01Icon, keywords: "tv streaming subscription" },
  {
    name: "GameController01Icon",
    icon: GameController01Icon,
    keywords: "games gaming entertainment",
  },
  {
    name: "MusicNote01Icon",
    icon: MusicNote01Icon,
    keywords: "music audio subscription",
  },
  { name: "Camera01Icon", icon: Camera01Icon, keywords: "camera photo hobby" },
  {
    name: "PaintBrush02Icon",
    icon: PaintBrush02Icon,
    keywords: "art hobby creative",
  },
  {
    name: "FootballIcon",
    icon: FootballIcon,
    keywords: "sports football soccer",
  },
  {
    name: "Dumbbell01Icon",
    icon: Dumbbell01Icon,
    keywords: "gym fitness workout health",
  },
  {
    name: "Hospital01Icon",
    icon: Hospital01Icon,
    keywords: "hospital health medical",
  },
  {
    name: "MedicineBottle01Icon",
    icon: MedicineBottle01Icon,
    keywords: "medicine pharmacy health",
  },
  {
    name: "Baby01Icon",
    icon: Baby01Icon,
    keywords: "baby kids children family",
  },
  { name: "Bone01Icon", icon: Bone01Icon, keywords: "pet dog cat animal" },
  { name: "Book02Icon", icon: Book02Icon, keywords: "books reading education" },
  {
    name: "GraduationScrollIcon",
    icon: GraduationScrollIcon,
    keywords: "education tuition school",
  },
  {
    name: "Shirt01Icon",
    icon: Shirt01Icon,
    keywords: "clothing clothes apparel",
  },
  { name: "GiftIcon", icon: GiftIcon, keywords: "gift present donation" },
  { name: "Leaf01Icon", icon: Leaf01Icon, keywords: "nature eco plant garden" },
  { name: "Wallet01Icon", icon: Wallet01Icon, keywords: "wallet cash money" },
  {
    name: "MoneyBag02Icon",
    icon: MoneyBag02Icon,
    keywords: "salary income money bag",
  },
  {
    name: "DollarCircleIcon",
    icon: DollarCircleIcon,
    keywords: "dollar money income",
  },
  { name: "BankIcon", icon: BankIcon, keywords: "bank transfer account" },
  {
    name: "CreditCardIcon",
    icon: CreditCardIcon,
    keywords: "credit card payment",
  },
  {
    name: "PiggyBankIcon",
    icon: PiggyBankIcon,
    keywords: "savings piggy bank invest",
  },
  {
    name: "ChartLineData01Icon",
    icon: ChartLineData01Icon,
    keywords: "investment chart stocks",
  },
  {
    name: "Invoice01Icon",
    icon: Invoice01Icon,
    keywords: "invoice bill payment",
  },
  { name: "Receipt", icon: Receipt, keywords: "receipt taxes expense" },
  {
    name: "SecurityCheckIcon",
    icon: SecurityCheckIcon,
    keywords: "insurance security protection",
  },
  { name: "TagsIcon", icon: TagsIcon, keywords: "tag label category other" },
]

/** O(1) lookup from persisted icon name to icon data. */
export const CURATED_ICON_MAP: Record<string, CuratedIconData> =
  Object.fromEntries(CURATED_ICONS.map((option) => [option.name, option.icon]))

/** Fallback icon name used when an entity has no icon or an unknown one. */
export const DEFAULT_CURATED_ICON_NAME = "TagsIcon"

/**
 * Resolves a persisted icon name to renderable icon data.
 * Returns `null` when the name is empty or unknown (caller applies a fallback).
 */
export function resolveCuratedIcon(
  name: string | null | undefined,
): CuratedIconData | null {
  if (!name) {
    return null
  }

  return CURATED_ICON_MAP[name] ?? null
}

/** Curated color presets. All match the API hex color regex `^#[0-9A-Fa-f]{6}$`. */
export const CURATED_COLOR_PRESETS: readonly string[] = [
  "#4F46E5", // indigo
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F43F5E", // rose
  "#F97316", // orange
  "#F59E0B", // amber
  "#10B981", // emerald
  "#14B8A6", // teal
  "#0EA5E9", // sky
  "#6366F1", // blue-violet
  "#84CC16", // lime
  "#64748B", // slate
]

/** Default color applied to newly created entities. */
export const DEFAULT_CURATED_COLOR = CURATED_COLOR_PRESETS[0]
