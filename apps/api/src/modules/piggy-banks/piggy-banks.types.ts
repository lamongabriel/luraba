import type {
  goalPiggyBanksTable,
  piggyBankAccrualsTable,
  piggyBankMovementsTable,
  piggyBanksTable,
} from "@luraba/db/schemas/piggy-banks.schema";

export type PiggyBankRecord = typeof piggyBanksTable.$inferSelect;
export type PiggyBankMovementRecord = typeof piggyBankMovementsTable.$inferSelect;
export type PiggyBankAccrualRecord = typeof piggyBankAccrualsTable.$inferSelect;
export type GoalPiggyBankRecord = typeof goalPiggyBanksTable.$inferSelect;

export type MovementKind = PiggyBankMovementRecord["kind"];
/** Movement kinds that are money the owner put in or took out (not interest or corrections). */
export const PRINCIPAL_KINDS = [
  "opening",
  "deposit",
  "withdrawal",
  "transfer_in",
  "transfer_out",
] as const;
/** Kinds that count as deposits for goal tracking (net of withdrawals). */
export const FLOW_KINDS = ["deposit", "withdrawal", "transfer_in", "transfer_out"] as const;
