import { CURATED_ICON_CATALOG, CURATED_ICON_NAMES, searchCuratedIcons } from "@luraba/contracts";
import { z } from "zod";
import { normalize } from "../resolve/match.js";
import type { Problems } from "../resolve/problems.js";
import { defineTool, READ_ONLY } from "./types.js";

const MAX_SUGGESTIONS = 8;

export const ICON_HINT =
  "Icon names come from list_icons (e.g. ShoppingBag03Icon); use list_icons with a search word to find one.";

/**
 * The supported icon for `query`, matching case-insensitively and with or without the `Icon` suffix.
 * Unknown names are recorded as a problem with the closest icons as candidates.
 */
export function resolveIcon(problems: Problems, query: string): string | undefined {
  const needle = normalize(query).replace(/ /gu, "");
  const exact = CURATED_ICON_NAMES.find((name) => {
    const key = normalize(name).replace(/ /gu, "");
    return key === needle || key === `${needle}icon`;
  });
  if (exact) return exact;
  const words = normalize(query).split(" ").filter(Boolean);
  const scored = CURATED_ICON_CATALOG.map((icon) => {
    const haystack = normalize(`${icon.name} ${icon.keywords}`);
    return {
      icon,
      score: words.filter((word) => haystack.includes(word.length > 5 ? word.slice(0, 5) : word))
        .length,
    };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ icon }) => ({ id: icon.name, name: icon.name }));
  problems.items.push({
    field: "icon",
    query,
    reason: "not_found",
    candidates: scored,
    hint: `"${query}" is not a supported icon. ${scored.length > 0 ? "Pick one of the candidates (the id is the icon name)" : "Call list_icons to see the supported icons"}.`,
  });
  return undefined;
}

export const listIcons = defineTool({
  name: "list_icons",
  title: "List supported icons",
  description:
    'The icon names a category (or tag) can have, with search keywords, so you pick a valid one instead of guessing. Pass search to filter by words (e.g. "grocery", "car"). Use the name with create_category / update_category icon.',
  input: z.object({
    search: z.string().optional().describe("Words that appear in the icon name or its keywords."),
  }),
  annotations: READ_ONLY,
  async handler(_context, { search }) {
    const icons = searchCuratedIcons(search ?? "");
    return {
      summary: `${icons.length} icon(s).`,
      data: {
        count: icons.length,
        icons: icons.map((icon) => ({ name: icon.name, keywords: icon.keywords })),
      },
    };
  },
});
