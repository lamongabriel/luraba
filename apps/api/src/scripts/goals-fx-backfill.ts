/**
 * Recomputes goal contributions made in another currency from their date's historical rate.
 *
 *   pnpm --filter @luraba/api goals:fx-backfill                 # dry run (default): prints what would change
 *   pnpm --filter @luraba/api goals:fx-backfill --apply         # writes the changes
 *   ... --include-manual   also recompute rates that were given by hand
 *   ... --json             machine-readable output
 *
 * Built image: `node dist/scripts/goals-fx-backfill.js [--apply]`. See modules/goals/README.md.
 */
import { pool } from "../db";
import { backfillContributionFxRates } from "../modules/goals/goals.fx-backfill.service";
import { logger } from "../shared/logger";

const args = new Set(process.argv.slice(2));

function money(minor: number): string {
  return (minor / 100).toFixed(2);
}

async function run() {
  try {
    const report = await backfillContributionFxRates({
      apply: args.has("--apply"),
      includeManual: args.has("--include-manual"),
    });
    if (args.has("--json")) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return;
    }
    process.stdout.write(
      `FX backfill (${report.mode}): ${report.scanned} cross-currency contributions, ${report.changed} change, ${report.amountChanged} change amount, ${report.skipped} left alone\n`,
    );
    for (const row of report.rows) {
      const flag = row.change === "none" ? "  =" : row.applied ? "  *" : "  ~";
      process.stdout.write(
        `${flag} ${row.date} "${row.goalName}" (goal ${row.goalId}, contribution ${row.contributionId}): ` +
          `${row.originalCurrency} ${money(row.originalAmount)} -> ${row.goalCurrency} ${money(row.oldAmount)} => ${money(row.newAmount)} ` +
          `@ ${row.oldRate ?? "none"} => ${row.newRate || "none"} (${row.rateSource || "no source"} ${row.rateDate})` +
          `${row.note ? ` [${row.note}]` : ""}\n`,
      );
    }
    if (report.mode === "dry-run" && report.changed > 0) {
      process.stdout.write("Dry run: nothing was written. Re-run with --apply to write.\n");
    }
  } catch (error) {
    logger.error({ err: error }, "Goal FX backfill failed");
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void run();
