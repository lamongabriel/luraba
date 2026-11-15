import { syncMacro } from "@/modules/investments/investments.refresh";
import { logger } from "@/shared/logger";
import {
  type AccrualDeps,
  type AccrualResult,
  accruePiggyBanks,
} from "./piggy-banks.accrual.service";

export type DailyAccrualDeps = {
  /** Pulls CDI, Selic and IPCA from the BCB into `macro_index_values` (missing tail backfilled). */
  syncMacro?: () => Promise<number>;
  accrue?: (deps: AccrualDeps) => Promise<AccrualResult>;
  accrual?: AccrualDeps;
};

/**
 * The scheduled job (`piggy-accrue` on the market-data queue): fetch the index series first, so a
 * day's CDI is stored before it is used, then credit every piggy bank up to yesterday. A failed
 * fetch never blocks the accrual: missing days use the projection and are flagged estimated.
 */
export async function runDailyAccrual(deps: DailyAccrualDeps = {}): Promise<AccrualResult> {
  try {
    await (deps.syncMacro ?? syncMacro)();
  } catch (error) {
    logger.warn({ error }, "[piggy-banks] Index sync failed; accruing with what is stored");
  }
  const result = await (deps.accrue ?? accruePiggyBanks)(deps.accrual ?? {});
  if (result.accrued > 0) logger.info(result, "[piggy-banks] Interest accrued");
  return result;
}
