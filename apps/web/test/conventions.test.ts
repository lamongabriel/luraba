import { readdirSync, readFileSync, statSync } from "node:fs";
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
  return ["app", "components", "lib"]
    .flatMap((dir) => sourceFiles(join(ROOT, dir)))
    .map((path) => relative(ROOT, path))
    .filter((path) => !ALLOWED.has(path))
    .filter((path) => pattern.test(readFileSync(join(ROOT, path), "utf8")));
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
