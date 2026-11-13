import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "..");
const ALLOWED = new Set([
  "components/ui/masked-input.tsx",
  "components/ui/number-ticker.tsx",
  "components/ui/calendar.tsx",
  "components/ui/chart.tsx",
  "components/charts/vertical-bar-chart.tsx",
]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === ".next" || name === "__tests__") return [];
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/u.test(name) && !/\.test\.tsx?$/u.test(name) ? [path] : [];
  });
}

function offenders(pattern: RegExp): string[] {
  return (
    ["app", "components", "lib"]
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .map((path) => relative(ROOT, path))
      .filter((path) => !ALLOWED.has(path))
      // Vendored ReUI (components/reui, installed with the ReUI CLI). Luraba's own editors replace its number inputs.
      .filter((path) => !path.startsWith("components/reui/"))
      .filter((path) => pattern.test(readFileSync(join(ROOT, path), "utf8")))
  );
}

describe("shared formatting conventions (docs/formatting.md)", () => {
  it("has no raw number inputs", () => {
    expect(offenders(/<(?:Input|input)\b[^>]*?type="number"/u)).toEqual([]);
    expect(offenders(/inputType="number"/u)).toEqual([]);
  });

  it("formats numbers and dates only through the shared helpers", () => {
    expect(offenders(/\.toLocale(?:Date|Time)?String\(/u)).toEqual([]);
    expect(offenders(/new Date\(\)\.get(?:Date|Day|Month|FullYear)\(/u)).toEqual([]);
  });

  it("does not hard-code a default currency", () => {
    expect(offenders(/\?\? "(?:BRL|USD|EUR)"/u).filter((p) => !p.endsWith("finance.ts"))).toEqual(
      [],
    );
  });

  it("builds currency, country and time zone choices only through the shared selects", () => {
    expect(offenders(/\$\{\w+\.code\} \(\$\{\w+\.symbol\}\)/u)).toEqual([]);
    expect(offenders(/createTimezoneOptions|CountryCombobox|useCurrencyOptions/u)).toEqual([]);
  });
});

describe("page state conventions (AGENTS.md: reuse before you build)", () => {
  const pages = (() => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name === "page.tsx") found.push(path);
      }
    };
    walk(join(ROOT, "app", "(app)"));
    return found;
  })();
  const dataPages = pages.filter((page) => /\buse\w+Query\(/u.test(readFileSync(page, "utf8")));

  it("finds the data pages", () => {
    expect(dataPages.length).toBeGreaterThan(20);
  });

  it("gives every data page _loading, _error and (for lists) _empty files", () => {
    const missing: string[] = [];
    for (const page of dataPages) {
      const dir = join(page, "..");
      const isDetail = /\[\w+\]$/u.test(dir);
      const required = ["_loading.tsx", "_error.tsx", ...(isDetail ? [] : ["_empty.tsx"])];
      const files = readdirSync(dir);
      for (const file of required) {
        if (!files.includes(file)) missing.push(`${relative(ROOT, dir)}/${file}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("builds page states from the _loading/_error/_empty files, not inline", () => {
    const inline = pages
      .map((page) => relative(ROOT, page))
      .filter((page) =>
        /components\/ui\/skeleton|components\/error-state|components\/empty-state/u.test(
          readFileSync(join(ROOT, page), "utf8"),
        ),
      );
    expect(inline).toEqual([]);
  });

  it("has no page-local KPI tiles (use components/kpi)", () => {
    expect(offenders(/function (?:Stat|StatCard|SummaryTile|MetricCard|KpiTile)\b/u)).toEqual([]);
  });
});

describe("page metadata conventions (components/brand/README.md)", () => {
  /** Pages that only redirect and never render, so there is nothing to title. */
  const REDIRECT_ONLY = new Set(["app/page.tsx"]);

  const pages = (() => {
    const found: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name === "page.tsx") found.push(path);
      }
    };
    walk(join(ROOT, "app"));
    return found.map((path) => relative(ROOT, path));
  })();

  const exportsMetadata = (path: string) =>
    /export (?:const metadata\b|(?:async )?function generateMetadata\b)/u.test(
      readFileSync(join(ROOT, path), "utf8"),
    );

  it("finds the pages", () => {
    expect(pages.length).toBeGreaterThan(30);
  });

  it("gives every page a title through pageMetadata (on the page, or its own layout.tsx for client pages)", () => {
    const missing = pages
      .filter((page) => !REDIRECT_ONLY.has(page))
      .filter((page) => {
        const layout = page.replace(/page\.tsx$/u, "layout.tsx");
        const owners = [page, ...(existsSync(join(ROOT, layout)) ? [layout] : [])];
        return !owners.some(exportsMetadata);
      });
    expect(missing).toEqual([]);
  });

  it("builds titles with pageMetadata, never hand-written openGraph or a '| Luraba' suffix", () => {
    const offenders = pages.filter((page) => {
      const source = readFileSync(join(ROOT, page), "utf8");
      return /\| Luraba|openGraph:/u.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it("keeps the title template and the shared brand assets in the root", () => {
    const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/rootMetadata\(\)/u);
    const meta = readFileSync(join(ROOT, "lib/metadata.ts"), "utf8");
    expect(meta).toMatch(/template: `%s \| \$\{BRAND\.name\}`/u);
  });
});

describe("chart conventions (components/charts/README.md)", () => {
  /** Charts drawn straight with Recharts before the library existed. Migrate them, never add to it. */
  const LEGACY_RECHARTS = new Set([
    "components/analytics/expense-breakdown-panel.tsx",
    "components/credit-cards/invoice-history-chart.tsx",
    "components/goals/goal-progress-chart.tsx",
    "components/investments/asset-price-chart.tsx",
    "components/investments/performance-chart.tsx",
    "components/kpi/kpi-card.tsx",
    "components/ui/chart.tsx",
  ]);

  it("draws new charts with components/charts, not with Recharts directly", () => {
    const direct = ["app", "components"]
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .map((path) => relative(ROOT, path))
      .filter((path) => !path.startsWith("components/charts/") && !LEGACY_RECHARTS.has(path))
      .filter((path) => /from "recharts"/u.test(readFileSync(join(ROOT, path), "utf8")));
    expect(direct).toEqual([]);
  });
});

describe("no tables on mobile (components/lists/README.md)", () => {
  /**
   * Dense comparison data that stays a table on a phone (it scrolls inside its own container, never
   * the page). Every entry is documented in components/lists/README.md; do not add to it for data
   * that reads as a list.
   */
  const TABLE_EXCEPTIONS = new Set([
    "app/(app)/investments/allocation/page.tsx",
    "app/(app)/investments/income/page.tsx",
    "app/(app)/investments/taxes/page.tsx",
    "components/data-table/data-table-skeleton.tsx",
    "components/data-table/data-table.tsx",
    "components/imports/import-columns-step.tsx",
    "components/imports/import-raw-table.tsx",
    "components/imports/import-rows-table.tsx",
    "components/imports/import-values-step.tsx",
    "components/investments/allocation-targets-editor.tsx",
    "components/investments/events-table.tsx",
    "components/investments/import-wizard.tsx",
    "components/investments/lots-table.tsx",
    "components/investments/positions-table.tsx",
    "components/investments/tax-tables.tsx",
  ]);

  /** An alerts x channels checkbox matrix: a grid by nature, three narrow columns that fit a phone. */
  const MATRIX_TABLE = "components/settings/notification-settings.tsx";

  it("draws a table only through DataTable (with a mobile list) or a documented exception", () => {
    const raw = offenders(/from "@\/components\/ui\/table"/u).filter(
      (path) => !TABLE_EXCEPTIONS.has(path),
    );
    expect(raw).toEqual([]);
    expect(
      offenders(/<table\b/u).filter(
        (path) => !path.startsWith("components/ui/") && path !== MATRIX_TABLE,
      ),
    ).toEqual([]);
  });

  it("gives every DataTable a mobile config (a row renderer, or 'table' with a reason)", () => {
    const missing = ["app", "components"]
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .map((path) => relative(ROOT, path))
      .filter((path) => !path.startsWith("components/data-table/"))
      .filter((path) => {
        const source = readFileSync(join(ROOT, path), "utf8");
        const usages = source.match(/<DataTable\b[\s\S]*?\/>/gu) ?? [];
        return usages.some((usage) => !/\bmobile=/u.test(usage));
      });
    expect(missing).toEqual([]);
  });
});

describe("filters (components/filters/README.md)", () => {
  it("draws filters only through FilterBar, never ReUI Filters directly", () => {
    const direct = offenders(/from "@\/components\/reui\/filters\//u).filter(
      (path) => !path.startsWith("components/filters/"),
    );
    expect(direct).toEqual([]);
  });

  it("keeps no page-local filter state or URL parsing for filters", () => {
    // The filter chips and the date filter live in components/filters; pages read `filters.values` / `date`.
    expect(
      offenders(/ApiParamFilterConfig|createApiFilterParser|FilterFaceted|PeriodFilter/u),
    ).toEqual([]);
  });

  it("gives every page that lists dated data the required date filter, not a second period control", () => {
    expect(offenders(/usePeriodFilter|<PeriodFilter\b/u)).toEqual([]);
  });
});

describe("overlays are bottom drawers on mobile (components/ui/README.md)", () => {
  /**
   * Feature files that still import the raw `Dialog` wrappers. `DialogContent` is itself a bottom drawer below
   * 768px, so they work on a phone; new features use `Modal` (forms, confirmations) or `SidePanel` (detail and edit
   * panels). The list can only shrink.
   */
  const RAW_DIALOG = new Set([
    "components/households/household-delete-dialog.tsx",
    "components/households/household-invitations-table.tsx",
    "components/households/remove-member-dialog.tsx",
    "components/households/roles/change-role-dialog.tsx",
    "components/imports/import-row-dialog.tsx",
    "components/uploads/image-cropper-dialog.tsx",
  ]);
  const featureOffenders = (pattern: RegExp) =>
    offenders(pattern).filter(
      (path) => !path.startsWith("components/ui/") && !path.startsWith("components/filters/"),
    );

  it("never builds an overlay straight on Radix or vaul; it goes through components/ui", () => {
    expect(
      featureOffenders(
        /from "vaul"|import \{[^}]*\b(?:Dialog|Popover|DropdownMenu|Select|AlertDialog)\b[^}]*\} from "radix-ui"/u,
      ),
    ).toEqual([]);
  });

  it("imports the raw Sheet nowhere outside the side-panel shell", () => {
    expect(
      featureOffenders(/from "@\/components\/ui\/sheet"/u).filter(
        (path) => path !== "components/side-panel/side-panel.tsx",
      ),
    ).toEqual([]);
  });

  it("keeps a side sheet on mobile only for the app sidebar", () => {
    expect(
      offenders(/keepSideOnMobile/u).filter(
        (path) => path !== "components/ui/sidebar.tsx" && path !== "components/ui/sheet.tsx",
      ),
    ).toEqual([]);
  });

  it("paints no backdrop by hand; overlays use the shared scrim", () => {
    expect(featureOffenders(/fixed inset-0[^"]*bg-black/u)).toEqual([]);
  });

  it("imports the raw Dialog only from the documented files", () => {
    const found = featureOffenders(/from "@\/components\/ui\/dialog"/u);
    expect(found.filter((path) => !RAW_DIALOG.has(path))).toEqual([]);
    expect([...RAW_DIALOG].filter((path) => !found.includes(path))).toEqual([]);
  });
});

describe("page header standard (components/finance/README.md)", () => {
  const pages = () =>
    sourceFiles(join(ROOT, "app/(app)"))
      .map((path) => relative(ROOT, path))
      .filter((path) => path.endsWith("page.tsx"));

  /** Pages whose header actions are not buttons yet (a period toggle, a menu). Only shrinks. */
  const HAND_BUILT_ACTIONS = new Set([
    "app/(app)/accounts/[id]/page.tsx",
    "app/(app)/bills/[id]/page.tsx",
    "app/(app)/transactions/page.tsx",
  ]);

  it("header actions are HeaderAddButton / HeaderButton, never a hand-built Button", () => {
    const bad = pages().filter((path) => {
      if (HAND_BUILT_ACTIONS.has(path)) return false;
      const source = readFileSync(join(ROOT, path), "utf8");
      const start = source.indexOf("actions={");
      if (start === -1) return false;
      const block = source.slice(start, start + 1500).split(/\n {4}>\n/u)[0] ?? "";
      return /<(Permission)?Button\b/u.test(block);
    });
    expect(bad).toEqual([]);
  });

  it("the old month pickers are gone", () => {
    expect(offenders(/MonthPresetButton|MonthPicker\b|MonthSelector\b|PageAddButton/u)).toEqual([]);
  });
});
