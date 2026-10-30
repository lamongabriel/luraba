import { householdMembersTable } from "@luraba/db/schemas/households.schema";
import { investmentEventsTable } from "@luraba/db/schemas/investments.schema";
import { diffIsoDays } from "@luraba/domain";
import { eq } from "drizzle-orm";
import type { HouseholdContext } from "@/config/permissions";
import { db } from "@/db";
import { notify } from "@/modules/notifications/notifications.emitter";
import { logger } from "@/shared/logger";
import { taxes } from "./investments.reports.service";
import { computeHoldings, resolveScope, todayIso } from "./investments.valuation";

const MATURITY_WINDOW_DAYS = 7;
const DARF_WINDOW_DAYS = 7;

async function audience(householdId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: householdMembersTable.userId })
    .from(householdMembersTable)
    .where(eq(householdMembersTable.householdId, householdId));
  return rows.map((r) => r.userId);
}

/** Maturity and DARF reminders. Every message carries a dedupe key, so running it daily never repeats one. */
export async function sendInvestmentReminders(now = todayIso()): Promise<number> {
  const households = await db
    .selectDistinct({ householdId: investmentEventsTable.householdId })
    .from(investmentEventsTable);
  let sent = 0;
  for (const { householdId } of households) {
    try {
      const context = {
        householdId,
        userId: "",
        role: "owner",
        permissions: [],
      } as unknown as HouseholdContext;
      const userIds = await audience(householdId);
      if (userIds.length === 0) continue;

      const scope = await resolveScope(context);
      const holdings = await computeHoldings(scope);
      for (const row of holdings.rows) {
        const maturity = row.fixedIncome?.terms.maturityDate;
        if (!maturity) continue;
        const days = diffIsoDays(now, maturity);
        if (days < 0 || days > MATURITY_WINDOW_DAYS) continue;
        await notify({
          userIds,
          eventType: "investment.maturity_soon",
          title: `${row.asset.symbol} matures ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`,
          body: `${row.asset.name} matures on ${maturity}. Decide whether to reinvest or withdraw.`,
          url: `/investments/assets/${row.asset.id}`,
          householdId,
          dedupeKey: `investment.maturity:${row.asset.id}:${maturity}`,
        });
        sent += 1;
      }

      if (scope.accounts.some((a) => a.settings.taxProfile === "BR_INDIVIDUAL")) {
        const year = Number(now.slice(0, 4));
        for (const y of [year, year - 1]) {
          const report = await taxes(context, { year: y });
          for (const line of report.apuracao) {
            if (line.taxDue <= 0 || line.paid) continue;
            const days = diffIsoDays(now, line.dueDate);
            if (days > DARF_WINDOW_DAYS) continue;
            const stage = days < 0 ? "overdue" : "soon";
            await notify({
              userIds,
              eventType: "investment.darf_due",
              title:
                days < 0
                  ? `Investment tax overdue (${line.month})`
                  : `Investment tax due ${line.dueDate}`,
              body: `Estimated DARF ${line.darfCode} for ${line.month} (${line.bucket.replaceAll("_", " ").toLowerCase()}). Mark it as paid once settled. Estimates only: verify before paying.`,
              url: "/investments/taxes",
              householdId,
              dedupeKey: `investment.darf:${line.month}:${line.bucket}:${stage}`,
            });
            sent += 1;
          }
        }
      }
    } catch (err) {
      logger.error({ err, householdId }, "[investments] Reminder run failed for household");
    }
  }
  return sent;
}
