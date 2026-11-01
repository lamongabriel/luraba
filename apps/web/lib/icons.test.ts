import { CURATED_ICON_CATALOG } from "@luraba/contracts";
import { describe, expect, it } from "vitest";
import { CURATED_ICONS, resolveCuratedIcon } from "./icons";

describe("curated icons", () => {
  it("has a glyph for every name in the shared catalog, in the same order", () => {
    expect(CURATED_ICONS.map((icon) => icon.name)).toEqual(
      CURATED_ICON_CATALOG.map((icon) => icon.name),
    );
    for (const entry of CURATED_ICON_CATALOG) expect(resolveCuratedIcon(entry.name)).toBeTruthy();
  });
});
