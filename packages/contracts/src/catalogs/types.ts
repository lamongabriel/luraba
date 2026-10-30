/**
 * A choice in a catalog. `label` is the text people read: plain English now, kept in the catalog
 * (never inline in a page) so a translation layer can replace it later.
 */
export interface CatalogOption<TValue extends string = string> {
  value: TValue;
  label: string;
  description?: string;
}

/** Looks up a label in a `Record` catalog, falling back to the raw value for unknown input. */
export function labelFor(
  catalog: Readonly<Record<string, { label: string }>>,
  value: string | null | undefined,
): string {
  if (!value) return "";
  return catalog[value]?.label ?? value;
}

/** Turns a `Record` catalog into an ordered options array (key order is display order). */
export function catalogOptions<TValue extends string, TEntry extends { label: string }>(
  catalog: Readonly<Record<TValue, TEntry>>,
): Array<CatalogOption<TValue> & TEntry> {
  return (Object.keys(catalog) as TValue[]).map((value) => ({ value, ...catalog[value] }));
}
