/**
 * The icons a user (or an agent) can give to a category, tag or any other "name + color + icon"
 * entity. A persisted icon is one of these names (a hugeicons export name). The web app maps each
 * name to its glyph in `apps/web/lib/icons.ts` (a test keeps both in step); the API and the MCP
 * server use this list to validate and to suggest names.
 */
export type CuratedIconEntry = {
  name: string;
  /** Extra search terms. */
  keywords: string;
};

export const CURATED_ICON_CATALOG: readonly CuratedIconEntry[] = [
  { name: "ShoppingCart01Icon", keywords: "groceries shopping cart" },
  { name: "ShoppingBag03Icon", keywords: "shopping bag retail" },
  { name: "Store01Icon", keywords: "store shop market" },
  { name: "Restaurant01Icon", keywords: "restaurant dining food" },
  { name: "Pizza01Icon", keywords: "pizza fast food" },
  { name: "Coffee01Icon", keywords: "coffee cafe drink" },
  { name: "BeerIcon", keywords: "beer alcohol bar drinks" },
  { name: "BirthdayCakeIcon", keywords: "cake birthday party" },
  { name: "Car01Icon", keywords: "car auto vehicle transport" },
  { name: "Fuel01Icon", keywords: "fuel gas petrol station" },
  { name: "Bus01Icon", keywords: "bus public transport" },
  { name: "Train01Icon", keywords: "train metro rail transport" },
  { name: "Airplane01Icon", keywords: "flight travel plane trip" },
  { name: "Home01Icon", keywords: "home rent house mortgage" },
  { name: "Fire02Icon", keywords: "heating gas fire energy" },
  { name: "DropletIcon", keywords: "water utilities bill" },
  { name: "Sun01Icon", keywords: "electricity energy solar" },
  { name: "Wifi01Icon", keywords: "internet wifi network" },
  { name: "SmartPhone01Icon", keywords: "phone mobile bill" },
  { name: "Tv01Icon", keywords: "tv streaming subscription" },
  { name: "GameController01Icon", keywords: "games gaming entertainment" },
  { name: "MusicNote01Icon", keywords: "music audio subscription" },
  { name: "Camera01Icon", keywords: "camera photo hobby" },
  { name: "PaintBrush02Icon", keywords: "art hobby creative" },
  { name: "FootballIcon", keywords: "sports football soccer" },
  { name: "Dumbbell01Icon", keywords: "gym fitness workout health" },
  { name: "Hospital01Icon", keywords: "hospital health medical" },
  { name: "MedicineBottle01Icon", keywords: "medicine pharmacy health" },
  { name: "Baby01Icon", keywords: "baby kids children family" },
  { name: "Bone01Icon", keywords: "pet dog cat animal" },
  { name: "Book02Icon", keywords: "books reading education" },
  { name: "GraduationScrollIcon", keywords: "education tuition school" },
  { name: "Shirt01Icon", keywords: "clothing clothes apparel" },
  { name: "GiftIcon", keywords: "gift present donation" },
  { name: "Leaf01Icon", keywords: "nature eco plant garden" },
  { name: "Wallet01Icon", keywords: "wallet cash money" },
  { name: "MoneyBag02Icon", keywords: "salary income money bag" },
  { name: "DollarCircleIcon", keywords: "dollar money income" },
  { name: "BankIcon", keywords: "bank transfer account" },
  { name: "CreditCardIcon", keywords: "credit card payment" },
  { name: "PiggyBankIcon", keywords: "savings piggy bank invest" },
  { name: "ChartLineData01Icon", keywords: "investment chart stocks" },
  { name: "Invoice01Icon", keywords: "invoice bill payment" },
  { name: "Receipt", keywords: "receipt taxes expense" },
  { name: "SecurityCheckIcon", keywords: "insurance security protection" },
  { name: "TagsIcon", keywords: "tag label category other" },
];

/** Shown when an entity has no icon (or an unknown one). */
export const DEFAULT_ICON_NAME = "TagsIcon";

export const CURATED_ICON_NAMES: readonly string[] = CURATED_ICON_CATALOG.map((icon) => icon.name);

export function isCuratedIcon(name: string): boolean {
  return CURATED_ICON_NAMES.includes(name);
}

/** Icons whose name or keywords contain every word of `query` (all icons when empty). */
export function searchCuratedIcons(query: string): CuratedIconEntry[] {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);
  return CURATED_ICON_CATALOG.filter((icon) => {
    const haystack = `${icon.name} ${icon.keywords}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
