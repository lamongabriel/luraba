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
});
