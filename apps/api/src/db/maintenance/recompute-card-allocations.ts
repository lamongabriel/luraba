/**
 * One-off, idempotent backfill: recomputes every credit card's payment allocations from its payments
 * and statements (the same `syncCardCyclesWithChanges` every mutation uses) and reports each invoice
 * whose paid amount changes.
 *
 *   DRY RUN (default, writes nothing):  pnpm --filter @luraba/api db:recompute-allocations
 *   WRITE:                              pnpm --filter @luraba/api db:recompute-allocations --apply
 *   In the built image:                 node dist/db/maintenance/recompute-card-allocations.js [--apply]
 *   One card:                           --card <creditCardId>      JSON report: --json
 *
 * Re-running changes nothing the second time. It never touches payments, ledger entries or
 * purchases; only `credit_card_payment_allocations` and the derived paid/remaining/status columns of
 * `credit_card_billing_cycles`.
 */
import { creditCardsTable } from "@luraba/db/schemas/credit-cards.schema";
import { householdsTable } from "@luraba/db/schemas/households.schema";
import { eq } from "drizzle-orm";
import { env } from "../../config/env";
import { syncCardCyclesWithChanges } from "../../modules/credit-cards/credit-card-cycles.service";
import * as creditCardsRepository from "../../modules/credit-cards/credit-cards.repository";
import { db, pool } from "..";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const asJson = args.includes("--json");
const cardFlag = args.indexOf("--card");
const onlyCard = cardFlag >= 0 ? args[cardFlag + 1] : undefined;

const money = (minor: number) => (minor / 100).toFixed(2);

async function run() {
  const rows = await db
    .select({ card: creditCardsTable, timezone: householdsTable.timezone })
    .from(creditCardsTable)
    .innerJoin(householdsTable, eq(householdsTable.id, creditCardsTable.householdId));

  const report: Array<{
    creditCardId: string;
    name: string;
    creditBalance: number;
    changes: Awaited<ReturnType<typeof syncCardCyclesWithChanges>>["changes"];
  }> = [];

  for (const { card: bare, timezone } of rows) {
    if (onlyCard && bare.id !== onlyCard) continue;
    const card = await creditCardsRepository.findByIdOrThrow(bare.householdId, bare.id);
    const result = await db.transaction((tx) =>
      syncCardCyclesWithChanges(tx, card, timezone, { dryRun: !apply }),
    );
    report.push({
      creditCardId: card.id,
      name: card.name,
      creditBalance: result.creditBalance,
      changes: result.changes,
    });
  }

  if (asJson) {
    console.log(JSON.stringify({ database: env.dbName, applied: apply, report }, null, 2));
    return;
  }
  console.log(
    `${apply ? "APPLIED" : "DRY RUN (nothing written)"} on database "${env.dbName}" @ ${env.dbHost}`,
  );
  let changed = 0;
  for (const card of report) {
    if (card.changes.length === 0 && card.creditBalance === 0) continue;
    console.log(
      `\n${card.name} (${card.creditCardId}) credit balance ${money(card.creditBalance)}`,
    );
    for (const change of card.changes) {
      changed += 1;
      console.log(
        `  due ${change.dueDate} closing ${change.closingDate}: statement ${money(change.statementAmount)}, paid ${money(change.previousPaid)} -> ${money(change.paid)}`,
      );
    }
  }
  console.log(
    `\n${report.length} card(s) checked, ${changed} invoice(s) ${apply ? "changed" : "would change"}.`,
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
